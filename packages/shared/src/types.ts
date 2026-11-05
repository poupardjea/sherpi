import type { ShopCopy, VerticalId } from "./verticals.ts";

export interface Product {
  id: string;
  name: string;
  /** Ligne sous le nom : appellation, producteur, auteur… */
  origin: string;
  /** Catégorie, filtre strict : rouge, coffret, sucré, roman, jeunesse… */
  category: string;
  /** Précisions affichées après l'origine : cépages, ingrédients, genre, âge… */
  details: string[];
  /** Mots-clés de style ou de goût, pour le classement (non affichés) : puissant, gourmand, drôle… */
  tags: string[];
  /** « bouteille », « pot », « livre » : « 1 bouteille » sur la confirmation. */
  unit: string;
  price: number;
  /** Stock indicatif, saisi par le commerçant. */
  stock: number;
  /** Case « Dispo » du back-office. */
  available: boolean;
  favorite: boolean;
  /** Accords, publics ou usages : gibier, apéritif, ado… */
  pairings: string[];
  /** « Le mot du commerçant », affiché tel quel au client. */
  merchant_note: string;
}

/** Horaires d'ouverture par jour de la semaine (0 = dimanche), heures "HH:MM". */
export type OpeningHours = Partial<Record<number, { open: string; close: string }>>;

export interface Shop {
  slug: string;
  name: string;
  vertical: VerticalId;
  merchant_first_name: string;
  address: string;
  opening_hours: string;
  opening: OpeningHours;
  tone: string;
  accent_primary: string;
  accent_secondary: string;
  /** Préfixe des n° de retrait (ex. "M" → M-0427). */
  pickup_prefix: string;
  merchant_email: string;
  /** Le commerçant vend de l'alcool : mention Loi Évin obligatoire. */
  sells_alcohol: boolean;
  /** Appels au modèle autorisés par mois ; au-delà, classement simple. 0 = jamais de modèle. */
  ai_monthly_quota: number;
}

/** Ce que le widget reçoit : jamais l'e-mail du commerçant ni le ton brut. */
export interface PublicShopConfig {
  slug: string;
  name: string;
  merchant_first_name: string;
  address: string;
  accent_primary: string;
  accent_secondary: string;
  sells_alcohol: boolean;
  product_name: string;
  /** Textes et raccourcis du métier. */
  copy: ShopCopy;
  closes_today: string | null;
  pickup_days: PickupDay[];
}

export interface PickupDay {
  /** "YYYY-MM-DD", heure de Paris. */
  date: string;
  /** "Sam. 20 déc." */
  label: string;
  /** "avant 19 h" */
  until: string;
}

export type BudgetId = "lt20" | "20-40" | "40-80" | "80+";

export interface RecommendInput {
  recipient?: string;
  occasion?: string;
  budget?: BudgetId;
  /** Plafond explicite (raccourcis de la page hébergée). Ignoré si `budget` est fourni. */
  max_price?: number;
  text?: string;
  /** Filtre strict sur la catégorie, ex. "coffret". */
  category?: string;
  favorites_only?: boolean;
  /** Puce de préférence du métier (« Plus léger », « Plutôt sucré ») : préférence, pas un filtre. */
  lighter?: boolean;
}

export interface Recommendation {
  id: string;
  name: string;
  origin: string;
  details: string[];
  category: string;
  unit: string;
  price: number;
  stock: number;
  merchant_note: string;
}

export interface RecommendResponse {
  products: Recommendation[];
  /**
   * Moins de 3 produits compatibles : ce qu'il faut renvoyer pour élargir le budget
   * (null si le budget n'est pas en cause ou ne peut plus être élargi).
   */
  widen: Pick<RecommendInput, "budget" | "max_price"> | null;
  source: "model" | "fallback";
}

export interface ReservationInput {
  product_id: string;
  first_name: string;
  phone: string;
  pickup_date: string;
  gift_wrap: boolean;
}

export type ReservationStatus = "confirmed" | "ready" | "picked_up" | "cancelled";

export interface PublicReservation {
  id: string;
  code: string;
  status: ReservationStatus;
  first_name: string;
  product: { name: string; price: number };
  gift_wrap: boolean;
  pickup: PickupDay;
  shop: { name: string; address: string; merchant_first_name: string };
  cancel_url: string;
  ics_url: string;
}
