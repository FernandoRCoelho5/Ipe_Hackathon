import type { Adoption } from "@/domain/adoption/schema";
import type { HeatAlert } from "@/domain/alerts/schema";
import { hourlyProfile } from "@/domain/block/pedestrian";
import type { Block } from "@/domain/block/schema";
import type { CitizenReport } from "@/domain/citizen/schema";
import type { IotNode, IotReading } from "@/domain/iot/schema";
import type { Municipality } from "@/domain/municipality/types";
import type { LngLat } from "@/domain/shared/geo";
import type { DailyWeather } from "@/domain/thermal/diurnal";

/**
 * Converte os dados demonstrativos em INSERTs para o esquema PostGIS (db/schema.sql).
 * O UTCI horário é calculado com o mesmo modelo do domínio, garantindo que banco e
 * API produzam os mesmos números. Saída determinística (mesma entrada ⇒ mesmo texto).
 */

export const UTCI_MODEL_VERSION = "utci-simplificado-v1";
export const LST_PERIOD = "verao-2025-2026";

export interface SeedInput {
  municipalities: readonly Municipality[];
  weather: readonly DailyWeather[];
  blocks: readonly Block[];
  iotNodes: readonly IotNode[];
  iotReadings: readonly IotReading[];
  citizenReports: readonly CitizenReport[];
  adoptions: readonly Adoption[];
  alerts: readonly HeatAlert[];
}

type SqlValue = string | number | boolean | null | SqlRaw;
class SqlRaw {
  constructor(readonly sql: string) {}
}
const raw = (sql: string) => new SqlRaw(sql);

function literal(value: SqlValue): string {
  if (value === null) return "NULL";
  if (value instanceof SqlRaw) return value.sql;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Número inválido no seed: ${value}`);
    return String(value);
  }
  return `'${value.replace(/'/g, "''")}'`;
}

const textArray = (values: readonly string[]) =>
  raw(values.length ? `ARRAY[${values.map(literal).join(", ")}]::text[]` : "'{}'::text[]");
const jsonb = (value: unknown) => raw(`${literal(JSON.stringify(value))}::jsonb`);
const point = ([lng, lat]: LngLat) => raw(`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`);
const polygon = (ring: readonly LngLat[]) =>
  raw(`ST_GeomFromText('POLYGON((${ring.map(([x, y]) => `${x} ${y}`).join(", ")}))', 4326)`);
const bboxPolygon = ([w, s, e, n]: readonly number[]) =>
  raw(`ST_MakeEnvelope(${w}, ${s}, ${e}, ${n}, 4326)`);

function insert(table: string, columns: string[], rows: SqlValue[][], chunk = 400): string {
  if (rows.length === 0) return "";
  const parts: string[] = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const values = rows
      .slice(i, i + chunk)
      .map((row) => `  (${row.map(literal).join(", ")})`)
      .join(",\n");
    parts.push(`INSERT INTO ${table} (${columns.join(", ")}) VALUES\n${values};`);
  }
  return `${parts.join("\n")}\n`;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function buildSqlSeed(input: SeedInput): string {
  const weatherByMunicipality = new Map(input.weather.map((w) => [w.municipalityId, w]));
  const sections: string[] = [
    "-- Gerado por `npm run db:seed-sql` a partir dos dados demonstrativos — não edite à mão.",
    "-- DADOS DEMONSTRATIVOS (sintéticos). Datas no instante de referência do conjunto (ver docs/DATA.md).",
    "SET search_path TO ipe, public;",
    "BEGIN;",
    "",
  ];

  sections.push(
    insert(
      "municipalities",
      [
        "id",
        "name",
        "state",
        "ibge_code",
        "population",
        "population_year",
        "center",
        "bbox",
        "default_zoom",
      ],
      input.municipalities.map((m) => [
        m.id,
        m.name,
        m.state,
        m.ibgeCode,
        m.population,
        m.populationYear,
        point(m.center),
        bboxPolygon(m.bbox),
        m.defaultZoom,
      ]),
    ),
    insert(
      "weather_reference_days",
      [
        "municipality_id",
        "date",
        "station_name",
        "t_min",
        "t_max",
        "rh_at_min",
        "wind_mean",
        "solar_peak",
      ],
      input.weather.map((w) => [
        w.municipalityId,
        w.date,
        w.stationName,
        w.tMin,
        w.tMax,
        w.rhAtMin,
        w.windMean,
        w.solarPeak,
      ]),
    ),
    insert(
      "blocks",
      [
        "id",
        "municipality_id",
        "code",
        "neighborhood",
        "street",
        "zone",
        "geom",
        "centroid",
        "area_m2",
        "perimeter_m",
        "canopy_cover",
        "street_canopy",
        "building_shade",
        "imperviousness",
        "roof_metal_share",
        "roof_area_m2",
        "free_soil_share",
        "sidewalk_width_m",
        "wind_exposure",
        "distance_to_river_m",
        "slope_pct",
        "pedestrian_flow",
        "population",
        "density_per_km2",
        "elderly_share",
        "income_per_capita",
      ],
      input.blocks.map((b) => [
        b.id,
        b.municipalityId,
        b.code,
        b.neighborhood,
        b.street,
        b.zone,
        polygon(b.geometry.coordinates[0]),
        point(b.centroid),
        b.areaM2,
        b.perimeterM,
        b.canopyCover,
        b.streetCanopy,
        b.buildingShade,
        b.imperviousness,
        b.roofMetalShare,
        b.roofAreaM2,
        b.freeSoilShare,
        b.sidewalkWidthM,
        b.windExposure,
        b.distanceToRiverM,
        b.slopePct,
        b.pedestrianFlow,
        b.population,
        b.densityPerKm2,
        b.elderlyShare,
        b.incomePerCapita,
      ]),
    ),
    insert(
      "lst_observations",
      ["block_id", "period", "sensor", "lst_c", "ndvi", "scenes"],
      input.blocks.map((b) => [b.id, LST_PERIOD, "Composição", b.lstC, b.ndvi, 6]),
    ),
  );

  const utciRows: SqlValue[][] = [];
  for (const block of input.blocks) {
    const weather = weatherByMunicipality.get(block.municipalityId);
    if (!weather) throw new Error(`Sem clima de referência para ${block.municipalityId}`);
    for (const c of hourlyProfile(block, weather)) {
      utciRows.push([
        block.id,
        block.municipalityId,
        weather.date,
        c.hour,
        UTCI_MODEL_VERSION,
        r1(c.airTemp),
        r1(c.meanRadiantTemp),
        r1(c.utci),
        c.category.id,
      ]);
    }
  }
  sections.push(
    insert(
      "utci_estimates",
      [
        "block_id",
        "municipality_id",
        "reference_date",
        "hour",
        "model_version",
        "air_temp_c",
        "mean_radiant_c",
        "utci_c",
        "stress_category",
      ],
      utciRows,
    ),
    insert(
      "citizen_reports",
      [
        "id",
        "municipality_id",
        "block_id",
        "geom",
        "category",
        "text",
        "created_at",
        "anon_id",
        "channel",
        "spam_score",
        "status",
        "has_photo",
      ],
      input.citizenReports.map((r) => [
        r.id,
        r.municipalityId,
        r.blockId,
        point(r.location),
        r.category,
        r.text,
        r.createdAt,
        r.anonId,
        r.channel,
        r.spamScore,
        r.status,
        r.hasPhoto,
      ]),
    ),
    insert(
      "iot_nodes",
      [
        "id",
        "code",
        "municipality_id",
        "block_id",
        "label",
        "geom",
        "hardware",
        "connectivity",
        "installed_at",
      ],
      input.iotNodes.map((n) => [
        n.id,
        n.code,
        n.municipalityId,
        n.blockId,
        n.label,
        point(n.location),
        n.hardware,
        n.connectivity,
        n.installedAt,
      ]),
    ),
    insert(
      "iot_readings",
      ["node_id", "ts", "temperature_c", "humidity", "battery_pct", "signal_dbm"],
      input.iotReadings.map((r) => [
        r.nodeId,
        r.timestamp,
        r.temperatureC,
        r.humidity,
        r.batteryPct,
        r.signalDbm,
      ]),
    ),
    insert(
      "heat_alerts",
      [
        "id",
        "municipality_ids",
        "level",
        "title",
        "message",
        "max_temp_c",
        "starts_at",
        "ends_at",
        "source",
      ],
      input.alerts.map((a) => [
        a.id,
        textArray(a.municipalityIds),
        a.level,
        a.title,
        a.message,
        a.maxTempC,
        a.startsAt,
        a.endsAt,
        a.source,
      ]),
    ),
    insert(
      "adoptions",
      [
        "id",
        "municipality_id",
        "block_id",
        "area_name",
        "partner_name",
        "partner_type",
        "status",
        "adopted_at",
        "commitments",
      ],
      input.adoptions.map((a) => [
        a.id,
        a.municipalityId,
        a.blockId,
        a.areaName,
        a.partnerName,
        a.partnerType,
        a.status,
        a.adoptedAt,
        jsonb(a.commitments),
      ]),
    ),
    insert(
      "maintenance_tasks",
      ["id", "adoption_id", "type", "due_date", "status", "predicted", "reason"],
      input.adoptions.flatMap((a) =>
        a.maintenance.map((t) => [t.id, a.id, t.type, t.dueDate, t.status, t.predicted, t.reason]),
      ),
    ),
    insert(
      "ndvi_timeseries",
      ["block_id", "observed_on", "sensor", "ndvi", "cloudy"],
      input.adoptions.flatMap((a) =>
        a.ndviSeries.map((o) => [a.blockId, o.date, o.sensor, o.ndvi, o.cloudy]),
      ),
    ),
    "COMMIT;",
    "",
  );

  return sections.filter((s) => s !== "").join("\n");
}
