import type { Block } from "./block/schema";
import type { DailyWeather } from "./thermal/diurnal";

/** Fixtures compartilhadas pelos testes do domínio. */

export const HOT_DAY: DailyWeather = {
  municipalityId: "volta-redonda",
  date: "2026-01-20",
  stationName: "Volta Redonda (demonstrativo)",
  tMin: 22.8,
  tMax: 35.4,
  rhAtMin: 0.82,
  windMean: 1.6,
  solarPeak: 900,
};

const square: Block["geometry"] = {
  type: "Polygon",
  coordinates: [
    [
      [-44.105, -22.524],
      [-44.104, -22.524],
      [-44.104, -22.523],
      [-44.105, -22.523],
      [-44.105, -22.524],
    ],
  ],
};

export function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "vr-0001",
    municipalityId: "volta-redonda",
    code: "VR-0001",
    neighborhood: "Vila Santa Cecília",
    street: "Rua 33",
    zone: "comercial",
    geometry: square,
    centroid: [-44.1045, -22.5235],
    areaM2: 9000,
    perimeterM: 400,
    lstC: 44,
    ndvi: 0.1,
    canopyCover: 0.06,
    streetCanopy: 0.05,
    buildingShade: 0.18,
    imperviousness: 0.93,
    roofMetalShare: 0.25,
    roofAreaM2: 6000,
    freeSoilShare: 0.02,
    sidewalkWidthM: 3,
    windExposure: 0.65,
    distanceToRiverM: 600,
    slopePct: 2,
    pedestrianFlow: 1200,
    population: 80,
    densityPerKm2: 9000,
    elderlyShare: 0.2,
    incomePerCapita: 2400,
    ...overrides,
  };
}
