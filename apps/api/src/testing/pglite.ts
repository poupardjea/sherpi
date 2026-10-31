import { PGlite } from "@electric-sql/pglite";
import type { Db } from "../db.ts";

/** Vrai Postgres en mémoire (WASM) pour les tests : aucune installation requise. */
export async function createPgliteDb(): Promise<Db> {
  const pg = await PGlite.create();
  return {
    query: async (sql, params) => (await pg.query(sql, params)).rows as never[],
    exec: async (sql) => void (await pg.exec(sql)),
    close: () => pg.close(),
  };
}
