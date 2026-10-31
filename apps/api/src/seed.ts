import type { Product, Shop } from "@app/shared";
import catalogue from "../../../data/catalogue-demo.json" with { type: "json" };
import type { PgStore } from "./pg-store.ts";
import { MemoryStore } from "./store.ts";

// Champs absents du catalogue de démo (structurés pour les calculs de retrait).
export const demoShop: Shop = {
  ...catalogue.shop,
  // Mar.–sam. 10 h–20 h, dim. 10 h–13 h.
  opening: {
    0: { open: "10:00", close: "13:00" },
    2: { open: "10:00", close: "20:00" },
    3: { open: "10:00", close: "20:00" },
    4: { open: "10:00", close: "20:00" },
    5: { open: "10:00", close: "20:00" },
    6: { open: "10:00", close: "20:00" },
  },
  pickup_prefix: "M",
  merchant_email: "marthe@example.com",
  sells_alcohol: true,
  ai_monthly_quota: 5000,
};

export const demoProducts = catalogue.products as Product[];

export function createDemoStore(overrides: Partial<Shop> = {}): MemoryStore {
  return new MemoryStore([{ ...demoShop, ...overrides }], new Map([[demoShop.slug, demoProducts]]));
}

/** Idempotent : remet la cave de démo et ses 30 vins dans l'état du catalogue. */
export async function seedDemo(store: PgStore, overrides: Partial<Shop> = {}) {
  await store.upsertShop({ ...demoShop, ...overrides });
  await store.upsertProducts(demoShop.slug, demoProducts);
}
