import { z } from "zod";
import { formatDecimal, formatInteger } from "../../lib/format";
import { hourlyProfile, type PedestrianSurface } from "../block/pedestrian";
import type { Block } from "../block/schema";
import { crownAreaM2, SPECIES, speciesIdSchema } from "../prescription/species";
import { clamp, clamp01, mean, round } from "../shared/math";
import { SOLAR_PEAK_WINDOW, type DailyWeather } from "../thermal/diurnal";
import { TMRT_MODEL } from "../thermal/tmrt";
import {
  centralCoefficients,
  SENSITIVITY,
  type SensitivityCase,
  type SimulationCoefficients,
} from "./coefficients";

/** Cenário de intervenção — validado igualmente no cliente e na API. */
export const treePlantingSchema = z.object({
  speciesId: speciesIdSchema,
  count: z.number().int().min(0).max(300),
});
export type TreePlanting = z.infer<typeof treePlantingSchema>;

export const simulationScenarioSchema = z.object({
  blockId: z.string().min(1),
  trees: z.array(treePlantingSchema).max(10).default([]),
  /** Fração do piso impermeável (exceto telhados) convertida em pavimento permeável. */
  permeablePavementShare: z.number().min(0).max(1).default(0),
  /** Fração da área de telhados com pintura atérmica. */
  coolRoofShare: z.number().min(0).max(1).default(0),
  /** Horizonte de avaliação: a copa cresce com os anos. */
  horizonYears: z.number().int().min(1).max(20).default(10),
});
export type SimulationScenario = z.infer<typeof simulationScenarioSchema>;
export type SimulationScenarioInput = z.input<typeof simulationScenarioSchema>;

export type SimulatedBlock = Pick<
  Block,
  | "id"
  | "areaM2"
  | "perimeterM"
  | "lstC"
  | "canopyCover"
  | "streetCanopy"
  | "buildingShade"
  | "windExposure"
  | "imperviousness"
  | "roofAreaM2"
  | "freeSoilShare"
  | "sidewalkWidthM"
>;

/** Fração da copa adulta alcançada após `years` anos. */
export function crownGrowthFactor(years: number, growthYears: number): number {
  return 1 - Math.exp(-Math.max(0, years) / growthYears);
}

/** Quantas árvores o quarteirão comporta em calçadas e solo livre (locais potenciais). */
export function plantingCapacity(block: SimulatedBlock, c: SimulationCoefficients): number {
  const alongSidewalk = block.sidewalkWidthM >= 2 ? block.perimeterM / c.treeSpacingM : 0;
  const inSoil = (block.freeSoilShare * block.areaM2) / c.soilAreaPerTreeM2;
  return Math.floor(alongSidewalk + inSoil);
}

interface LandCover {
  roof: number;
  pavedGround: number;
  pervious: number;
}

function landCover(block: SimulatedBlock): LandCover {
  const roof = clamp01(block.roofAreaM2 / block.areaM2);
  const impervious = clamp01(block.imperviousness);
  const pavedGround = clamp01(Math.max(0, impervious - roof));
  return { roof: Math.min(roof, impervious), pavedGround, pervious: 1 - impervious };
}

interface AppliedScenario {
  surface: PedestrianSurface;
  extraAirOffset: number;
  blockLst: number;
  canopyCover: number;
  streetCanopy: number;
  addedCanopyM2: number;
  plantedTrees: number;
  convertedShare: number;
  paintedShare: number;
}

function applyScenario(
  block: SimulatedBlock,
  scenario: SimulationScenario,
  c: SimulationCoefficients,
  sensitivity: SensitivityCase,
): AppliedScenario {
  const s = SENSITIVITY[sensitivity];
  const capacity = plantingCapacity(block, c);
  const requested = scenario.trees.reduce((total, t) => total + t.count, 0);
  // Acima da capacidade, o efeito é limitado proporcionalmente (aviso no resultado).
  const capacityFactor = requested > capacity && requested > 0 ? capacity / requested : 1;
  const growth = crownGrowthFactor(scenario.horizonYears, c.crownGrowthYears);

  let addedCanopyM2 = 0;
  let addedSidewalkShadeM2 = 0;
  for (const planting of scenario.trees) {
    const species = SPECIES[planting.speciesId];
    const count = planting.count * capacityFactor;
    const crown = crownAreaM2(species) * growth;
    addedCanopyM2 += count * crown;
    addedSidewalkShadeM2 += count * crown * species.shadeDensity * s.overlap;
  }

  const sidewalkAreaM2 = block.perimeterM * Math.max(block.sidewalkWidthM, 1.2);
  const canopyCover = clamp(block.canopyCover + addedCanopyM2 / block.areaM2, 0, 0.95);
  const streetCanopy = clamp(block.streetCanopy + addedSidewalkShadeM2 / sidewalkAreaM2, 0, 0.95);
  const deltaCanopy = canopyCover - block.canopyCover;

  const cover = landCover(block);
  const convertedShare = scenario.permeablePavementShare * cover.pavedGround;
  const paintedShare = scenario.coolRoofShare * cover.roof;
  const k = s.coefficientFactor;

  const groundCooling = k * (c.lstPerCanopy * deltaCanopy + c.lstPermeable * convertedShare);
  const roofCooling = k * c.lstCoolRoof * paintedShare;

  return {
    surface: {
      lstC: block.lstC - groundCooling - roofCooling * c.roofPedestrianWeight,
      canopyCover,
      streetCanopy,
      buildingShade: block.buildingShade,
      windExposure: block.windExposure,
    },
    extraAirOffset: -k * (c.airPermeable * convertedShare + c.airCoolRoof * paintedShare),
    blockLst: block.lstC - groundCooling - roofCooling,
    canopyCover,
    streetCanopy,
    addedCanopyM2: addedCanopyM2,
    plantedTrees: Math.round(requested * capacityFactor),
    convertedShare,
    paintedShare,
  };
}

function runoffCoefficient(cover: LandCover, convertedShare: number, c: SimulationCoefficients) {
  return (
    cover.roof * c.runoffRoof +
    (cover.pavedGround - convertedShare) * c.runoffImpervious +
    convertedShare * c.runoffPermeable +
    cover.pervious * c.runoffPervious
  );
}

function evapotranspirationIndex(
  canopy: number,
  cover: LandCover,
  convertedShare: number,
  c: SimulationCoefficients,
) {
  return canopy * c.etCanopy + cover.pervious * c.etPervious + convertedShare * c.etPermeable;
}

export interface HourlyComparison {
  hour: number;
  current: number;
  simulated: number;
  delta: number;
  inPeakWindow: boolean;
}

export interface Range {
  /** Estimativa central. */
  central: number;
  /** Extremo conservador (menor efeito). */
  conservative: number;
  /** Extremo otimista (maior efeito). */
  optimistic: number;
}

export interface SimulationResult {
  scenario: SimulationScenario;
  hourly: HourlyComparison[];
  /** Variação média do UTCI no pico solar (11h–15h), °C; negativa = alívio. */
  peakUtciDelta: Range;
  /** Maior alívio horário (°C, negativo). */
  maxHourlyDelta: number;
  baselinePeakUtci: number;
  simulatedPeakUtci: number;
  /** Variação relativa da evapotranspiração (0,18 = +18%). */
  evapotranspirationChange: number;
  /** Variação relativa do escoamento superficial (−0,12 = 12% a menos). */
  runoffChange: number;
  retainedVolumeM3PerYear: number;
  surfaceTempDelta: number;
  canopyCover: { before: number; after: number };
  streetCanopy: { before: number; after: number };
  addedCanopyM2: number;
  plantingCapacity: number;
  plantedTrees: number;
  permeableAreaM2: number;
  coolRoofAreaM2: number;
  warnings: string[];
}

export function simulate(
  block: SimulatedBlock,
  weather: DailyWeather,
  scenarioInput: SimulationScenarioInput,
  coefficients: SimulationCoefficients = centralCoefficients(),
): SimulationResult {
  const scenario = simulationScenarioSchema.parse(scenarioInput);
  const c = coefficients;
  const cover = landCover(block);

  const baselineSurface: PedestrianSurface = block;
  const baseline = hourlyProfile(baselineSurface, weather);

  const runCase = (sensitivity: SensitivityCase) => {
    const applied = applyScenario(block, scenario, c, sensitivity);
    const tmrtModel = { ...TMRT_MODEL, shadeEfficacy: SENSITIVITY[sensitivity].shadeEfficacy };
    // A linha de base usa a mesma eficácia de sombra do caso, para isolar o efeito da intervenção.
    const base =
      sensitivity === "central" ? baseline : hourlyProfile(baselineSurface, weather, { tmrtModel });
    const simulated = hourlyProfile(applied.surface, weather, {
      extraAirOffset: applied.extraAirOffset,
      tmrtModel,
    });
    return { applied, base, simulated };
  };

  const central = runCase("central");
  const conservative = runCase("conservative");
  const optimistic = runCase("optimistic");

  const inWindow = (hour: number) => hour >= SOLAR_PEAK_WINDOW[0] && hour <= SOLAR_PEAK_WINDOW[1];
  const windowDelta = (run: ReturnType<typeof runCase>) =>
    mean(
      run.simulated
        .map((s, i) => ({ hour: s.hour, delta: s.utci - run.base[i].utci }))
        .filter((d) => inWindow(d.hour))
        .map((d) => d.delta),
    );

  const hourly: HourlyComparison[] = central.simulated.map((s, i) => ({
    hour: s.hour,
    current: round(baseline[i].utci, 2),
    simulated: round(s.utci, 2),
    delta: round(s.utci - baseline[i].utci, 2),
    inPeakWindow: inWindow(s.hour),
  }));

  const deltas = [windowDelta(conservative), windowDelta(central), windowDelta(optimistic)];
  const peakUtciDelta: Range = {
    central: round(deltas[1], 2),
    conservative: round(Math.max(...deltas), 2),
    optimistic: round(Math.min(...deltas), 2),
  };

  const applied = central.applied;
  const runoffBefore = runoffCoefficient(cover, 0, c);
  const runoffAfter = runoffCoefficient(cover, applied.convertedShare, c);
  const etBefore = evapotranspirationIndex(block.canopyCover, cover, 0, c);
  const etAfter = evapotranspirationIndex(applied.canopyCover, cover, applied.convertedShare, c);

  const capacity = plantingCapacity(block, c);
  const requested = scenario.trees.reduce((total, t) => total + t.count, 0);
  const warnings: string[] = [];
  if (requested > capacity) {
    warnings.push(
      `O cenário pede ${formatInteger(requested)} árvores, mas o quarteirão comporta cerca de ${formatInteger(capacity)} nos locais potenciais. O efeito foi limitado a essa capacidade.`,
    );
  }
  for (const planting of scenario.trees) {
    const species = SPECIES[planting.speciesId];
    if (
      planting.count > 0 &&
      species.minSidewalkM > block.sidewalkWidthM &&
      block.freeSoilShare < 0.05
    ) {
      warnings.push(
        `${species.commonName} pede calçada de ${formatDecimal(species.minSidewalkM)} m ou mais; aqui a calçada tem ${formatDecimal(block.sidewalkWidthM)} m. Prefira canteiros e praças ou uma espécie de menor porte.`,
      );
    }
  }
  if (cover.pavedGround < 0.05 && scenario.permeablePavementShare > 0) {
    warnings.push("Há pouco piso impermeável para converter neste quarteirão.");
  }

  const baselinePeak = Math.max(...baseline.filter((h) => inWindow(h.hour)).map((h) => h.utci));
  const simulatedPeak = Math.max(
    ...central.simulated.filter((h) => inWindow(h.hour)).map((h) => h.utci),
  );

  return {
    scenario,
    hourly,
    peakUtciDelta,
    maxHourlyDelta: round(Math.min(...hourly.map((h) => h.delta)), 2),
    baselinePeakUtci: round(baselinePeak, 1),
    simulatedPeakUtci: round(simulatedPeak, 1),
    evapotranspirationChange: round((etAfter - etBefore) / Math.max(etBefore, 0.02), 3),
    runoffChange: round((runoffAfter - runoffBefore) / runoffBefore, 3),
    retainedVolumeM3PerYear: round(
      block.areaM2 * c.annualRainfallM * (runoffBefore - runoffAfter),
      0,
    ),
    surfaceTempDelta: round(applied.blockLst - block.lstC, 2),
    canopyCover: { before: round(block.canopyCover, 3), after: round(applied.canopyCover, 3) },
    streetCanopy: { before: round(block.streetCanopy, 3), after: round(applied.streetCanopy, 3) },
    addedCanopyM2: round(applied.addedCanopyM2, 0),
    plantingCapacity: capacity,
    plantedTrees: applied.plantedTrees,
    permeableAreaM2: round(applied.convertedShare * block.areaM2, 0),
    coolRoofAreaM2: round(applied.paintedShare * block.areaM2, 0),
    warnings,
  };
}
