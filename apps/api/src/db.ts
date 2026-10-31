import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

/**
 * Accès SQL minimal, commun à `pg` (production) et à PGlite (tests) :
 * les deux renvoient `{ rows }` pour une requête paramétrée.
 */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Plusieurs instructions, sans paramètres (migrations). */
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

export function createPgDb(connectionString: string): Db {
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    // Les Postgres managés imposent TLS ; `sslmode=disable` dans l'URL pour un Postgres local.
    ssl: /sslmode=disable/.test(connectionString) ? false : { rejectUnauthorized: false },
  });
  pool.on("error", (err) => console.error("[db]", err.message));
  return {
    query: async (sql, params) => (await pool.query(sql, params)).rows,
    exec: async (sql) => void (await pool.query(sql)),
    close: () => pool.end(),
  };
}

const MIGRATIONS_DIR = new URL("../migrations/", import.meta.url);

/** Applique, dans l'ordre, les fichiers de migrations/ pas encore passés. Une seule instance à la fois. */
export async function migrate(db: Db): Promise<string[]> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const done = new Set((await db.query<{ name: string }>("SELECT name FROM schema_migrations")).map((r) => r.name));
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(new URL(file, MIGRATIONS_DIR), "utf8");
    const name = file.replace(/'/g, "''");
    // Plusieurs instructions dans une même requête simple = une seule transaction implicite :
    // en cas d'erreur, rien n'est appliqué. (Pas de BEGIN/COMMIT explicites dans les fichiers.)
    await db.exec(`${sql}\nINSERT INTO schema_migrations (name) VALUES ('${name}');`);
    applied.push(file);
  }
  return applied;
}
