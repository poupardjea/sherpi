import { randomBytes, randomUUID } from "node:crypto";
import type { Product, ReservationStatus, Shop } from "@app/shared";

export interface Reservation {
  id: string;
  shop_slug: string;
  code: string;
  cancel_token: string;
  status: ReservationStatus;
  product_id: string;
  product_name: string;
  product_price: number;
  /** Prénom et téléphone : effacés 30 jours après la date de retrait (null ensuite). */
  first_name: string | null;
  phone: string | null;
  pickup_date: string;
  gift_wrap: boolean;
  created_at: Date;
}

export interface SearchLog {
  shop_slug: string;
  input: unknown;
  result_count: number;
  source: "model" | "fallback";
  created_at: Date;
}

export type NewReservation = Omit<Reservation, "id" | "code" | "cancel_token" | "status" | "created_at">;

/**
 * Accès aux données. Implémentation en mémoire pour la démo ;
 * l'implémentation PostgreSQL (tâche 2 de la spec) respectera la même interface.
 */
export interface Store {
  getShop(slug: string): Promise<Shop | null>;
  listProducts(shopSlug: string): Promise<Product[]>;
  createReservation(r: NewReservation): Promise<Reservation>;
  getReservation(id: string): Promise<Reservation | null>;
  setReservationStatus(id: string, status: ReservationStatus): Promise<void>;
  logSearch(log: Omit<SearchLog, "created_at">): Promise<void>;
  /**
   * Réserve un appel au modèle sur le quota du mois ("YYYY-MM", heure de Paris).
   * Atomique : renvoie false, sans rien compter, si le quota est déjà atteint.
   */
  consumeAiCall(shopSlug: string, month: string, quota: number): Promise<boolean>;
  getAiUsage(shopSlug: string, month: string): Promise<number>;
  /** RGPD : efface prénom et téléphone des retraits passés de plus de 30 jours. */
  purgePersonalData(today: string): Promise<number>;
}

const RETENTION_DAYS = 30;

export class MemoryStore implements Store {
  private reservations = new Map<string, Reservation>();
  private counters = new Map<string, number>();
  private aiUsage = new Map<string, number>();
  readonly searchLogs: SearchLog[] = [];

  constructor(
    private shops: Shop[],
    private products: Map<string, Product[]>,
  ) {}

  async getShop(slug: string) {
    return this.shops.find((s) => s.slug === slug) ?? null;
  }

  async listProducts(shopSlug: string) {
    return this.products.get(shopSlug) ?? [];
  }

  async createReservation(r: NewReservation) {
    const shop = await this.getShop(r.shop_slug);
    const seq = (this.counters.get(r.shop_slug) ?? 0) + 1;
    this.counters.set(r.shop_slug, seq);
    const reservation: Reservation = {
      ...r,
      id: randomUUID(),
      code: `${shop?.pickup_prefix ?? "R"}-${String(seq).padStart(4, "0")}`,
      cancel_token: randomBytes(24).toString("base64url"),
      status: "confirmed",
      created_at: new Date(),
    };
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  async getReservation(id: string) {
    return this.reservations.get(id) ?? null;
  }

  async setReservationStatus(id: string, status: ReservationStatus) {
    const r = this.reservations.get(id);
    if (r) r.status = status;
  }

  async logSearch(log: Omit<SearchLog, "created_at">) {
    this.searchLogs.push({ ...log, created_at: new Date() });
  }

  async consumeAiCall(shopSlug: string, month: string, quota: number) {
    const key = `${shopSlug}:${month}`;
    const calls = this.aiUsage.get(key) ?? 0;
    if (calls >= quota) return false;
    this.aiUsage.set(key, calls + 1);
    return true;
  }

  async getAiUsage(shopSlug: string, month: string) {
    return this.aiUsage.get(`${shopSlug}:${month}`) ?? 0;
  }

  async purgePersonalData(today: string) {
    const limit = new Date(`${today}T00:00:00Z`);
    limit.setUTCDate(limit.getUTCDate() - RETENTION_DAYS);
    let n = 0;
    for (const r of this.reservations.values()) {
      if (r.first_name !== null && new Date(`${r.pickup_date}T00:00:00Z`) < limit) {
        r.first_name = null;
        r.phone = null;
        n++;
      }
    }
    return n;
  }
}
