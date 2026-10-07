import { describe, expect, it } from "vitest";
import { computeEsgImpact } from "../esg/esg";
import { SPECIES_IDS } from "../prescription/species";
import { createRng } from "../shared/random";
import { HOT_DAY, makeBlock } from "../test-fixtures";
import { centralCoefficients, SIMULATION_COEFFICIENTS } from "./coefficients";
import { saveScenarioSchema } from "./saved-scenario";
import {
  crownGrowthFactor,
  plantingCapacity,
  simulate,
  simulationScenarioSchema,
} from "./simulate";

const block = makeBlock();

describe("simulador what-if", () => {
  it("cenário vazio não altera nada", () => {
    const r = simulate(block, HOT_DAY, { blockId: block.id });
    expect(r.peakUtciDelta.central).toBe(0);
    expect(r.hourly.every((h) => h.delta === 0)).toBe(true);
    expect(r.runoffChange).toBe(0);
    expect(r.evapotranspirationChange).toBe(0);
  });

  it("árvores, pavimento permeável e pintura atérmica reduzem a sensação térmica no pico", () => {
    const r = simulate(block, HOT_DAY, {
      blockId: block.id,
      trees: [{ speciesId: "ipe-amarelo", count: 20 }],
      permeablePavementShare: 0.3,
      coolRoofShare: 0.5,
    });
    expect(r.peakUtciDelta.central).toBeLessThan(-1);
    expect(r.simulatedPeakUtci).toBeLessThan(r.baselinePeakUtci);
    expect(r.runoffChange).toBeLessThan(0);
    expect(r.retainedVolumeM3PerYear).toBeGreaterThan(0);
    expect(r.evapotranspirationChange).toBeGreaterThan(0);
    expect(r.surfaceTempDelta).toBeLessThan(0);
    expect(r.hourly).toHaveLength(11);
    expect(r.hourly.filter((h) => h.inPeakWindow).map((h) => h.hour)).toEqual([11, 12, 13, 14, 15]);
  });

  it("apresenta faixa de incerteza ordenada: conservador ≥ central ≥ otimista", () => {
    const r = simulate(block, HOT_DAY, {
      blockId: block.id,
      trees: [{ speciesId: "oiti", count: 25 }],
    });
    expect(r.peakUtciDelta.conservative).toBeGreaterThanOrEqual(r.peakUtciDelta.central);
    expect(r.peakUtciDelta.central).toBeGreaterThanOrEqual(r.peakUtciDelta.optimistic);
    expect(r.peakUtciDelta.conservative).toBeLessThan(0);
  });

  it("propriedade: nenhuma intervenção aquece e nenhum valor sai de faixas físicas", () => {
    const rng = createRng(2026);
    for (let i = 0; i < 150; i++) {
      const b = makeBlock({
        lstC: rng.range(26, 52),
        canopyCover: rng.range(0, 0.7),
        streetCanopy: rng.range(0, 0.7),
        imperviousness: rng.range(0.2, 0.98),
        roofAreaM2: rng.range(0, 9000),
        freeSoilShare: rng.range(0, 0.4),
        sidewalkWidthM: rng.range(1, 4),
        windExposure: rng.range(0.5, 1.1),
      });
      const r = simulate(b, HOT_DAY, {
        blockId: b.id,
        trees: [{ speciesId: rng.pick(SPECIES_IDS), count: rng.int(0, 300) }],
        permeablePavementShare: rng.next(),
        coolRoofShare: rng.next(),
        horizonYears: rng.int(1, 20),
      });
      for (const h of r.hourly) expect(h.delta).toBeLessThanOrEqual(1e-9);
      expect(r.peakUtciDelta.optimistic).toBeLessThanOrEqual(1e-9);
      expect(r.canopyCover.after).toBeLessThanOrEqual(0.95);
      expect(r.canopyCover.after).toBeGreaterThanOrEqual(r.canopyCover.before);
      expect(r.streetCanopy.after).toBeLessThanOrEqual(0.95);
      expect(r.runoffChange).toBeLessThanOrEqual(1e-9);
      expect(r.runoffChange).toBeGreaterThanOrEqual(-1);
      expect(Number.isFinite(r.evapotranspirationChange)).toBe(true);
      expect(r.plantedTrees).toBeLessThanOrEqual(Math.max(r.plantingCapacity, 0));
    }
  });

  it("mais árvores nunca pioram o resultado (até a capacidade)", () => {
    let previous = 0;
    for (const count of [0, 5, 10, 20, 40]) {
      const r = simulate(block, HOT_DAY, {
        blockId: block.id,
        trees: [{ speciesId: "sibipiruna", count }],
      });
      expect(r.peakUtciDelta.central).toBeLessThanOrEqual(previous + 1e-9);
      previous = r.peakUtciDelta.central;
    }
  });

  it("limita o efeito à capacidade de plantio e avisa", () => {
    const capacity = plantingCapacity(block, centralCoefficients());
    const r = simulate(block, HOT_DAY, {
      blockId: block.id,
      trees: [{ speciesId: "ipe-amarelo", count: capacity + 100 }],
    });
    expect(r.plantedTrees).toBe(capacity);
    expect(r.warnings[0]).toMatch(/comporta cerca de/);
  });

  it("avisa quando a espécie pede calçada mais larga que a disponível", () => {
    const narrow = makeBlock({ sidewalkWidthM: 2.1, freeSoilShare: 0.01 });
    const r = simulate(narrow, HOT_DAY, {
      blockId: narrow.id,
      trees: [{ speciesId: "pau-ferro", count: 5 }],
    });
    expect(r.warnings.some((w) => w.includes("Pau-ferro"))).toBe(true);
  });

  it("avisa quando quase não há piso impermeável para converter", () => {
    const green = makeBlock({ imperviousness: 0.2, roofAreaM2: 1700 });
    const r = simulate(green, HOT_DAY, { blockId: green.id, permeablePavementShare: 0.5 });
    expect(r.warnings.some((w) => w.includes("piso impermeável"))).toBe(true);
  });

  it("copa cresce com os anos e se aproxima da maturidade", () => {
    expect(crownGrowthFactor(0, 4.5)).toBe(0);
    expect(crownGrowthFactor(3, 4.5)).toBeCloseTo(0.49, 2);
    expect(crownGrowthFactor(10, 4.5)).toBeGreaterThan(0.88);
    expect(crownGrowthFactor(-2, 4.5)).toBe(0);
  });

  it("valida o cenário e documenta todos os coeficientes", () => {
    expect(
      simulationScenarioSchema.safeParse({ blockId: "x", permeablePavementShare: 1.2 }).success,
    ).toBe(false);
    expect(
      simulationScenarioSchema.safeParse({
        blockId: "x",
        trees: [{ speciesId: "eucalipto", count: 3 }],
      }).success,
    ).toBe(false);
    expect(
      saveScenarioSchema.safeParse({ name: "ab", municipalityId: "vr", scenario: { blockId: "x" } })
        .success,
    ).toBe(false);
    for (const c of Object.values(SIMULATION_COEFFICIENTS)) {
      expect(c.justification.length).toBeGreaterThan(20);
      expect(c.unit.length).toBeGreaterThan(0);
    }
  });
});

describe("retorno ESG", () => {
  it("calcula área verde, CO₂ e escoamento evitado com premissas explícitas", () => {
    const r = computeEsgImpact({
      trees: [
        { speciesId: "ipe-amarelo", count: 20 },
        { speciesId: "sibipiruna", count: 10 },
      ],
      permeableAreaM2: 500,
      horizonYears: 10,
    });
    expect(r.treesPlanted).toBe(30);
    expect(r.survivingTrees).toBe(26);
    expect(r.greenAreaM2).toBeGreaterThan(0);
    expect(r.co2PerYearAtMaturityKg).toBe(Math.round((20 * 15 + 10 * 25) * 0.85));
    expect(r.co2SequesteredKg).toBeLessThan(r.co2PerYearAtMaturityKg * 10);
    expect(r.runoffAvoidedM3PerYear).toBe(385);
    expect(r.premises.at(-1)).toBe("Estimativas a validar no piloto.");
  });

  it("sem intervenções, impacto zero", () => {
    const r = computeEsgImpact({});
    expect(r).toMatchObject({
      treesPlanted: 0,
      greenAreaM2: 0,
      co2SequesteredKg: 0,
      runoffAvoidedM3PerYear: 0,
    });
  });
});
