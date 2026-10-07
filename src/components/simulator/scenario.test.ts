import { describe, expect, it } from "vitest";
import { diagnoseBlock } from "@/domain/block/diagnostics";
import { SPECIES } from "@/domain/prescription/species";
import { simulate } from "@/domain/simulation/simulate";
import { HOT_DAY, makeBlock } from "@/domain/test-fixtures";
import {
  capacityOf,
  esgInputFrom,
  formatRelativeChange,
  fromScenarioInput,
  isEmptyScenario,
  isUnsuitable,
  MAX_TREES_PER_SPECIES,
  orderedSpecies,
  presetDraft,
  toScenarioInput,
  totalTrees,
} from "./scenario";

const block = makeBlock();
const diagnostics = diagnoseBlock(block, HOT_DAY);

describe("cenários do simulador", () => {
  it("o cenário zerado não tem intervenção", () => {
    const input = toScenarioInput(block.id, presetDraft("clear", block, diagnostics));
    expect(isEmptyScenario(input)).toBe(true);
  });

  it("a recomendação do Ipê só usa intervenções recomendadas e respeita a capacidade", () => {
    const draft = presetDraft("recommended", block, diagnostics);
    const types = diagnostics.prescription.recommendations.map((r) => r.type);
    expect(totalTrees(draft) > 0).toBe(types.includes("arborizacao"));
    expect(draft.permeable > 0).toBe(types.includes("pavimento-permeavel"));
    expect(draft.coolRoof > 0).toBe(types.includes("telhado-frio"));
    expect(totalTrees(draft)).toBeLessThanOrEqual(capacityOf(block));
  });

  it("o pacote completo combina árvores, piso permeável e telhado frio", () => {
    const draft = presetDraft("full", block, diagnostics, 15);
    expect(totalTrees(draft)).toBeGreaterThan(0);
    expect(draft).toMatchObject({ permeable: 0.5, coolRoof: 0.7, horizonYears: 15 });
    for (const count of Object.values(draft.trees)) {
      expect(count).toBeLessThanOrEqual(MAX_TREES_PER_SPECIES);
    }
  });

  it("nunca sugere espécie inadequada à calçada nos cenários prontos", () => {
    const narrow = makeBlock({ sidewalkWidthM: 1.8, freeSoilShare: 0.01, zone: "residencial" });
    const draft = presetDraft("full", narrow, diagnoseBlock(narrow, HOT_DAY));
    for (const id of Object.keys(draft.trees) as (keyof typeof SPECIES)[]) {
      expect(isUnsuitable(id, narrow)).toBe(false);
    }
    const order = orderedSpecies(narrow);
    const firstUnsuitable = order.findIndex((id) => isUnsuitable(id, narrow));
    expect(order.slice(firstUnsuitable).every((id) => isUnsuitable(id, narrow))).toBe(true);
  });

  it("ida e volta entre rascunho e entrada da API", () => {
    const draft = presetDraft("full", block, diagnostics);
    expect(fromScenarioInput(toScenarioInput(block.id, draft))).toEqual(draft);
  });

  it("a entrada ESG limita as árvores ao que foi efetivamente plantado", () => {
    const capacity = capacityOf(block);
    const result = simulate(block, HOT_DAY, {
      blockId: block.id,
      trees: [{ speciesId: "oiti", count: Math.min(300, capacity * 3) }],
      permeablePavementShare: 0.3,
    });
    const esg = esgInputFrom(result);
    const planted = (esg.trees ?? []).reduce((sum, t) => sum + t.count, 0);
    expect(planted).toBe(result.plantedTrees);
    expect(esg.permeableAreaM2).toBe(result.permeableAreaM2);
  });

  it("mostra variações grandes como multiplicador", () => {
    expect(formatRelativeChange(3.32)).toBe("4,3×");
    expect(formatRelativeChange(0.18)).toBe("+18%");
    expect(formatRelativeChange(-0.12)).toBe("−12%");
  });
});
