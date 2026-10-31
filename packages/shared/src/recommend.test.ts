import { describe, expect, it } from "vitest";
import catalogue from "../../../data/catalogue-demo.json" with { type: "json" };
import { priceRangeFromText } from "./budget.ts";
import { filterCandidates, finalizePicks, rankCandidates, resolvePriceRange } from "./recommend.ts";
import type { Product } from "./types.ts";

const products = catalogue.products as Product[];

function recommend(input: Parameters<typeof filterCandidates>[1], modelIds: string[] = []) {
  const ranked = rankCandidates(filterCandidates(products, input), input);
  return finalizePicks(modelIds, ranked);
}

describe("filtrage serveur", () => {
  it("budget « − 20 € » : les 3 produits coûtent moins de 20 €", () => {
    const picks = recommend({ budget: "lt20" });
    expect(picks).toHaveLength(3);
    for (const p of picks) expect(p.price).toBeLessThan(20);
  });

  it("un produit non dispo n'apparaît jamais, même s'il correspond parfaitement", () => {
    // Clos des Aubes (p03) : puissant, velouté, Roussillon, 38 € — mais décoché « Dispo ».
    const input = { budget: "20-40" as const, text: "rouge puissant velouté de garde du Roussillon" };
    expect(filterCandidates(products, input).map((p) => p.id)).not.toContain("p03");
    expect(recommend(input, ["p03"]).map((p) => p.id)).not.toContain("p03");
  });

  it("un stock à zéro exclut aussi le produit", () => {
    const zero = products.map((p) => (p.id === "p05" ? { ...p, stock: 0 } : p));
    expect(filterCandidates(zero, { budget: "lt20" }).map((p) => p.id)).not.toContain("p05");
  });

  it("filtre strict par catégorie (« En coffret »)", () => {
    const picks = recommend({ category: "coffret" });
    expect(picks.length).toBeGreaterThan(0);
    for (const p of picks) expect(p.color).toBe("coffret");
  });
});

describe("validation des ids renvoyés par le modèle", () => {
  it("un id inexistant est rejeté et 3 produits valides sont tout de même rendus", () => {
    const input = { budget: "20-40" as const };
    const allowed = new Set(filterCandidates(products, input).map((p) => p.id));
    const picks = recommend(input, ["p01", "p999", "Les Grès Rouges"]);
    expect(picks).toHaveLength(3);
    expect(picks[0]?.id).toBe("p01");
    for (const p of picks) expect(allowed.has(p.id)).toBe(true);
  });

  it("un id existant mais hors critères (budget) est rejeté", () => {
    const picks = recommend({ budget: "lt20" }, ["p08"]); // Pomerol à 62 €
    expect(picks.map((p) => p.id)).not.toContain("p08");
  });

  it("pas de doublon si le modèle répète un id", () => {
    const picks = recommend({ budget: "20-40" }, ["p01", "p01", "p01"]);
    expect(new Set(picks.map((p) => p.id)).size).toBe(3);
  });
});

describe("moins de 3 produits compatibles", () => {
  it("rend ceux qui existent, sans compléter hors critères", () => {
    // Spiritueux de plus de 80 € : aucun. Coffrets 40–80 € : deux (p28 à 45 €, p29 à 64 €).
    expect(recommend({ category: "spiritueux", budget: "80+" })).toHaveLength(0);
    const coffrets = recommend({ category: "coffret", budget: "40-80" });
    expect(coffrets.map((p) => p.id).sort()).toEqual(["p28", "p29"]);
  });
});

describe("classement de repli", () => {
  it("« rouges puissants, plutôt Sud » met en tête des rouges puissants du Sud", () => {
    const picks = recommend({ budget: "20-40", text: "Il aime les rouges puissants, plutôt Sud" });
    expect(picks.map((p) => p.id).slice(0, 2)).toEqual(["p01", "p02"]);
  });

  it("« Plus léger » fait passer les vins légers devant", () => {
    const input = { budget: "lt20" as const, text: "un rouge" };
    const heavyRank = (lighter: boolean) =>
      rankCandidates(filterCandidates(products, input), { ...input, lighter }).findIndex((p) => p.id === "p04");
    // Terre de Schiste (p04, puissant) recule quand on demande plus léger.
    expect(heavyRank(true)).toBeGreaterThan(heavyRank(false));
    for (const p of recommend({ ...input, lighter: true })) expect(p.style).not.toContain("puissant");
  });
});

describe("budget en texte libre", () => {
  it.each([
    ["Pour mon beau-père, il aime les rouges puissants, 30 € max", { max: 30 }],
    ["moins de 25 euros", { max: 25 }],
    ["vins secs au dessus de 12€", { min: 12 }],
    ["à partir de 15 €, pas plus de 30 €", { min: 15, max: 30 }],
    ["entre 20 et 35 €", { min: 20, max: 35 }],
    ["budget 40", { max: 40 }],
    ["un whisky de plus de 10 ans", null],
    ["un blanc sec", null],
  ])("%s → %o", (text, expected) => {
    const range = priceRangeFromText(text);
    if (expected === null) expect(range).toBeNull();
    else expect(range).toEqual({ min: undefined, max: undefined, ...expected });
  });

  it("« au dessus de 12 € » : aucun produit à moins de 12 €", () => {
    const picks = recommend({ recipient: "Un collègue", occasion: "Anniversaire", text: "vins secs au dessus de 12€" });
    expect(picks).toHaveLength(3);
    for (const p of picks) expect(p.price).toBeGreaterThanOrEqual(12);
  });

  it("la puce de budget prime, le texte la précise si c'est compatible", () => {
    expect(resolvePriceRange({ budget: "20-40", text: "moins de 30 €" })).toEqual({ min: 20, max: 30 });
    expect(resolvePriceRange({ budget: "40-80", text: "moins de 30 €" })).toEqual({ min: 40.01, max: 80 });
    // « Élargir » envoie un plafond explicite qui remplace celui du texte.
    expect(resolvePriceRange({ max_price: 45, text: "30 € max" })).toEqual({ min: 0, max: 45 });
  });
});
