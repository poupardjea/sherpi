import type { Product, Shop, VerticalId } from "@app/shared";
import caviste from "../../../data/demos/cave-de-marthe.json" with { type: "json" };
import epicerie from "../../../data/demos/epicerie-de-lucien.json" with { type: "json" };
import librairie from "../../../data/demos/les-mots-passants.json" with { type: "json" };
import type { PgStore } from "./pg-store.ts";
import { MemoryStore } from "./store.ts";

// Les démos de la page d'accueil, une par métier. Plafond d'IA modeste : elles sont publiques.
const DEMO_AI_QUOTA = 3000;

export interface Demo {
  shop: Shop;
  products: Product[];
}

function demo(data: { shop: Omit<Shop, "ai_monthly_quota" | "vertical"> & { vertical: string }; products: Product[] }): Demo {
  return {
    shop: { ...data.shop, vertical: data.shop.vertical as VerticalId, ai_monthly_quota: DEMO_AI_QUOTA },
    products: data.products,
  };
}

export const DEMOS: Demo[] = [demo(caviste), demo(epicerie), demo(librairie)];

export const demoShop = DEMOS[0]!.shop;
export const demoProducts = DEMOS[0]!.products;

/** `overrides` s'applique à toutes les boutiques de démo (tests). */
export function createDemoStore(overrides: Partial<Shop> = {}): MemoryStore {
  return new MemoryStore(
    DEMOS.map((d) => ({ ...d.shop, ...overrides })),
    new Map(DEMOS.map((d) => [d.shop.slug, d.products])),
  );
}

/** Idempotent : remet les boutiques de démo et leurs produits dans l'état des catalogues. */
export async function seedDemo(store: PgStore, overrides: Partial<Shop> = {}) {
  for (const d of DEMOS) {
    await store.upsertShop({ ...d.shop, ...overrides });
    await store.upsertProducts(d.shop.slug, d.products);
  }
}
