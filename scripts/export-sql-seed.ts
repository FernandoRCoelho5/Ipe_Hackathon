/**
 * Gera db/seeds/001_demo_data.sql a partir dos dados demonstrativos. Uso: `npm run db:seed-sql`.
 * O docker-compose aplica db/schema.sql e este seed na primeira inicialização do PostGIS.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO_SEED_INPUT } from "@/server/db/demo-seed-input";
import { buildSqlSeed } from "@/server/db/seed-sql";

const dir = join(process.cwd(), "db", "seeds");
mkdirSync(dir, { recursive: true });
const sql = buildSqlSeed(DEMO_SEED_INPUT);
writeFileSync(join(dir, "001_demo_data.sql"), sql, "utf8");
process.stdout.write(
  `Seed SQL gerado: db/seeds/001_demo_data.sql (${(Buffer.byteLength(sql) / 1024).toFixed(0)} KB)\n`,
);
