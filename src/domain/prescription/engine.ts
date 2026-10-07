import { formatDecimal, formatInteger, formatPercent } from "../../lib/format";
import type { Block } from "../block/schema";
import { clamp, normalize, round } from "../shared/math";
import { checklistFor, type ChecklistItemId } from "./checklist";
import { suggestSpecies, type SpeciesId } from "./species";

/**
 * Motor prescritivo: regras georreferenciadas explícitas.
 * A IA entra como APOIO (estimativas de superfície e de sensação térmica que alimentam
 * estas regras), nunca como decisora única. Cada recomendação traz o "por quê",
 * a confiança e o checklist de validação de campo.
 */

export const INTERVENTION_TYPES = ["arborizacao", "pavimento-permeavel", "telhado-frio"] as const;
export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export const INTERVENTION_LABELS: Record<InterventionType, string> = {
  arborizacao: "Arborização",
  "pavimento-permeavel": "Pavimento permeável",
  "telhado-frio": "Pintura atérmica / telhado frio",
};

export const EXECUTION_LEVELS = ["tatico", "estruturante"] as const;
export type ExecutionLevel = (typeof EXECUTION_LEVELS)[number];

export const EXECUTION_LEVEL_LABELS: Record<ExecutionLevel, string> = {
  tatico: "Tático (0–6 meses)",
  estruturante: "Estruturante (longo prazo)",
};

export type RecommendationVariant =
  | "copa-elevada"
  | "copa-ampla"
  | "porte-compacto"
  | "sombreamento-tatico"
  | "jardim-de-chuva"
  | "pavimento-drenante"
  | "pintura-atermica";

export const VARIANT_LABELS: Record<RecommendationVariant, string> = {
  "copa-elevada": "Arborização – Copa elevada",
  "copa-ampla": "Arborização – Copa ampla",
  "porte-compacto": "Arborização – Porte compacto",
  "sombreamento-tatico": "Sombreamento tático",
  "jardim-de-chuva": "Jardins de chuva",
  "pavimento-drenante": "Pavimento permeável",
  "pintura-atermica": "Pintura atérmica / telhado frio",
};

export const POTENTIAL_SITE_LABELS = {
  canteiros: "Canteiros existentes",
  pracas: "Praças",
  recuos: "Recuos frontais",
  "calcadas-largas": "Calçadas largas (> 2,4 m)",
  "faixa-de-servico": "Faixa de serviço da calçada",
  "vagas-de-estacionamento": "Vagas de estacionamento (parklets)",
  estacionamentos: "Estacionamentos e pátios",
  telhados: "Telhados e galpões",
} as const;
export type PotentialSite = keyof typeof POTENTIAL_SITE_LABELS;

export interface Recommendation {
  id: string;
  type: InterventionType;
  variant: RecommendationVariant;
  level: ExecutionLevel;
  title: string;
  actions: string[];
  /** Justificativas legíveis: o "por quê" da recomendação. */
  rationale: string[];
  potentialSites: PotentialSite[];
  suggestedSpecies: SpeciesId[];
  /** 0–100: urgência relativa, usada para ordenar recomendações e quarteirões. */
  priority: number;
  /** 0–1: força da evidência para esta recomendação. */
  confidence: number;
  checklist: ChecklistItemId[];
}

export interface PrescriptionContext {
  block: Pick<
    Block,
    | "id"
    | "zone"
    | "canopyCover"
    | "imperviousness"
    | "roofMetalShare"
    | "roofAreaM2"
    | "freeSoilShare"
    | "sidewalkWidthM"
    | "pedestrianFlow"
    | "lstC"
  >;
  utciPeak: number;
  drainageRisk: number;
}

export const PRESCRIPTION_RULES = {
  /** Meta de cobertura arbórea: 30% (estudo Lancet, 93 cidades europeias). */
  canopyTarget: 0.3,
  /** Calçada mínima para plantio em via (m); abaixo disso, só canteiros, praças ou recuos. */
  minSidewalkForTrees: 2,
  /** Calçada que comporta plantio sem obra de alargamento (m). */
  sidewalkForTacticalPlanting: 2.4,
  minFreeSoilForTrees: 0.05,
  freeSoilForTacticalPlanting: 0.1,
  /** Fluxo de pedestres que caracteriza corredor comercial (pedestres/h). */
  commercialCorridorFlow: 600,
  permeable: { minImperviousness: 0.7, minDrainageRisk: 0.45, structuralDrainageRisk: 0.65 },
  coolRoof: { minMetalShare: 0.35, industrialMinRoofM2: 4000 },
} as const;

const R = PRESCRIPTION_RULES;

function confidenceFrom(margins: number[], base = 0.58): number {
  const margin = margins.reduce((a, b) => a + b, 0) / Math.max(1, margins.length);
  return round(clamp(base + 0.34 * margin, 0.5, 0.92), 2);
}

function treeRecommendation(ctx: PrescriptionContext): Recommendation | null {
  const { block, utciPeak } = ctx;
  if (block.canopyCover >= R.canopyTarget) return null;

  const hasSidewalk = block.sidewalkWidthM >= R.minSidewalkForTrees;
  const hasSoil = block.freeSoilShare >= R.minFreeSoilForTrees || block.zone === "verde";
  const isCommercialCorridor =
    block.zone === "comercial" ||
    (block.zone === "misto" && block.pedestrianFlow >= R.commercialCorridorFlow);

  const need = normalize(R.canopyTarget - block.canopyCover, 0, R.canopyTarget);
  const heat = normalize(utciPeak, 32, 46);
  const exposure = normalize(Math.log1p(block.pedestrianFlow), 0, Math.log1p(1500));

  const canopyPct = formatPercent(block.canopyCover);
  const rationale = [
    `Cobertura arbórea de ${canopyPct}, abaixo da referência de 30% associada à redução de mortes por calor.`,
    `Sensação térmica estimada de ${formatDecimal(utciPeak)} °C no pico solar.`,
  ];
  if (block.pedestrianFlow >= 300) {
    rationale.push(
      `Cerca de ${formatInteger(block.pedestrianFlow)} pedestres por hora no pico expostos ao sol.`,
    );
  }

  // Sem calçada nem solo livre: só cabe sombreamento tático em corredores movimentados.
  if (!hasSidewalk && !hasSoil) {
    if (!isCommercialCorridor || heat < 0.25) return null;
    rationale.push(
      `Calçada de ${formatDecimal(block.sidewalkWidthM)} m não comporta plantio sem obra; sombreamento provisório atende o pico de calor.`,
    );
    return {
      id: `${block.id}:arborizacao:sombreamento-tatico`,
      type: "arborizacao",
      variant: "sombreamento-tatico",
      level: "tatico",
      title: VARIANT_LABELS["sombreamento-tatico"],
      actions: [
        "Vasos de grande porte com espécies de copa compacta",
        "Parklets sombreados em vagas de estacionamento",
        "Coberturas leves em pontos de ônibus",
      ],
      rationale,
      potentialSites: ["vagas-de-estacionamento", "faixa-de-servico"],
      suggestedSpecies: suggestSpecies(R.minSidewalkForTrees, false)
        .slice(0, 2)
        .map((s) => s.id),
      priority: round(100 * (0.35 * need + 0.4 * heat + 0.25 * exposure), 1),
      confidence: confidenceFrom([heat, exposure], 0.52),
      checklist: checklistFor(["arborizacao"]),
    };
  }

  const tactical =
    block.sidewalkWidthM >= R.sidewalkForTacticalPlanting ||
    block.freeSoilShare >= R.freeSoilForTacticalPlanting ||
    block.zone === "verde";

  const variant: RecommendationVariant = isCommercialCorridor
    ? "copa-elevada"
    : block.sidewalkWidthM < R.sidewalkForTacticalPlanting && block.zone !== "verde"
      ? "porte-compacto"
      : "copa-ampla";

  if (isCommercialCorridor) {
    rationale.push(
      "Zona comercial densa: espécies de copa elevada não obstruem fachadas, vitrines e tráfego.",
    );
  }
  rationale.push(
    tactical
      ? "Há canteiros, recuos ou calçada larga para plantio imediato com mudas de maior porte."
      : "O plantio exige abrir canteiros ou alargar a calçada (obra de médio prazo).",
  );

  const potentialSites: PotentialSite[] = [];
  if (block.zone === "verde") potentialSites.push("pracas");
  if (block.freeSoilShare >= R.minFreeSoilForTrees) potentialSites.push("canteiros", "recuos");
  if (block.sidewalkWidthM >= R.sidewalkForTacticalPlanting) potentialSites.push("calcadas-largas");
  else if (hasSidewalk) potentialSites.push("faixa-de-servico");

  const actions = tactical
    ? [
        "Plantio de mudas de maior porte (≥ 2,5 m) nos locais potenciais",
        "Mutirão de plantio com comércio e moradores",
        "Irrigação assistida nos primeiros 24 meses",
      ]
    : [
        "Abertura de canteiros contínuos na faixa de serviço",
        "Corredor verde integrado ao plano de arborização",
        "Compatibilização com redes e fiação antes da obra",
      ];

  const sidewalkMargin = normalize(block.sidewalkWidthM, R.minSidewalkForTrees, 4);
  return {
    id: `${block.id}:arborizacao:${variant}`,
    type: "arborizacao",
    variant,
    level: tactical ? "tatico" : "estruturante",
    title: VARIANT_LABELS[variant],
    actions,
    rationale,
    potentialSites: [...new Set(potentialSites)],
    suggestedSpecies: suggestSpecies(block.sidewalkWidthM, isCommercialCorridor)
      .slice(0, 3)
      .map((s) => s.id),
    priority: round(100 * (0.45 * need + 0.35 * heat + 0.2 * exposure), 1),
    confidence: confidenceFrom([need, heat, Math.max(sidewalkMargin, block.freeSoilShare * 4)]),
    checklist: checklistFor(["arborizacao"]),
  };
}

function permeableRecommendation(ctx: PrescriptionContext): Recommendation | null {
  const { block, drainageRisk, utciPeak } = ctx;
  const rules = R.permeable;
  if (block.imperviousness < rules.minImperviousness || drainageRisk < rules.minDrainageRisk) {
    return null;
  }
  const structural = drainageRisk >= rules.structuralDrainageRisk;
  const variant: RecommendationVariant = structural ? "pavimento-drenante" : "jardim-de-chuva";
  const imperv = normalize(block.imperviousness, rules.minImperviousness, 1);
  const heat = normalize(utciPeak, 32, 46);
  const flood = normalize(drainageRisk, rules.minDrainageRisk, 0.8);

  return {
    id: `${block.id}:pavimento-permeavel:${variant}`,
    type: "pavimento-permeavel",
    variant,
    level: structural ? "estruturante" : "tatico",
    title: VARIANT_LABELS[variant],
    actions: structural
      ? [
          "Substituição do pavimento por piso drenante em calçadas e estacionamentos",
          "Revisão da microdrenagem (bocas de lobo e galerias)",
          "Valas de infiltração nos pontos de acúmulo",
        ]
      : [
          "Jardins de chuva e biovaletas nos pontos de alagamento",
          "Piso drenante nas calçadas com reforma já programada",
        ],
    rationale: [
      `Superfície ${formatPercent(block.imperviousness)} impermeável: aquece a rua e acelera o escoamento.`,
      `Risco de drenagem ${structural ? "alto" : "moderado"} (${formatPercent(drainageRisk)}), por proximidade do rio e relevo.`,
      "Calor e alagamento no mesmo quarteirão: a mesma intervenção trata os dois.",
    ],
    potentialSites: ["estacionamentos", "faixa-de-servico"],
    suggestedSpecies: [],
    priority: round(100 * (0.55 * flood + 0.25 * imperv + 0.2 * heat), 1),
    confidence: confidenceFrom([normalize(drainageRisk, rules.minDrainageRisk, 1), imperv]),
    checklist: checklistFor(["pavimento-permeavel"]),
  };
}

function coolRoofRecommendation(ctx: PrescriptionContext): Recommendation | null {
  const { block } = ctx;
  const rules = R.coolRoof;
  const metalHeavy = block.roofMetalShare >= rules.minMetalShare;
  const bigIndustrial =
    block.zone === "industrial" && block.roofAreaM2 >= rules.industrialMinRoofM2;
  if (!metalHeavy && !bigIndustrial) return null;

  const metal = normalize(block.roofMetalShare, 0.2, 0.9);
  const surfaceHeat = normalize(block.lstC, 36, 52);
  const scale = normalize(block.roofAreaM2, 1000, 20000);

  return {
    id: `${block.id}:telhado-frio:pintura-atermica`,
    type: "telhado-frio",
    variant: "pintura-atermica",
    level: "tatico",
    title: VARIANT_LABELS["pintura-atermica"],
    actions: [
      "Pintura atérmica de alta refletância em telhados metálicos e de fibrocimento",
      "Priorizar galpões, escolas e unidades de saúde",
    ],
    rationale: [
      `${formatPercent(block.roofMetalShare)} da cobertura é metálica ou de fibrocimento.`,
      `Temperatura de superfície de ${formatDecimal(block.lstC)} °C na passagem do satélite.`,
      "Execução rápida e de baixo custo: reduz a carga térmica sobre o entorno e o interior.",
    ],
    potentialSites: ["telhados"],
    suggestedSpecies: [],
    priority: round(100 * (0.5 * metal + 0.3 * surfaceHeat + 0.2 * scale), 1),
    confidence: confidenceFrom([metal, surfaceHeat], 0.62),
    checklist: checklistFor(["telhado-frio"]),
  };
}

export interface Prescription {
  /** Recomendação principal (maior prioridade) ou `null` quando nenhuma regra se aplica. */
  primary: Recommendation | null;
  recommendations: Recommendation[];
}

export function prescribe(ctx: PrescriptionContext): Prescription {
  const recommendations = [
    treeRecommendation(ctx),
    permeableRecommendation(ctx),
    coolRoofRecommendation(ctx),
  ]
    .filter((r): r is Recommendation => r !== null)
    .sort((a, b) => b.priority - a.priority);
  return { primary: recommendations[0] ?? null, recommendations };
}
