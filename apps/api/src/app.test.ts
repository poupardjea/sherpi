import { afterAll, describe, expect, it, vi } from "vitest";
import type { PublicReservation, PublicShopConfig, RecommendResponse, Shop } from "@app/shared";
import { createApp, type AppDeps } from "./app.ts";
import type { ModelPicker } from "./claude.ts";
import { migrate, type Db } from "./db.ts";
import { PgStore } from "./pg-store.ts";
import { DEMOS, createDemoStore, seedDemo } from "./seed.ts";
import type { Store } from "./store.ts";
import { createPgliteDb } from "./testing/pglite.ts";

// Samedi 19 décembre 2026, 15 h à Paris.
const NOW = new Date("2026-12-19T14:00:00Z");

const openDbs: Db[] = [];
afterAll(async () => {
  await Promise.all(openDbs.map((db) => db.close()));
});

const STORES: [string, (shop?: Partial<Shop>) => Promise<Store>][] = [
  ["mémoire", async (shop) => createDemoStore(shop)],
  [
    "postgres",
    async (shop) => {
      const db = await createPgliteDb();
      openDbs.push(db);
      await migrate(db);
      const store = new PgStore(db);
      await seedDemo(store, shop);
      return store;
    },
  ],
];

const SHOP = "/shops/cave-de-marthe";
const DEMO_SLUGS = DEMOS.map((d) => d.shop.slug);

describe.each(STORES)("store %s", (_name, makeStore) => {
  async function setup(overrides: Partial<AppDeps> = {}, shop?: Partial<Shop>) {
    const store = await makeStore(shop);
    const notify = vi.fn(async () => {});
    const app = createApp({ store, notify, widgetPath: "missing.js", demoSlugs: DEMO_SLUGS, now: () => NOW, ...overrides });
    const post = (path: string, body: unknown) =>
      app.request(path, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    return { app, store, notify, post };
  }

  describe("POST /recommend", () => {
    it("respecte le budget « − 20 € »", async () => {
      const { post } = await setup();
      const res = await post(`${SHOP}/recommend`, { budget: "lt20", recipient: "Un ami", occasion: "Noël" });
      const body = (await res.json()) as RecommendResponse;
      expect(body.products).toHaveLength(3);
      for (const p of body.products) expect(p.price).toBeLessThan(20);
    });

    it("rejette un id inventé par le modèle et affiche quand même 3 produits valides", async () => {
      const picker: ModelPicker = async () => ["p999", "p01", "p03"]; // inexistant, valide, non dispo
      const { post } = await setup({ picker });
      const body = (await (await post(`${SHOP}/recommend`, { budget: "20-40" })).json()) as RecommendResponse;
      expect(body.source).toBe("model");
      expect(body.products).toHaveLength(3);
      expect(body.products[0]?.id).toBe("p01");
      expect(body.products.map((p) => p.id)).not.toContain("p03");
      expect(body.products.map((p) => p.id)).not.toContain("p999");
    });

    it("bascule sur le classement simple si le modèle échoue", async () => {
      const picker: ModelPicker = async () => {
        throw new Error("timeout");
      };
      const { post } = await setup({ picker });
      const body = (await (await post(`${SHOP}/recommend`, { budget: "20-40" })).json()) as RecommendResponse;
      expect(body.source).toBe("fallback");
      expect(body.products).toHaveLength(3);
    });

    it("moins de 3 produits : propose d'élargir le budget sans compléter hors critères", async () => {
      const { post } = await setup();
      const body = (await (
        await post(`${SHOP}/recommend`, { category: "coffret", budget: "40-80" })
      ).json()) as RecommendResponse;
      expect(body.products).toHaveLength(2);
      expect(body.widen).toEqual({ budget: "80+" });
    });

    it("plafond lu dans le texte libre de la page hébergée", async () => {
      const { post } = await setup();
      const body = (await (
        await post(`${SHOP}/recommend`, { text: "Pour mon beau-père, il aime les rouges puissants, 30 € max" })
      ).json()) as RecommendResponse;
      for (const p of body.products) expect(p.price).toBeLessThanOrEqual(30);
    });

    it("n'envoie au modèle que des candidats filtrés", async () => {
      const picker = vi.fn<ModelPicker>(async () => []);
      const { post } = await setup({ picker });
      await post(`${SHOP}/recommend`, { budget: "lt20" });
      const candidates = picker.mock.calls[0]?.[1] ?? [];
      expect(candidates.length).toBeGreaterThan(3);
      for (const p of candidates) {
        expect(p.price).toBeLessThan(20);
        expect(p.available && p.stock > 0).toBe(true);
      }
    });
  });

  describe("quota mensuel d'IA", () => {
    it("au-delà du quota, bascule sur le classement simple sans erreur", async () => {
      const picker = vi.fn<ModelPicker>(async () => ["p01"]);
      const { post, store } = await setup({ picker }, { ai_monthly_quota: 2 });
      const sources = [];
      for (let i = 0; i < 3; i++) {
        const res = await post(`${SHOP}/recommend`, { budget: "20-40" });
        expect(res.status).toBe(200);
        const body = (await res.json()) as RecommendResponse;
        expect(body.products).toHaveLength(3);
        sources.push(body.source);
      }
      expect(sources).toEqual(["model", "model", "fallback"]);
      expect(picker).toHaveBeenCalledTimes(2);
      expect(await store.getAiUsage("cave-de-marthe", "2026-12")).toBe(2);
    });

    it("le compteur repart à zéro le mois suivant", async () => {
      const { store } = await setup({}, { ai_monthly_quota: 1 });
      expect(await store.consumeAiCall("cave-de-marthe", "2026-12", 1)).toBe(true);
      expect(await store.consumeAiCall("cave-de-marthe", "2026-12", 1)).toBe(false);
      expect(await store.consumeAiCall("cave-de-marthe", "2027-01", 1)).toBe(true);
      expect(await store.getAiUsage("cave-de-marthe", "2026-12")).toBe(1);
    });

    it("quota à 0 : le modèle n'est jamais appelé", async () => {
      const picker = vi.fn<ModelPicker>(async () => []);
      const { post } = await setup({ picker }, { ai_monthly_quota: 0 });
      const body = (await (await post(`${SHOP}/recommend`, { budget: "20-40" })).json()) as RecommendResponse;
      expect(body.source).toBe("fallback");
      expect(picker).not.toHaveBeenCalled();
    });

    it("une demande qui ne nécessite pas le modèle ne consomme pas de quota", async () => {
      const picker = vi.fn<ModelPicker>(async () => []);
      const { post, store } = await setup({ picker });
      await post(`${SHOP}/recommend`, { category: "coffret", budget: "40-80" }); // 2 candidats seulement
      expect(picker).not.toHaveBeenCalled();
      expect(await store.getAiUsage("cave-de-marthe", "2026-12")).toBe(0);
    });
  });

  describe("démos par métier", () => {
    it.each(DEMO_SLUGS)("%s : config du métier, 3 suggestions et chaque raccourci de la page QR trouve un produit", async (slug) => {
      const { app, post } = await setup();
      const config = (await (await app.request(`/shops/${slug}/config`)).json()) as PublicShopConfig;
      expect(config.copy.recipients.length).toBeGreaterThan(0);
      const body = (await (await post(`/shops/${slug}/recommend`, { text: config.copy.example })).json()) as RecommendResponse;
      expect(body.products).toHaveLength(3);
      for (const idea of config.copy.ideas) {
        const r = (await (await post(`/shops/${slug}/recommend`, idea.query)).json()) as RecommendResponse;
        expect(r.products.length, idea.label).toBeGreaterThan(0);
      }
      const chip = config.copy.category_chip;
      if (chip) {
        const r = (await (await post(`/shops/${slug}/recommend`, { category: chip.category })).json()) as RecommendResponse;
        expect(r.products.length, chip.label).toBeGreaterThan(0);
      }
    });

    it("page d'accueil : un onglet et une démo par métier", async () => {
      const { app } = await setup();
      const html = await (await app.request("/")).text();
      for (const slug of DEMO_SLUGS) expect(html).toContain(`shop="${slug}"`);
      expect(html).toContain("Épicerie fine");
      expect((await app.request("/mentions-legales")).status).toBe(200);
      expect((await app.request("/demo/les-mots-passants")).status).toBe(200);
    });
  });

  describe("mise de côté", () => {
    async function reserve(ctx: Awaited<ReturnType<typeof setup>>, extra: object = {}) {
      const config = (await (await ctx.app.request(`${SHOP}/config`)).json()) as PublicShopConfig;
      return ctx.post(`${SHOP}/reservations`, {
        product_id: "p01",
        first_name: "Paul",
        phone: "06 12 34 56 78",
        pickup_date: config.pickup_days[1]?.date,
        gift_wrap: true,
        ...extra,
      });
    }

    it("donne un n° de retrait unique et prévient le commerçant", async () => {
      const ctx = await setup();
      const a = (await (await reserve(ctx)).json()) as PublicReservation;
      const b = (await (await reserve(ctx)).json()) as PublicReservation;
      expect(a.code).toBe("M-0001");
      expect(b.code).toBe("M-0002");
      expect(a).toMatchObject({ first_name: "Paul", gift_wrap: true, product: { name: "Les Grès Rouges 2021", price: 24 } });
      expect(a.pickup).toMatchObject({ date: "2026-12-20", label: "Dim. 20 déc.", until: "avant 12 h" });
      expect(ctx.notify).toHaveBeenCalledTimes(2);
    });

    it("le lien d'annulation passe la réservation à « annulée »", async () => {
      const ctx = await setup();
      const r = (await (await reserve(ctx)).json()) as PublicReservation;
      const cancelPath = new URL(r.cancel_url).pathname + new URL(r.cancel_url).search;
      expect((await ctx.app.request(cancelPath)).status).toBe(200);
      expect((await ctx.app.request(cancelPath, { method: "POST" })).status).toBe(200);
      expect((await ctx.store.getReservation(r.id))?.status).toBe("cancelled");
    });

    it("refuse un mauvais jeton ou un id quelconque", async () => {
      const ctx = await setup();
      const r = (await (await reserve(ctx)).json()) as PublicReservation;
      const res = await ctx.app.request(`/reservations/${r.id}?token=faux`, { method: "DELETE" });
      expect(res.status).toBe(404);
      expect((await ctx.app.request(`/annuler/pas-un-uuid?token=x`)).status).toBe(404);
      expect((await ctx.store.getReservation(r.id))?.status).toBe("confirmed");
    });

    it("refuse un produit non dispo et un jour fermé", async () => {
      const ctx = await setup();
      expect((await reserve(ctx, { product_id: "p03" })).status).toBe(409);
      expect((await reserve(ctx, { pickup_date: "2026-12-21" })).status).toBe(400); // lundi
      expect((await reserve(ctx, { phone: "12" })).status).toBe(400);
    });

    it("fournit un .ics", async () => {
      const ctx = await setup();
      const r = (await (await reserve(ctx)).json()) as PublicReservation;
      const ics = await (await ctx.app.request(new URL(r.ics_url).pathname + new URL(r.ics_url).search)).text();
      expect(ics).toContain("DTSTART;VALUE=DATE:20261220");
      expect(ics).toContain("Retrait M-0001");
    });

    it("efface prénom et téléphone 30 jours après le retrait", async () => {
      const ctx = await setup();
      const r = (await (await reserve(ctx)).json()) as PublicReservation;
      expect(await ctx.store.purgePersonalData("2027-01-19")).toBe(0);
      expect(await ctx.store.purgePersonalData("2027-01-20")).toBe(1);
      expect(await ctx.store.getReservation(r.id)).toMatchObject({ first_name: null, phone: null });
    });
  });
});

describe("migrations et seed", () => {
  it("sont rejouables sans effet de bord", async () => {
    const db = await createPgliteDb();
    openDbs.push(db);
    expect(await migrate(db)).toEqual(["001_init.sql", "002_ai_quota.sql", "003_verticals.sql"]);
    expect(await migrate(db)).toEqual([]);
    const store = new PgStore(db);
    await seedDemo(store);
    await seedDemo(store);
    const products = await store.listProducts("cave-de-marthe");
    expect(products).toHaveLength(30);
    expect(products[0]).toMatchObject({ id: "p01", price: 24, details: ["syrah", "grenache"], unit: "bouteille", available: true });
    expect((await store.getShop("les-mots-passants"))?.vertical).toBe("librairie");
    expect(await store.listProducts("epicerie-de-lucien")).toHaveLength(30);
    expect((await store.getShop("cave-de-marthe"))?.opening[2]).toEqual({ open: "10:00", close: "20:00" });
  });
});
