/**
 * Gera os dados demonstrativos do Ipê (determinísticos) e grava em
 * src/server/repositories/mock/data/. Uso: `npm run seed`.
 *
 * Todo registro é validado pelos schemas Zod do domínio antes de ser gravado:
 * se o gerador produzir algo fisicamente impossível, o script falha.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { adoptionSchema } from "@/domain/adoption/schema";
import { heatAlertSchema } from "@/domain/alerts/schema";
import { blockSchema } from "@/domain/block/schema";
import { citizenReportSchema } from "@/domain/citizen/schema";
import { iotNodeSchema, iotReadingSchema } from "@/domain/iot/schema";
import { dailyWeatherSchema } from "@/domain/thermal/diurnal";
import { generateDemoDataset } from "@/server/demo-data/generate";

const OUT_DIR = join(process.cwd(), "src", "server", "repositories", "mock", "data");

function validate<T>(name: string, schema: z.ZodType<T>, rows: readonly unknown[]): void {
  rows.forEach((row, index) => {
    const result = schema.safeParse(row);
    if (!result.success) {
      throw new Error(`${name}[${index}] inválido:\n${z.prettifyError(result.error)}`);
    }
  });
}

function write(file: string, data: unknown, pretty = false): number {
  const json = JSON.stringify(data, null, pretty ? 2 : undefined);
  writeFileSync(join(OUT_DIR, file), `${json}\n`, "utf8");
  return Buffer.byteLength(json);
}

const dataset = generateDemoDataset();

validate("weather", dailyWeatherSchema, dataset.weather);
validate("blocks", blockSchema, dataset.blocks);
validate("iotNodes", iotNodeSchema, dataset.iotNodes);
validate("iotReadings", iotReadingSchema, dataset.iotReadings);
validate("citizenReports", citizenReportSchema, dataset.citizenReports);
validate("adoptions", adoptionSchema, dataset.adoptions);
validate("alerts", heatAlertSchema, dataset.alerts);

mkdirSync(OUT_DIR, { recursive: true });
const sizes = {
  "meta.json": write("meta.json", dataset.meta, true),
  "weather.json": write("weather.json", dataset.weather, true),
  "blocks.json": write("blocks.json", dataset.blocks),
  "iot-nodes.json": write("iot-nodes.json", dataset.iotNodes, true),
  "iot-readings.json": write("iot-readings.json", dataset.iotReadings),
  "citizen-reports.json": write("citizen-reports.json", dataset.citizenReports),
  "adoptions.json": write("adoptions.json", dataset.adoptions),
  "alerts.json": write("alerts.json", dataset.alerts, true),
};

const perMunicipality = Object.entries(Object.groupBy(dataset.blocks, (b) => b.municipalityId)).map(
  ([id, blocks]) => `${id}: ${blocks?.length ?? 0}`,
);

process.stdout.write(
  [
    "Dados demonstrativos gerados e validados:",
    ...Object.entries(dataset.meta.counts).map(([k, v]) => `  ${k.padEnd(16)} ${v}`),
    `  quarteirões por município → ${perMunicipality.join(" · ")}`,
    ...Object.entries(sizes).map(
      ([f, bytes]) => `  ${f.padEnd(22)} ${(bytes / 1024).toFixed(0)} KB`,
    ),
    "",
  ].join("\n"),
);
