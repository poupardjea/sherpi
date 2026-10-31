import { budgetRange, priceRangeFromText, type PriceRange } from "./budget.ts";
import type { Product, RecommendInput } from "./types.ts";

export const RESULT_COUNT = 3;

/** Le stock fait foi : décoché « Dispo » ou stock à zéro = jamais proposé. */
export function isSellable(p: Product): boolean {
  return p.available && p.stock > 0;
}

/**
 * Fourchette de prix appliquée en filtre strict. Les choix explicites (puce de budget,
 * plafond `max_price` envoyé pour « élargir ») priment ; le texte libre les précise
 * quand c'est compatible, et sinon il est ignoré pour le prix.
 */
export function resolvePriceRange(input: RecommendInput): PriceRange | null {
  const fromText = input.text ? priceRangeFromText(input.text) : null;
  if (input.budget) {
    const b = budgetRange(input.budget);
    const min = Math.max(b.min, fromText?.min ?? 0);
    const max = Math.min(b.max, fromText?.max ?? Infinity);
    return min <= max ? { min, max } : b;
  }
  const max = input.max_price ?? fromText?.max ?? Infinity;
  const min = fromText?.min ?? 0;
  if (min === 0 && max === Infinity) return null;
  return min <= max ? { min, max } : { min: 0, max };
}

/**
 * Filtres stricts, appliqués côté serveur AVANT tout appel au modèle :
 * disponibilité, budget, catégorie, coups de cœur.
 */
export function filterCandidates(products: Product[], input: RecommendInput): Product[] {
  const range = resolvePriceRange(input);
  return products.filter(
    (p) =>
      isSellable(p) &&
      (!range || (p.price >= range.min && p.price <= range.max)) &&
      (!input.category || p.color === input.category) &&
      (!input.favorites_only || p.favorite),
  );
}

export function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2)
    .map((w) => (w.length > 4 && /[sx]$/.test(w) ? w.slice(0, -1) : w));
}

// Mots du client qui ne figurent pas tels quels dans la fiche produit.
// Les valeurs passent par normalize() : écrire des mots simples, sans tiret.
const SYNONYMS: Record<string, string[]> = {
  bulle: ["effervescent"],
  petillant: ["effervescent"],
  champagne: ["effervescent"],
  fete: ["festif", "effervescent"],
  sud: ["languedoc", "roussillon", "rhone", "provence", "sudouest"],
  loire: ["anjou", "loire"],
  coffret: ["coffret"],
  doux: ["moelleux", "doux"],
  leger: ["leger", "frais"],
};

const REGIONS: [RegExp, string[]][] = [
  [/pic saint-loup|faugeres/i, ["languedoc"]],
  [/roussillon/i, ["roussillon"]],
  [/chateauneuf|saint-joseph/i, ["rhone"]],
  [/cahors/i, ["sudouest"]],
  [/provence/i, ["provence"]],
  [/saumur|savennieres|layon|anjou|muscadet|loire/i, ["anjou", "loire"]],
  [/chablis|meursault|bourgogne/i, ["bourgogne"]],
];

function productKeywords(p: Product): Set<string> {
  const appellation = p.appellation.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const words = normalize([p.color, ...p.grapes, ...p.style, ...p.pairings, p.appellation].join(" "));
  for (const [re, tags] of REGIONS) if (re.test(appellation)) words.push(...tags);
  return new Set(words);
}

const LIGHT = new Set(normalize("léger frais souple fruité"));
const HEAVY = new Set(normalize("puissant tannique"));

/**
 * Classement simple, sans modèle : correspondance de mots-clés, coups de cœur,
 * occasion. Sert de repli si l'appel au modèle échoue, et à compléter une réponse
 * du modèle qui contiendrait des ids invalides.
 */
export function rankCandidates(candidates: Product[], input: RecommendInput): Product[] {
  const wanted = normalize([input.text, input.recipient].filter(Boolean).join(" ")).flatMap((w) => [
    w,
    ...(SYNONYMS[w] ?? []).flatMap(normalize),
  ]);
  const occasion = normalize(input.occasion ?? "");

  const score = (p: Product): number => {
    const kw = productKeywords(p);
    let s = p.favorite ? 2 : 0;
    for (const w of new Set(wanted)) if (kw.has(w)) s += 3;
    if (input.lighter) {
      for (const st of normalize(p.style.join(" "))) {
        if (LIGHT.has(st)) s += 3;
        if (HEAVY.has(st)) s -= 3;
      }
    }
    if (occasion.includes("merci") && p.color === "effervescent") s += 2;
    if (occasion.includes("noel") && p.color === "coffret") s += 1;
    if (occasion.includes("diner") && (p.color === "rouge" || p.color === "blanc")) s += 1;
    return s;
  };

  return candidates
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || b.p.stock - a.p.stock || a.p.id.localeCompare(b.p.id))
    .map((x) => x.p);
}

/**
 * Règle n° 1 : aucun produit inventé. On ne garde que les ids présents dans les
 * candidats ; chaque id rejeté est remplacé par le candidat suivant le mieux classé.
 * Jamais de complément hors critères : si moins de 3 candidats, on en rend moins.
 */
export function finalizePicks(modelIds: readonly unknown[], ranked: Product[], count = RESULT_COUNT): Product[] {
  const byId = new Map(ranked.map((p) => [p.id, p]));
  const picks: Product[] = [];
  for (const id of modelIds) {
    const p = typeof id === "string" ? byId.get(id) : undefined;
    if (p && !picks.includes(p)) picks.push(p);
    if (picks.length === count) return picks;
  }
  for (const p of ranked) {
    if (picks.length === count) break;
    if (!picks.includes(p)) picks.push(p);
  }
  return picks;
}
