import type { BudgetId } from "./types.ts";

/** Bornes incluses. Les prix ont au plus deux décimales, donc 19,99 inclus = « moins de 20 € ». */
export interface PriceRange {
  min: number;
  max: number;
}

export const BUDGETS: { id: BudgetId; label: string; short: string; range: PriceRange }[] = [
  { id: "lt20", label: "− 20 €", short: "− 20 €", range: { min: 0, max: 19.99 } },
  { id: "20-40", label: "20–40 €", short: "20–40 €", range: { min: 20, max: 40 } },
  { id: "40-80", label: "40–80 €", short: "40–80 €", range: { min: 40.01, max: 80 } },
  { id: "80+", label: "80 € +", short: "80 € +", range: { min: 80.01, max: Infinity } },
];

export function budgetRange(id: BudgetId): PriceRange {
  const b = BUDGETS.find((x) => x.id === id);
  if (!b) throw new Error(`Budget inconnu : ${id}`);
  return b.range;
}

/** Budget immédiatement supérieur, pour « élargir le budget ». */
export function widerBudget(id: BudgetId): BudgetId | null {
  const i = BUDGETS.findIndex((x) => x.id === id);
  return BUDGETS[i + 1]?.id ?? null;
}

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;
const CUR = String.raw`\s*(?:€|euros?)`;
// La devise est exigée (sauf après « budget », « max », « entre ») pour ne pas lire
// « un whisky de plus de 10 ans » comme un prix.
const BETWEEN = new RegExp(String.raw`entre\s*${NUM}(?:${CUR})?\s*et\s*${NUM}`);
const MAX = [
  new RegExp(String.raw`${NUM}${CUR}\s*(?:max|maxi|maximum|grand max)`),
  new RegExp(String.raw`(?:moins de|pas plus de|jusqu'à|jusqu'a|en dessous de|au[- ]dessous de|inférieur à)\s*${NUM}${CUR}`),
  new RegExp(String.raw`(?:budget(?: de)?|max(?:imum)?|maxi)\s*:?\s*${NUM}`),
];
const MIN = [
  new RegExp(String.raw`${NUM}${CUR}\s*(?:min|mini|minimum)`),
  new RegExp(String.raw`(?:(?<!pas )plus de|au[- ]dessus de|à partir de|a partir de|pas moins de|supérieur à|plus cher que)\s*${NUM}${CUR}`),
  new RegExp(String.raw`(?:min(?:imum)?|mini)\s*:?\s*${NUM}`),
];

function firstNumber(t: string, patterns: RegExp[]): number | undefined {
  for (const re of patterns) {
    const m = re.exec(t);
    if (m?.[1]) return Number(m[1].replace(",", "."));
  }
  return undefined;
}

/**
 * Prix exprimés en texte libre : « 30 € max », « moins de 25 € », « au-dessus de 12 € »,
 * « entre 20 et 30 € ». Sert surtout sur la page hébergée, où le client n'a qu'un champ texte.
 */
export function priceRangeFromText(text: string): { min?: number; max?: number } | null {
  const t = text.toLowerCase().replace(/’/g, "'");
  const between = BETWEEN.exec(t);
  const min = between ? Number(between[1]!.replace(",", ".")) : firstNumber(t, MIN);
  const max = between ? Number(between[2]!.replace(",", ".")) : firstNumber(t, MAX);
  return min == null && max == null ? null : { min, max };
}
