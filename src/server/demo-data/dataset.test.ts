// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MOCK_MUNICIPALITIES } from "../repositories/mock/municipalities";
import adoptionsJson from "../repositories/mock/data/adoptions.json";
import blocksJson from "../repositories/mock/data/blocks.json";
import reportsJson from "../repositories/mock/data/citizen-reports.json";
import nodesJson from "../repositories/mock/data/iot-nodes.json";
import readingsJson from "../repositories/mock/data/iot-readings.json";
import { bboxContains, distanceToPolylineMeters } from "@/domain/shared/geo";
import { generateDemoDataset } from "./generate";
import { MUNICIPALITY_PROFILES } from "./profiles";

const dataset = generateDemoDataset();

describe("dados demonstrativos", () => {
  it("são determinísticos e os JSONs versionados estão atualizados (rode `npm run seed` se falhar)", () => {
    expect(generateDemoDataset().blocks).toEqual(dataset.blocks);
    expect(dataset.blocks).toEqual(blocksJson);
    expect(dataset.iotNodes).toEqual(nodesJson);
    expect(dataset.iotReadings).toEqual(readingsJson);
    expect(dataset.citizenReports).toEqual(reportsJson);
    expect(dataset.adoptions).toEqual(adoptionsJson);
  });

  it("geram centenas de quarteirões por município, dentro do bbox e fora do leito do rio", () => {
    for (const municipality of MOCK_MUNICIPALITIES) {
      const blocks = dataset.blocks.filter((b) => b.municipalityId === municipality.id);
      const profile = MUNICIPALITY_PROFILES.find((p) => p.municipalityId === municipality.id);
      expect(blocks.length).toBeGreaterThan(300);
      for (const block of blocks) {
        expect(bboxContains(municipality.bbox, block.centroid)).toBe(true);
        expect(distanceToPolylineMeters(block.centroid, profile?.river ?? [])).toBeGreaterThan(60);
      }
    }
  });

  it("mantêm ids e códigos únicos", () => {
    const ids = dataset.blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(dataset.blocks.every((b) => b.id === b.code.toLowerCase())).toBe(true);
  });

  it("reproduzem padrões urbanos: indústria mais quente e praças mais frias que a média", () => {
    const avg = (zone: string) => {
      const xs = dataset.blocks.filter((b) => b.zone === zone).map((b) => b.lstC);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    expect(avg("industrial")).toBeGreaterThan(avg("residencial") + 3);
    expect(avg("verde")).toBeLessThan(avg("residencial") - 6);
    expect(avg("comercial")).toBeGreaterThan(avg("residencial"));
  });

  it("incluem 10 nós IoT com estados realistas", () => {
    expect(dataset.iotNodes).toHaveLength(10);
    const last = (id: string) => dataset.iotReadings.filter((r) => r.nodeId === id).at(-1);
    expect(last("iot-vr-03")?.batteryPct).toBeLessThan(20);
    expect(
      Date.parse(dataset.meta.anchor) - Date.parse(last("iot-bm-02")?.timestamp ?? ""),
    ).toBeGreaterThan(8 * 3_600_000);
    expect(last("iot-rs-03")?.signalDbm).toBeLessThan(-90);
  });

  it("geram relatos anônimos, sem nenhum campo pessoal, e com moderação variada", () => {
    expect(dataset.citizenReports.length).toBeGreaterThanOrEqual(150);
    const keys = new Set(dataset.citizenReports.flatMap((r) => Object.keys(r)));
    for (const forbidden of ["name", "phone", "telefone", "nome", "email", "cpf"]) {
      expect(keys.has(forbidden)).toBe(false);
    }
    const statuses = new Set(dataset.citizenReports.map((r) => r.status));
    expect(statuses).toEqual(new Set(["pendente", "validado", "descartado", "spam"]));
    expect(dataset.citizenReports.every((r) => r.createdAt <= dataset.meta.anchor)).toBe(true);
  });

  it("geram parcerias com NDVI em ordem cronológica e revisita de 5 a 8 dias", () => {
    expect(dataset.adoptions.length).toBeGreaterThanOrEqual(6);
    for (const adoption of dataset.adoptions) {
      const dates = adoption.ndviSeries.map((o) => Date.parse(o.date));
      for (let i = 1; i < dates.length; i++) {
        const gapDays = (dates[i] - dates[i - 1]) / 86_400_000;
        expect(gapDays).toBeGreaterThanOrEqual(5);
        expect(gapDays).toBeLessThanOrEqual(8);
      }
    }
    expect(dataset.adoptions.some((a) => a.maintenance.some((t) => t.predicted))).toBe(true);
  });
});
