// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { diagnoseBlock } from "@/domain/block/diagnostics";
import { DEMO_SEED_INPUT } from "./demo-seed-input";
import { buildSqlSeed } from "./seed-sql";

/**
 * Valida db/schema.sql + db/seeds num PostgreSQL real com PostGIS (PGlite, WASM).
 * PGlite roda PostgreSQL 18 / PostGIS 3.6; o esquema evita recursos posteriores ao PG 16.
 */

const ROOT = process.cwd();
const schemaSql = readFileSync(join(ROOT, "db", "schema.sql"), "utf8");
const seedSql = readFileSync(join(ROOT, "db", "seeds", "001_demo_data.sql"), "utf8");
let db: PGlite;

beforeAll(async () => {
  db = await PGlite.create({ extensions: { postgis } });
  await db.exec(schemaSql);
  await db.exec(seedSql);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

const count = async (table: string) =>
  Number((await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ipe.${table}`)).rows[0].n);

describe("banco PostGIS (schema + seed)", () => {
  it("o seed versionado está em sincronia com os dados (rode `npm run db:seed-sql` se falhar)", () => {
    expect(seedSql).toBe(buildSqlSeed(DEMO_SEED_INPUT));
  });

  it("carrega todas as entidades demonstrativas", async () => {
    expect(await count("municipalities")).toBe(3);
    expect(await count("blocks")).toBe(DEMO_SEED_INPUT.blocks.length);
    expect(await count("utci_estimates")).toBe(DEMO_SEED_INPUT.blocks.length * 11);
    expect(await count("iot_nodes")).toBe(10);
    expect(await count("iot_readings")).toBe(DEMO_SEED_INPUT.iotReadings.length);
    expect(await count("citizen_reports")).toBe(DEMO_SEED_INPUT.citizenReports.length);
    expect(await count("adoptions")).toBe(DEMO_SEED_INPUT.adoptions.length);
    expect(await count("roles")).toBe(4);
  });

  it("geometrias válidas, dentro do município, com área coerente", async () => {
    const { rows } = await db.query<{ outside: number; invalid: number; max_err: number }>(`
      SELECT
        count(*) FILTER (WHERE NOT ST_Within(b.centroid, m.bbox))::int AS outside,
        count(*) FILTER (WHERE NOT ST_IsValid(b.geom))::int AS invalid,
        max(abs(ST_Area(b.geom::geography) - b.area_m2) / b.area_m2)::float AS max_err
      FROM ipe.blocks b JOIN ipe.municipalities m ON m.id = b.municipality_id`);
    expect(rows[0].outside).toBe(0);
    expect(rows[0].invalid).toBe(0);
    expect(rows[0].max_err).toBeLessThan(0.01);
  });

  it("consulta espacial: quarteirões a até 300 m do centro de Volta Redonda", async () => {
    const { rows } = await db.query<{ n: number }>(`
      SELECT count(*)::int AS n FROM ipe.blocks
      WHERE ST_DWithin(centroid::geography, ST_SetSRID(ST_MakePoint(-44.104, -22.5231), 4326)::geography, 300)`);
    expect(rows[0].n).toBeGreaterThan(3);
  });

  it("a view IVTU em SQL reproduz o IVTU do domínio TypeScript", async () => {
    const { rows } = await db.query<{ block_id: string; ivtu: number; ivtu_level: string }>(
      "SELECT block_id, ivtu::float AS ivtu, ivtu_level FROM ipe.v_block_ivtu",
    );
    expect(rows).toHaveLength(DEMO_SEED_INPUT.blocks.length);
    const weather = new Map(DEMO_SEED_INPUT.weather.map((w) => [w.municipalityId, w]));
    const blocks = new Map(DEMO_SEED_INPUT.blocks.map((b) => [b.id, b]));
    let maxDiff = 0;
    let sameLevel = 0;
    for (const row of rows) {
      const block = blocks.get(row.block_id);
      const w = block && weather.get(block.municipalityId);
      if (!block || !w) throw new Error(`Quarteirão sem dados: ${row.block_id}`);
      const ts = diagnoseBlock(block, w).ivtu;
      maxDiff = Math.max(maxDiff, Math.abs(ts.score - row.ivtu));
      if (ts.level === row.ivtu_level) sameLevel += 1;
    }
    // O banco guarda o UTCI com 1 casa decimal: diferença máxima de poucos centésimos.
    expect(maxDiff).toBeLessThan(0.2);
    expect(sameLevel / rows.length).toBeGreaterThan(0.99);
  });

  it("restrições protegem a LGPD e os domínios de valores", async () => {
    await expect(
      db.query(
        `INSERT INTO ipe.citizen_reports (id, municipality_id, geom, category, text, created_at, anon_id, channel, spam_score)
         VALUES ('x1', 'resende', ST_SetSRID(ST_MakePoint(-44.44, -22.46), 4326), 'calcada-sem-arvores', 'ok', now(), '21999990000', 'web', 0)`,
      ),
    ).rejects.toThrow(/anon_id/);
    await expect(
      db.query(
        `INSERT INTO ipe.citizen_reports (id, municipality_id, geom, category, text, created_at, anon_id, channel, spam_score)
         VALUES ('x2', 'resende', ST_SetSRID(ST_MakePoint(-44.44, -22.46), 4326), 'outra', 'ok', now(), 'anon-abc123', 'web', 0)`,
      ),
    ).rejects.toThrow(/category/);
    await expect(
      db.query("UPDATE ipe.ivtu_configs SET threshold_high = 10 WHERE version = 'padrao-v1'"),
    ).rejects.toThrow(/check/i);
  });

  it("última leitura por nó IoT via view", async () => {
    expect(await count("v_iot_latest")).toBe(10);
  });
});
