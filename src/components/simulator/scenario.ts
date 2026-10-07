import type { Block } from "@/domain/block/schema";
import type { BlockDiagnostics } from "@/domain/block/diagnostics";
import type { EsgInput } from "@/domain/esg/esg";
import {
  SPECIES,
  SPECIES_IDS,
  suggestSpecies,
  type SpeciesId,
} from "@/domain/prescription/species";
import { centralCoefficients } from "@/domain/simulation/coefficients";
import type { SimulationResult, SimulationScenarioInput } from "@/domain/simulation/simulate";
import { plantingCapacity } from "@/domain/simulation/simulate";
import { formatDecimal, formatPercent } from "@/lib/format";

/**
 * Rascunho do cenário editado nos controles do simulador e os cenários prontos.
 * Tudo aqui é puro: o cálculo do efeito continua na API (POST /simulation/what-if).
 */

export const MAX_TREES_PER_SPECIES = 300;

export interface ScenarioDraft {
  trees: Partial<Record<SpeciesId, number>>;
  /** Fração do piso impermeável convertida (0–1). */
  permeable: number;
  /** Fração dos telhados com pintura atérmica (0–1). */
  coolRoof: number;
  horizonYears: number;
}

export const EMPTY_DRAFT: ScenarioDraft = {
  trees: {},
  permeable: 0,
  coolRoof: 0,
  horizonYears: 10,
};

export type PresetId = "recommended" | "trees" | "full" | "clear";

type SimBlock = Pick<
  Block,
  | "id"
  | "areaM2"
  | "perimeterM"
  | "sidewalkWidthM"
  | "freeSoilShare"
  | "zone"
  | "lstC"
  | "canopyCover"
  | "streetCanopy"
  | "buildingShade"
  | "windExposure"
  | "imperviousness"
  | "roofAreaM2"
>;

export function capacityOf(block: SimBlock): number {
  return plantingCapacity(block, centralCoefficients());
}

export function totalTrees(draft: ScenarioDraft): number {
  return Object.values(draft.trees).reduce((sum, n) => sum + (n ?? 0), 0);
}

/** Espécie que exige calçada mais larga do que a do quarteirão, sem solo livre para compensar. */
export function isUnsuitable(speciesId: SpeciesId, block: SimBlock): boolean {
  return SPECIES[speciesId].minSidewalkM > block.sidewalkWidthM && block.freeSoilShare < 0.05;
}

/** Espécies na ordem de indicação para o quarteirão; as inadequadas vão para o fim. */
export function orderedSpecies(block: SimBlock): SpeciesId[] {
  const highCanopy = block.zone === "comercial" || block.zone === "misto";
  const suggested = suggestSpecies(block.sidewalkWidthM, highCanopy).map((s) => s.id);
  const rest = SPECIES_IDS.filter((id) => !suggested.includes(id));
  return [...suggested, ...rest].sort(
    (a, b) => Number(isUnsuitable(a, block)) - Number(isUnsuitable(b, block)),
  );
}

function splitTrees(species: SpeciesId[], total: number): ScenarioDraft["trees"] {
  const trees: ScenarioDraft["trees"] = {};
  if (total <= 0 || species.length === 0) return trees;
  const base = Math.floor(total / species.length);
  species.forEach((id, i) => {
    const count = Math.min(MAX_TREES_PER_SPECIES, base + (i < total % species.length ? 1 : 0));
    if (count > 0) trees[id] = count;
  });
  return trees;
}

/**
 * Cenários prontos. "Recomendação do Ipê" segue o motor prescritivo do quarteirão:
 * só entra o que foi recomendado, na intensidade de um projeto tático plausível.
 */
export function presetDraft(
  preset: PresetId,
  block: SimBlock,
  diagnostics: Pick<BlockDiagnostics, "prescription">,
  horizonYears = EMPTY_DRAFT.horizonYears,
): ScenarioDraft {
  if (preset === "clear") return { ...EMPTY_DRAFT, horizonYears };
  const capacity = capacityOf(block);
  const recs = diagnostics.prescription.recommendations;
  const treeRec = recs.find((r) => r.type === "arborizacao");
  const fallback = orderedSpecies(block).filter((id) => !isUnsuitable(id, block));
  const recommendedSpecies = (
    treeRec?.suggestedSpecies.length ? treeRec.suggestedSpecies : fallback
  ).filter((id) => !isUnsuitable(id, block));
  const first = recommendedSpecies.slice(0, 1);

  if (preset === "trees") {
    return { ...EMPTY_DRAFT, horizonYears, trees: splitTrees(first, Math.round(capacity * 0.6)) };
  }
  if (preset === "full") {
    return {
      horizonYears,
      trees: splitTrees(recommendedSpecies.slice(0, 2), Math.round(capacity * 0.8)),
      permeable: 0.5,
      coolRoof: 0.7,
    };
  }
  // recommended
  const has = (type: string) => recs.some((r) => r.type === type);
  return {
    horizonYears,
    trees: treeRec || recs.length === 0 ? splitTrees(first, Math.round(capacity * 0.5)) : {},
    permeable: has("pavimento-permeavel") ? 0.4 : 0,
    coolRoof: has("telhado-frio") ? 0.6 : 0,
  };
}

export function toScenarioInput(blockId: string, draft: ScenarioDraft): SimulationScenarioInput {
  return {
    blockId,
    trees: SPECIES_IDS.filter((id) => (draft.trees[id] ?? 0) > 0).map((id) => ({
      speciesId: id,
      count: draft.trees[id] ?? 0,
    })),
    permeablePavementShare: Math.round(draft.permeable * 100) / 100,
    coolRoofShare: Math.round(draft.coolRoof * 100) / 100,
    horizonYears: draft.horizonYears,
  };
}

export function fromScenarioInput(input: SimulationScenarioInput): ScenarioDraft {
  const trees: ScenarioDraft["trees"] = {};
  for (const t of input.trees ?? []) trees[t.speciesId] = (trees[t.speciesId] ?? 0) + t.count;
  return {
    trees,
    permeable: input.permeablePavementShare ?? 0,
    coolRoof: input.coolRoofShare ?? 0,
    horizonYears: input.horizonYears ?? EMPTY_DRAFT.horizonYears,
  };
}

export function isEmptyScenario(input: SimulationScenarioInput): boolean {
  return (input.trees ?? []).length === 0 && !input.permeablePavementShare && !input.coolRoofShare;
}

/**
 * Entrada do cálculo ESG a partir do resultado: árvores limitadas à capacidade do
 * quarteirão (proporcionalmente por espécie) e áreas efetivamente convertidas.
 */
export function esgInputFrom(result: SimulationResult): EsgInput {
  const requested = result.scenario.trees.reduce((sum, t) => sum + t.count, 0);
  const factor = requested > 0 ? result.plantedTrees / requested : 0;
  return {
    trees: result.scenario.trees
      .map((t) => ({ speciesId: t.speciesId, count: Math.round(t.count * factor) }))
      .filter((t) => t.count > 0),
    permeableAreaM2: result.permeableAreaM2,
    coolRoofAreaM2: result.coolRoofAreaM2,
    horizonYears: result.scenario.horizonYears,
  };
}

/**
 * Variação relativa legível: acima de +100% vira multiplicador ("4,3×"), porque
 * percentuais enormes sobre uma base quase nula parecem erro para quem lê.
 */
export function formatRelativeChange(change: number): string {
  if (change > 1) return `${formatDecimal(1 + change)}×`;
  return formatPercent(change, { signed: true });
}
