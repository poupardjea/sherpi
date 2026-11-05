import { timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  BRAND,
  RESULT_COUNT,
  closesToday,
  filterCandidates,
  finalizePicks,
  isSellable,
  parisNow,
  pickupDay,
  pickupDays,
  rankCandidates,
  resolvePriceRange,
  verticalOf,
  widerBudget,
  type Product,
  type PublicReservation,
  type PublicShopConfig,
  type RecommendInput,
  type RecommendResponse,
  type Shop,
} from "@app/shared";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import type { ModelPicker } from "./claude.ts";
import { reservationIcs } from "./ics.ts";
import { landingPage, legalPage } from "./landing.ts";
import { cancelPage, demoSite, hostedPage, notFoundPage } from "./pages.ts";
import { rateLimit } from "./rate-limit.ts";
import type { Reservation, Store } from "./store.ts";

export type Notifier = (shop: Shop, reservation: Reservation) => Promise<void>;

export interface AppDeps {
  store: Store;
  /** Absent = pas de modèle, classement simple uniquement. */
  picker?: ModelPicker;
  notify: Notifier;
  /** Chemin du bundle du widget (apps/widget/dist/w.js). */
  widgetPath: string;
  /** URL publique (liens d'annulation, .ics). Par défaut : l'origine de la requête. */
  publicUrl?: string;
  /** Boutiques présentées sur la page d'accueil, dans l'ordre des onglets. */
  demoSlugs: string[];
  now?: () => Date;
}

const text = (max: number) => z.string().trim().max(max).optional();

const recommendSchema = z.object({
  recipient: text(60),
  occasion: text(60),
  budget: z.enum(["lt20", "20-40", "40-80", "80+"]).optional(),
  max_price: z.number().positive().max(10000).optional(),
  text: text(500),
  category: text(40),
  favorites_only: z.boolean().optional(),
  lighter: z.boolean().optional(),
});

const reservationSchema = z.object({
  product_id: z.string().min(1).max(64),
  first_name: z.string().trim().min(1).max(40),
  phone: z
    .string()
    .trim()
    .max(25)
    .refine((p) => /^\+?[\d\s.()-]+$/.test(p) && p.replace(/\D/g, "").length >= 10, "Numéro invalide"),
  pickup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gift_wrap: z.boolean().default(false),
});

function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function toRecommendation(p: Product) {
  const { id, name, origin, details, category, unit, price, stock, merchant_note } = p;
  return { id, name, origin, details, category, unit, price, stock, merchant_note };
}

export function createApp(deps: AppDeps) {
  const { store, picker, notify } = deps;
  const now = deps.now ?? (() => new Date());
  const app = new Hono();
  const base = (c: Context) => deps.publicUrl ?? new URL(c.req.url).origin;

  const publicReservation = (c: Context, shop: Shop, r: Reservation): PublicReservation => ({
    id: r.id,
    code: r.code,
    status: r.status,
    first_name: r.first_name ?? "",
    product: { name: r.product_name, price: r.product_price },
    gift_wrap: r.gift_wrap,
    pickup: pickupDay(shop.opening, r.pickup_date) ?? { date: r.pickup_date, label: r.pickup_date, until: "" },
    shop: { name: shop.name, address: shop.address, merchant_first_name: shop.merchant_first_name },
    cancel_url: `${base(c)}/annuler/${r.id}?token=${r.cancel_token}`,
    ics_url: `${base(c)}/reservations/${r.id}/agenda.ics?token=${r.cancel_token}`,
  });

  /** Réservation + boutique, si le jeton du lien est le bon. */
  const authorizedReservation = async (c: Context) => {
    const r = await store.getReservation(c.req.param("id") ?? "");
    const token = c.req.query("token") ?? "";
    if (!r || !sameToken(token, r.cancel_token)) return null;
    const shop = await store.getShop(r.shop_slug);
    return shop ? { r, shop } : null;
  };

  // Routes publiques appelées par le widget depuis le site du commerçant.
  app.use("/shops/*", cors());
  app.use("/reservations/*", cors());
  const TEN_MIN = 10 * 60 * 1000;
  app.use("/shops/:slug/recommend", rateLimit({ max: 40, windowMs: TEN_MIN }));
  app.use("/shops/:slug/reservations", rateLimit({ max: 10, windowMs: TEN_MIN }));

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/shops/:slug/config", async (c) => {
    const shop = await store.getShop(c.req.param("slug"));
    if (!shop) return c.json({ error: "Boutique inconnue" }, 404);
    const config: PublicShopConfig = {
      slug: shop.slug,
      name: shop.name,
      merchant_first_name: shop.merchant_first_name,
      address: shop.address,
      accent_primary: shop.accent_primary,
      accent_secondary: shop.accent_secondary,
      sells_alcohol: shop.sells_alcohol,
      product_name: BRAND.productName,
      copy: verticalOf(shop.vertical).copy,
      closes_today: closesToday(shop.opening, now()),
      pickup_days: pickupDays(shop.opening, 6, now()),
    };
    return c.json(config);
  });

  app.post("/shops/:slug/recommend", async (c) => {
    const shop = await store.getShop(c.req.param("slug"));
    if (!shop) return c.json({ error: "Boutique inconnue" }, 404);
    const parsed = recommendSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Demande invalide" }, 400);
    const input: RecommendInput = parsed.data;

    // Règles 2 et 3 : dispo et budget filtrés ici, avant le modèle.
    const candidates = filterCandidates(await store.listProducts(shop.slug), input);
    const ranked = rankCandidates(candidates, input, shop.vertical);

    let modelIds: string[] = [];
    let source: RecommendResponse["source"] = "fallback";
    // Avec 3 candidats ou moins, on les montre tous : inutile d'appeler le modèle.
    // Quota mensuel atteint : classement simple, le client ne voit pas de différence d'interface.
    if (
      picker &&
      candidates.length > RESULT_COUNT &&
      (await store.consumeAiCall(shop.slug, parisNow(now()).date.slice(0, 7), shop.ai_monthly_quota))
    ) {
      try {
        modelIds = await picker(shop, candidates, input);
        source = "model";
      } catch (err) {
        console.warn("[recommend] repli sur le classement simple :", (err as Error).message);
      }
    }
    // Règle 1 : ids validés, les inconnus remplacés par le candidat suivant.
    const picks = finalizePicks(modelIds, ranked);

    let widen: RecommendResponse["widen"] = null;
    const range = resolvePriceRange(input);
    if (picks.length < RESULT_COUNT && range) {
      if (input.budget) {
        const next = widerBudget(input.budget);
        widen = next ? { budget: next } : null;
      } else if (Number.isFinite(range.max)) {
        widen = { max_price: Math.ceil((range.max * 1.5) / 5) * 5 };
      }
    }

    await store.logSearch({ shop_slug: shop.slug, input, result_count: picks.length, source });
    const body: RecommendResponse = { products: picks.map(toRecommendation), widen, source };
    return c.json(body);
  });

  app.post("/shops/:slug/reservations", async (c) => {
    const shop = await store.getShop(c.req.param("slug"));
    if (!shop) return c.json({ error: "Boutique inconnue" }, 404);
    const parsed = reservationSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      return c.json({ error: "Formulaire incomplet", field }, 400);
    }
    const input = parsed.data;
    const product = (await store.listProducts(shop.slug)).find((p) => p.id === input.product_id);
    if (!product || !isSellable(product)) {
      return c.json({ error: "Ce produit n'est plus disponible." }, 409);
    }
    if (!pickupDays(shop.opening, 6, now()).some((d) => d.date === input.pickup_date)) {
      return c.json({ error: "Ce jour de retrait n'est pas possible.", field: "pickup_date" }, 400);
    }
    const r = await store.createReservation({
      shop_slug: shop.slug,
      product_id: product.id,
      product_name: product.name,
      product_price: product.price,
      first_name: input.first_name,
      phone: input.phone,
      pickup_date: input.pickup_date,
      gift_wrap: input.gift_wrap,
    });
    // La réservation est confirmée même si l'e-mail échoue : on journalise.
    await notify(shop, r).catch((err) => console.error("[notify]", err));
    return c.json(publicReservation(c, shop, r), 201);
  });

  app.delete("/reservations/:id", async (c) => {
    const found = await authorizedReservation(c);
    if (!found) return c.json({ error: "Lien invalide" }, 404);
    await store.setReservationStatus(found.r.id, "cancelled");
    return c.json({ status: "cancelled" });
  });

  app.get("/reservations/:id/agenda.ics", async (c) => {
    const found = await authorizedReservation(c);
    if (!found) return c.text("Lien invalide", 404);
    const until = pickupDay(found.shop.opening, found.r.pickup_date)?.until ?? "";
    return c.body(reservationIcs(found.r, found.shop, until), 200, {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="retrait-${found.r.code}.ics"`,
    });
  });

  // Lien « Modifier ou annuler » : page HTML + formulaire POST (sans JavaScript).
  app.get("/annuler/:id", async (c) => {
    const found = await authorizedReservation(c);
    if (!found) return c.html(notFoundPage(), 404);
    return c.html(cancelPage(found.shop, found.r, c.req.url));
  });

  app.post("/annuler/:id", async (c) => {
    const found = await authorizedReservation(c);
    if (!found) return c.html(notFoundPage(), 404);
    if (found.r.status === "confirmed" || found.r.status === "ready") {
      await store.setReservationStatus(found.r.id, "cancelled");
    }
    return c.html(cancelPage(found.shop, found.r, c.req.url, true));
  });

  app.get("/w.js", async (c) => {
    const js = await readFile(deps.widgetPath, "utf8").catch(() => null);
    if (js == null) return c.text("// widget non construit : npm run build", 503);
    return c.body(js, 200, {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": process.env.NODE_ENV === "production" ? "public, max-age=300" : "no-cache",
    });
  });

  // Page d'accueil : présentation et une démo par métier.
  app.get("/", async (c) => {
    const shops = await Promise.all(deps.demoSlugs.map((slug) => store.getShop(slug)));
    return c.html(landingPage(shops.filter((s) => s !== null)));
  });

  app.get("/mentions-legales", (c) => c.html(legalPage()));

  app.get("/demo/:slug", async (c) => {
    const shop = await store.getShop(c.req.param("slug"));
    return shop ? c.html(demoSite(shop)) : c.html(notFoundPage(), 404);
  });

  // Page hébergée (QR code). Déclarée en dernier : elle capture tout /<slug>.
  app.get("/:slug", async (c) => {
    const shop = await store.getShop(c.req.param("slug"));
    return shop ? c.html(hostedPage(shop)) : c.html(notFoundPage(), 404);
  });

  return app;
}

/** Tâche quotidienne RGPD (spec, règle 6). */
export async function purgeNow(store: Store, now = new Date()) {
  const n = await store.purgePersonalData(parisNow(now).date);
  if (n) console.log(`[rgpd] coordonnées effacées sur ${n} réservation(s)`);
}
