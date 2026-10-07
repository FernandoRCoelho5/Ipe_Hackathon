import "server-only";
import {
  checklistFor,
  checklistProgress,
  CHECKLIST_ITEMS,
  type FieldChecklist,
} from "@/domain/prescription/checklist";
import type { SaveScenarioInput, SavedScenario } from "@/domain/simulation/saved-scenario";
import { saveScenarioSchema } from "@/domain/simulation/saved-scenario";
import { simulate, type SimulationScenarioInput } from "@/domain/simulation/simulate";
import type { WhatIfResponse } from "@/lib/api/contracts";
import { HttpError, NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { diagnoseBlockById, getReferenceWeather } from "./diagnostics";
import { DATA_NOTICE } from "./thermal-layers";

async function requireBlock(blockId: string) {
  const block = await getRepositories().blocks.getById(blockId);
  if (!block) throw new NotFoundError(`Quarteirão ${blockId}`);
  return block;
}

export async function runWhatIf(scenario: SimulationScenarioInput): Promise<WhatIfResponse> {
  const block = await requireBlock(scenario.blockId);
  const weather = await getReferenceWeather(block.municipalityId);
  return {
    block: {
      id: block.id,
      code: block.code,
      street: block.street,
      neighborhood: block.neighborhood,
    },
    result: simulate(block, weather, scenario),
    notice: DATA_NOTICE,
  };
}

/** Salva um cenário com o resumo congelado (para aparecer nos relatórios). */
export async function saveScenario(input: SaveScenarioInput): Promise<SavedScenario> {
  const parsed = saveScenarioSchema.parse(input);
  const block = await requireBlock(parsed.scenario.blockId);
  if (block.municipalityId !== parsed.municipalityId) {
    throw new HttpError(400, "bad_request", "O quarteirão não pertence ao município informado");
  }
  const { result } = await runWhatIf(parsed.scenario);
  return getRepositories().scenarios.save({
    ...parsed,
    summary: {
      blockCode: block.code,
      blockLabel: `${block.street} · ${block.neighborhood}`,
      peakUtciDelta: result.peakUtciDelta.central,
      peakUtciDeltaRange: [result.peakUtciDelta.conservative, result.peakUtciDelta.optimistic],
      runoffChange: result.runoffChange,
      evapotranspirationChange: result.evapotranspirationChange,
      plantedTrees: result.plantedTrees,
      permeableAreaM2: result.permeableAreaM2,
      coolRoofAreaM2: result.coolRoofAreaM2,
    },
  });
}

/** Checklist de campo do quarteirão, restrito aos itens das intervenções recomendadas. */
export async function getChecklist(blockId: string) {
  const { diagnostics } = await diagnoseBlockById(blockId);
  const types = diagnostics.prescription.recommendations.map((r) => r.type);
  const applicableIds = checklistFor(types.length > 0 ? types : ["arborizacao"]);
  const checklist = (await getRepositories().checklists.get(blockId)) ?? {
    blockId,
    items: {},
    notes: "",
  };
  return {
    checklist,
    applicable: applicableIds.map((id) => ({ id, label: CHECKLIST_ITEMS[id].label })),
    progress: checklistProgress(checklist, applicableIds),
  };
}

export async function updateChecklist(
  blockId: string,
  update: Pick<FieldChecklist, "items" | "notes">,
) {
  await requireBlock(blockId);
  await getRepositories().checklists.save({
    blockId,
    items: update.items,
    notes: update.notes,
  });
  return getChecklist(blockId);
}
