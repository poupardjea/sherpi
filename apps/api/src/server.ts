import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createApp, purgeNow, type Notifier } from "./app.ts";
import { createClaudePicker, hasAnthropicCredentials } from "./claude.ts";
import { createPgDb, migrate } from "./db.ts";
import { PgStore } from "./pg-store.ts";
import { DEMOS, createDemoStore, seedDemo } from "./seed.ts";
import type { Store } from "./store.ts";

// DATABASE_URL absent : données en mémoire (dev), perdues au redémarrage.
async function createStore(): Promise<Store> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[db] pas de DATABASE_URL : données en mémoire");
    return createDemoStore();
  }
  const db = createPgDb(url);
  const applied = await migrate(db);
  if (applied.length) console.log(`[db] migrations appliquées : ${applied.join(", ")}`);
  const store = new PgStore(db);
  // Démo publique : les boutiques de démo sont remises dans l'état des catalogues à chaque démarrage.
  if (process.env.SEED_DEMO === "1") await seedDemo(store);
  return store;
}

const store = await createStore();

// E-mail au commerçant : tâche 12 de la spec. En attendant, on journalise.
const notify: Notifier = async (shop, r) => {
  console.log(
    `[e-mail → ${shop.merchant_email}] Nouvelle mise de côté ${r.code} : ${r.product_name}, ` +
      `${r.first_name}, retrait le ${r.pickup_date}${r.gift_wrap ? ", emballage cadeau" : ""}`,
  );
};

const picker = hasAnthropicCredentials() ? createClaudePicker() : undefined;
if (!picker) console.log("[recommend] pas de ANTHROPIC_API_KEY : classement simple uniquement");

const app = createApp({
  store,
  picker,
  notify,
  widgetPath: fileURLToPath(new URL("../../widget/dist/w.js", import.meta.url)),
  publicUrl: process.env.PUBLIC_URL,
  demoSlugs: DEMOS.map((d) => d.shop.slug),
});

const DAY_MS = 24 * 60 * 60 * 1000;
setInterval(() => void purgeNow(store), DAY_MS).unref();
void purgeNow(store);

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => {
  console.log(`API prête : http://localhost:${port}  (accueil et démos : /, page QR : /cave-de-marthe)`);
});
