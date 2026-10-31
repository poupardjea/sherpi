// npm run db:seed -w apps/api — applique les migrations puis charge la cave de démo.
import { createPgDb, migrate } from "./db.ts";
import { PgStore } from "./pg-store.ts";
import { seedDemo } from "./seed.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquant");
  process.exit(1);
}
const db = createPgDb(url);
try {
  const applied = await migrate(db);
  console.log(applied.length ? `Migrations appliquées : ${applied.join(", ")}` : "Schéma à jour");
  await seedDemo(new PgStore(db));
  console.log("Cave de démo chargée");
} finally {
  await db.close();
}
