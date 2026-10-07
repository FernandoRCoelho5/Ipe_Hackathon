import { describe, expect, it } from "vitest";
import { makeBlock } from "../test-fixtures";
import { checklistFor, checklistProgress, fieldChecklistSchema } from "./checklist";
import { prescribe, type PrescriptionContext } from "./engine";
import { crownAreaM2, SPECIES, suggestSpecies } from "./species";

const ctx = (
  blockOverrides: Partial<ReturnType<typeof makeBlock>> = {},
  extra: Partial<PrescriptionContext> = {},
) => ({
  block: makeBlock(blockOverrides),
  utciPeak: 42,
  drainageRisk: 0.3,
  ...extra,
});

describe("motor prescritivo", () => {
  it("corredor comercial sem copa e com calçada larga → arborização de copa elevada, tática", () => {
    const { primary } = prescribe(ctx());
    expect(primary).toMatchObject({
      type: "arborizacao",
      variant: "copa-elevada",
      level: "tatico",
    });
    expect(primary?.rationale.some((r) => r.includes("30%"))).toBe(true);
    expect(primary?.potentialSites).toContain("calcadas-largas");
    expect(primary?.suggestedSpecies.every((id) => SPECIES[id].highCanopy)).toBe(true);
    expect(primary?.checklist).toContain("fiacao-aerea");
  });

  it("não recomenda árvores onde a cobertura já atinge a meta de 30%", () => {
    const { recommendations } = prescribe(ctx({ canopyCover: 0.35 }));
    expect(recommendations.find((r) => r.type === "arborizacao")).toBeUndefined();
  });

  it("calçada estreita sem solo livre em zona comercial → sombreamento tático", () => {
    const { primary } = prescribe(ctx({ sidewalkWidthM: 1.4, freeSoilShare: 0.01 }));
    expect(primary).toMatchObject({ variant: "sombreamento-tatico", level: "tatico" });
    expect(primary?.potentialSites).toContain("vagas-de-estacionamento");
  });

  it("calçada estreita sem solo livre em zona residencial → nenhuma arborização indicada", () => {
    const { recommendations } = prescribe(
      ctx({ zone: "residencial", sidewalkWidthM: 1.4, freeSoilShare: 0.01, pedestrianFlow: 80 }),
    );
    expect(recommendations.find((r) => r.type === "arborizacao")).toBeUndefined();
  });

  it("calçada intermediária residencial → porte compacto e obra estruturante", () => {
    const { recommendations } = prescribe(
      ctx({ zone: "residencial", sidewalkWidthM: 2.1, freeSoilShare: 0.06, pedestrianFlow: 100 }),
    );
    const trees = recommendations.find((r) => r.type === "arborizacao");
    expect(trees).toMatchObject({ variant: "porte-compacto", level: "estruturante" });
  });

  it("alta impermeabilização com risco de drenagem → pavimento permeável (estruturante se risco alto)", () => {
    const moderate = prescribe(ctx({}, { drainageRisk: 0.5 })).recommendations.find(
      (r) => r.type === "pavimento-permeavel",
    );
    const high = prescribe(ctx({}, { drainageRisk: 0.85 })).recommendations.find(
      (r) => r.type === "pavimento-permeavel",
    );
    expect(moderate).toMatchObject({ variant: "jardim-de-chuva", level: "tatico" });
    expect(high).toMatchObject({ variant: "pavimento-drenante", level: "estruturante" });
    expect(
      prescribe(ctx({ imperviousness: 0.5 }, { drainageRisk: 0.9 })).recommendations.some(
        (r) => r.type === "pavimento-permeavel",
      ),
    ).toBe(false);
  });

  it("galpões metálicos → pintura atérmica tática", () => {
    const { recommendations } = prescribe(
      ctx({
        zone: "industrial",
        roofMetalShare: 0.8,
        roofAreaM2: 18000,
        lstC: 49,
        canopyCover: 0.5,
      }),
    );
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({ type: "telhado-frio", level: "tatico" });
  });

  it("ordena por prioridade e mantém prioridade e confiança em faixas válidas", () => {
    const { recommendations, primary } = prescribe(
      ctx({ roofMetalShare: 0.6 }, { drainageRisk: 0.8, utciPeak: 45 }),
    );
    expect(recommendations.length).toBe(3);
    expect(primary).toBe(recommendations[0]);
    for (let i = 1; i < recommendations.length; i++) {
      expect(recommendations[i - 1].priority).toBeGreaterThanOrEqual(recommendations[i].priority);
    }
    for (const r of recommendations) {
      expect(r.priority).toBeGreaterThanOrEqual(0);
      expect(r.priority).toBeLessThanOrEqual(100);
      expect(r.confidence).toBeGreaterThanOrEqual(0.5);
      expect(r.confidence).toBeLessThanOrEqual(0.92);
      expect(r.rationale.length).toBeGreaterThan(0);
    }
  });

  it("praça sem copa suficiente recebe arborização de copa ampla", () => {
    const { primary } = prescribe(
      ctx({
        zone: "verde",
        canopyCover: 0.15,
        sidewalkWidthM: 1.5,
        freeSoilShare: 0.5,
        pedestrianFlow: 200,
        imperviousness: 0.3,
      }),
    );
    expect(primary).toMatchObject({ variant: "copa-ampla", level: "tatico" });
    expect(primary?.potentialSites).toContain("pracas");
  });
});

describe("espécies e checklist", () => {
  it("calcula área de copa e respeita a largura mínima de calçada", () => {
    expect(crownAreaM2(SPECIES.sibipiruna)).toBeCloseTo(78.54, 1);
    const narrow = suggestSpecies(1.8, false);
    expect(narrow.every((s) => s.minSidewalkM <= 1.8)).toBe(true);
    expect(suggestSpecies(4, true)[0].highCanopy).toBe(true);
  });

  it("monta o checklist por tipo de intervenção e mede o progresso", () => {
    const items = checklistFor(["telhado-frio"]);
    expect(items).toEqual(["estrutura-telhado", "responsavel-tecnico"]);
    expect(checklistProgress({ items: {} }, items)).toBe(0);
    expect(checklistProgress({ items: { "estrutura-telhado": "conforme" } }, items)).toBe(0.5);
    expect(checklistProgress({ items: {} }, [])).toBe(1);
  });

  it("valida checklist parcial e rejeita status desconhecido", () => {
    expect(
      fieldChecklistSchema.safeParse({ blockId: "vr-0001", items: { "fiacao-aerea": "conforme" } })
        .success,
    ).toBe(true);
    expect(
      fieldChecklistSchema.safeParse({ blockId: "vr-0001", items: { "fiacao-aerea": "talvez" } })
        .success,
    ).toBe(false);
  });
});
