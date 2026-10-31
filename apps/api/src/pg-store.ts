import { randomBytes } from "node:crypto";
import type { Product, ReservationStatus, Shop } from "@app/shared";
import type { Db } from "./db.ts";
import type { NewReservation, Reservation, SearchLog, Store } from "./store.ts";

const RETENTION_DAYS = 30;

// numeric → float8 et date → text : mêmes types JS avec pg et PGlite.
const SHOP_COLUMNS = `slug, name, merchant_first_name, address, opening_hours, opening, tone,
  accent_primary, accent_secondary, pickup_prefix, merchant_email, sells_alcohol, ai_monthly_quota`;
const PRODUCT_COLUMNS = `p.id, p.name, p.appellation, p.color, p.grapes, p.style, p.price::float8 AS price,
  p.stock, p.available, p.favorite, p.pairings, p.merchant_note`;
const RESERVATION_COLUMNS = `r.id, s.slug AS shop_slug, r.code, r.cancel_token, r.status, r.product_id,
  r.product_name, r.product_price::float8 AS product_price, r.first_name, r.phone,
  r.pickup_date::text AS pickup_date, r.gift_wrap, r.created_at`;

export class PgStore implements Store {
  constructor(private db: Db) {}

  async getShop(slug: string) {
    const [row] = await this.db.query<Shop>(`SELECT ${SHOP_COLUMNS} FROM shops WHERE slug = $1`, [slug]);
    return row ?? null;
  }

  async listProducts(shopSlug: string) {
    return this.db.query<Product>(
      `SELECT ${PRODUCT_COLUMNS} FROM products p JOIN shops s ON s.id = p.shop_id
       WHERE s.slug = $1 ORDER BY p.position, p.id`,
      [shopSlug],
    );
  }

  async createReservation(r: NewReservation) {
    // Incrément atomique du compteur : deux réservations simultanées n'ont jamais le même n°.
    const [shop] = await this.db.query<{ id: string; seq: number; prefix: string }>(
      `UPDATE shops SET reservation_seq = reservation_seq + 1 WHERE slug = $1
       RETURNING id, reservation_seq AS seq, pickup_prefix AS prefix`,
      [r.shop_slug],
    );
    if (!shop) throw new Error(`Boutique inconnue : ${r.shop_slug}`);
    const code = `${shop.prefix}-${String(shop.seq).padStart(4, "0")}`;
    const [row] = await this.db.query<{ id: string }>(
      `INSERT INTO reservations (shop_id, code, cancel_token, product_id, product_name, product_price,
         first_name, phone, pickup_date, gift_wrap)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        shop.id,
        code,
        randomBytes(24).toString("base64url"),
        r.product_id,
        r.product_name,
        r.product_price,
        r.first_name,
        r.phone,
        r.pickup_date,
        r.gift_wrap,
      ],
    );
    return (await this.getReservation(row!.id))!;
  }

  async getReservation(id: string) {
    // Un id qui n'est pas un uuid ferait échouer la requête : on le traite comme « introuvable ».
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const [row] = await this.db.query<Reservation>(
      `SELECT ${RESERVATION_COLUMNS} FROM reservations r JOIN shops s ON s.id = r.shop_id WHERE r.id = $1`,
      [id],
    );
    return row ? { ...row, created_at: new Date(row.created_at) } : null;
  }

  async setReservationStatus(id: string, status: ReservationStatus) {
    await this.db.query("UPDATE reservations SET status = $2 WHERE id = $1", [id, status]);
  }

  async logSearch(log: Omit<SearchLog, "created_at">) {
    await this.db.query(
      `INSERT INTO search_logs (shop_id, input, result_count, source)
       SELECT id, $2::jsonb, $3, $4 FROM shops WHERE slug = $1`,
      [log.shop_slug, JSON.stringify(log.input), log.result_count, log.source],
    );
  }

  async consumeAiCall(shopSlug: string, month: string, quota: number) {
    if (quota <= 0) return false;
    // Un seul ordre SQL : deux demandes simultanées ne peuvent pas dépasser le quota.
    const rows = await this.db.query(
      `INSERT INTO ai_usage (shop_id, month, calls)
       SELECT id, ($2 || '-01')::date, 1 FROM shops WHERE slug = $1
       ON CONFLICT (shop_id, month) DO UPDATE SET calls = ai_usage.calls + 1
       WHERE ai_usage.calls < $3
       RETURNING calls`,
      [shopSlug, month, quota],
    );
    return rows.length > 0;
  }

  async getAiUsage(shopSlug: string, month: string) {
    const [row] = await this.db.query<{ calls: number }>(
      `SELECT u.calls FROM ai_usage u JOIN shops s ON s.id = u.shop_id
       WHERE s.slug = $1 AND u.month = ($2 || '-01')::date`,
      [shopSlug, month],
    );
    return row?.calls ?? 0;
  }

  async purgePersonalData(today: string) {
    const rows = await this.db.query(
      `UPDATE reservations SET first_name = NULL, phone = NULL
       WHERE first_name IS NOT NULL AND pickup_date < $1::date - $2::int RETURNING id`,
      [today, RETENTION_DAYS],
    );
    return rows.length;
  }

  // ————— Administration (seed, puis back-office) —————

  /** Crée ou met à jour une boutique (le compteur de réservations est conservé). */
  async upsertShop(shop: Shop) {
    await this.db.query(
      `INSERT INTO shops (${SHOP_COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, merchant_first_name = EXCLUDED.merchant_first_name,
         address = EXCLUDED.address, opening_hours = EXCLUDED.opening_hours, opening = EXCLUDED.opening,
         tone = EXCLUDED.tone, accent_primary = EXCLUDED.accent_primary, accent_secondary = EXCLUDED.accent_secondary,
         pickup_prefix = EXCLUDED.pickup_prefix, merchant_email = EXCLUDED.merchant_email,
         sells_alcohol = EXCLUDED.sells_alcohol, ai_monthly_quota = EXCLUDED.ai_monthly_quota`,
      [
        shop.slug,
        shop.name,
        shop.merchant_first_name,
        shop.address,
        shop.opening_hours,
        JSON.stringify(shop.opening),
        shop.tone,
        shop.accent_primary,
        shop.accent_secondary,
        shop.pickup_prefix,
        shop.merchant_email,
        shop.sells_alcohol,
        shop.ai_monthly_quota,
      ],
    );
  }

  /** Crée ou met à jour les produits d'une boutique, dans l'ordre donné. */
  async upsertProducts(shopSlug: string, products: Product[]) {
    for (const [position, p] of products.entries()) {
      await this.db.query(
        `INSERT INTO products (shop_id, id, name, appellation, color, grapes, style, price, stock,
           available, favorite, pairings, merchant_note, position)
         SELECT s.id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14 FROM shops s WHERE s.slug = $1
         ON CONFLICT (shop_id, id) DO UPDATE SET name = EXCLUDED.name, appellation = EXCLUDED.appellation,
           color = EXCLUDED.color, grapes = EXCLUDED.grapes, style = EXCLUDED.style, price = EXCLUDED.price,
           stock = EXCLUDED.stock, available = EXCLUDED.available, favorite = EXCLUDED.favorite,
           pairings = EXCLUDED.pairings, merchant_note = EXCLUDED.merchant_note, position = EXCLUDED.position,
           updated_at = now()`,
        [
          shopSlug,
          p.id,
          p.name,
          p.appellation,
          p.color,
          p.grapes,
          p.style,
          p.price,
          p.stock,
          p.available,
          p.favorite,
          p.pairings,
          p.merchant_note,
          position,
        ],
      );
    }
  }
}
