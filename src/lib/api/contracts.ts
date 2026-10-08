import { z } from "zod";
import { adoptionSchema, newAdoptionSchema } from "@/domain/adoption/schema";
import { heatAlertSchema } from "@/domain/alerts/schema";
import type { BlockDiagnostics } from "@/domain/block/diagnostics";
import { blockSchema, zoneSchema } from "@/domain/block/schema";
import {
  citizenReportSchema,
  newCitizenReportSchema,
  reportCategorySchema,
  reportStatusSchema,
} from "@/domain/citizen/schema";
import type { EsgResult } from "@/domain/esg/esg";
import { esgInputSchema } from "@/domain/esg/esg";
import { IOT_STATUSES, iotNodeSchema, iotReadingSchema } from "@/domain/iot/schema";
import { IVTU_LEVELS, type IvtuResult } from "@/domain/ivtu/ivtu";
import { municipalitySchema } from "@/domain/municipality/types";
import { newPilotRequestSchema, pilotRequestReceiptSchema } from "@/domain/pilot/schema";
import {
  checklistItemIdSchema,
  CHECKLIST_STATUSES,
  fieldChecklistSchema,
} from "@/domain/prescription/checklist";
import {
  EXECUTION_LEVELS,
  INTERVENTION_TYPES,
  POTENTIAL_SITE_LABELS,
  type Recommendation,
} from "@/domain/prescription/engine";
import { speciesIdSchema } from "@/domain/prescription/species";
import { lngLatSchema, polygonSchema } from "@/domain/shared/geo";
import { saveScenarioSchema, savedScenarioSchema } from "@/domain/simulation/saved-scenario";
import { simulationScenarioSchema, type SimulationResult } from "@/domain/simulation/simulate";
import { dailyWeatherSchema } from "@/domain/thermal/diurnal";
import { THERMAL_STRESS_CATEGORIES } from "@/domain/thermal/stress";

/**
 * Contratos da API v1 (fonte única).
 * - Os Route Handlers tipam as respostas com estes schemas;
 * - os testes validam cada resposta real contra eles;
 * - `npm run openapi` gera docs/openapi.yaml a partir deles.
 * O backend FastAPI do roadmap implementa o mesmo contrato sem mudar o frontend.
 */

// ─────────────────────────── Comuns ───────────────────────────

export const LEGAL_SEAL =
  "Pré-diagnóstico automatizado para subsidiar a análise do profissional responsável.";

export const API_ERROR_CODES = [
  "bad_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "payload_too_large",
  "unsupported_media_type",
  "rate_limited",
  "internal",
] as const;

export const apiErrorSchema = z
  .object({
    error: z.object({
      code: z.enum(API_ERROR_CODES),
      message: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
      requestId: z.string(),
    }),
  })
  .meta({ id: "ApiError" });
export type ApiError = z.infer<typeof apiErrorSchema>;

export const pageMetaSchema = z
  .object({
    page: z.int().min(1),
    pageSize: z.int().min(1),
    total: z.int().min(0),
    totalPages: z.int().min(0),
  })
  .meta({ id: "PageMeta" });

/** Aviso de honestidade dos dados presente em toda resposta de diagnóstico. */
export const dataNoticeSchema = z
  .object({
    demo: z.boolean(),
    seal: z.string(),
  })
  .meta({ id: "DataNotice" });

/** Lista separada por vírgulas em query string → array. */
const csv = <T extends z.ZodType<unknown, string>>(item: T) =>
  z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    )
    .pipe(z.array(item));

const municipalityParam = z.string().regex(/^[a-z0-9-]+$/, "Município inválido");
const stressCategoryIdSchema = z.enum(
  THERMAL_STRESS_CATEGORIES.map((c) => c.id) as [string, ...string[]],
);
const ivtuLevelSchema = z.enum(IVTU_LEVELS);
const interventionTypeSchema = z.enum(INTERVENTION_TYPES);
const executionLevelSchema = z.enum(EXECUTION_LEVELS);
const potentialSiteSchema = z.enum(
  Object.keys(POTENTIAL_SITE_LABELS) as [
    keyof typeof POTENTIAL_SITE_LABELS,
    ...(keyof typeof POTENTIAL_SITE_LABELS)[],
  ],
);

// ─────────────────────────── Domínio → DTO ───────────────────────────

export const recommendationSchema = z
  .object({
    id: z.string(),
    type: interventionTypeSchema,
    variant: z.enum([
      "copa-elevada",
      "copa-ampla",
      "porte-compacto",
      "sombreamento-tatico",
      "jardim-de-chuva",
      "pavimento-drenante",
      "pintura-atermica",
    ]),
    level: executionLevelSchema,
    title: z.string(),
    actions: z.array(z.string()),
    rationale: z.array(z.string()),
    potentialSites: z.array(potentialSiteSchema),
    suggestedSpecies: z.array(speciesIdSchema),
    priority: z.number().min(0).max(100),
    confidence: z.number().min(0).max(1),
    checklist: z.array(checklistItemIdSchema),
  })
  .meta({ id: "Recommendation" });

export const ivtuResultSchema = z
  .object({
    score: z.number().min(0).max(100),
    level: ivtuLevelSchema,
    components: z.object({
      thermal: z.number().min(0).max(1),
      pedestrian: z.number().min(0).max(1),
      social: z.number().min(0).max(1),
    }),
  })
  .meta({ id: "IvtuResult" });

export const blockDiagnosticsSchema = z
  .object({
    blockId: z.string(),
    utciPeak: z.number(),
    utciPeakHour: z.int(),
    stressCategory: stressCategoryIdSchema,
    heatSeverity: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    airTempPeak: z.number(),
    meanRadiantTempPeak: z.number(),
    drainageRisk: z.number().min(0).max(1),
    ivtu: ivtuResultSchema,
    prescription: z.object({
      primary: recommendationSchema.nullable(),
      recommendations: z.array(recommendationSchema),
    }),
  })
  .meta({ id: "BlockDiagnostics" });

export const hourlyConditionsSchema = z
  .object({
    hour: z.int().min(0).max(23),
    airTemp: z.number(),
    relativeHumidity: z.number().min(0).max(1),
    windSpeed: z.number().min(0),
    solarRadiation: z.number().min(0),
    surfaceTemp: z.number(),
    meanRadiantTemp: z.number(),
    utci: z.number(),
    stressCategory: stressCategoryIdSchema,
  })
  .meta({ id: "HourlyConditions" });

const rangeSchema = z.object({
  central: z.number(),
  conservative: z.number(),
  optimistic: z.number(),
});

export const simulationResultSchema = z
  .object({
    scenario: simulationScenarioSchema,
    hourly: z.array(
      z.object({
        hour: z.int(),
        current: z.number(),
        simulated: z.number(),
        delta: z.number(),
        inPeakWindow: z.boolean(),
      }),
    ),
    peakUtciDelta: rangeSchema,
    maxHourlyDelta: z.number(),
    baselinePeakUtci: z.number(),
    simulatedPeakUtci: z.number(),
    evapotranspirationChange: z.number(),
    runoffChange: z.number(),
    retainedVolumeM3PerYear: z.number(),
    surfaceTempDelta: z.number(),
    canopyCover: z.object({ before: z.number(), after: z.number() }),
    streetCanopy: z.object({ before: z.number(), after: z.number() }),
    addedCanopyM2: z.number(),
    plantingCapacity: z.int(),
    plantedTrees: z.int(),
    permeableAreaM2: z.number(),
    coolRoofAreaM2: z.number(),
    warnings: z.array(z.string()),
  })
  .meta({ id: "SimulationResult" });

export const esgResultSchema = z
  .object({
    treesPlanted: z.int(),
    survivingTrees: z.int(),
    greenAreaM2: z.number(),
    co2SequesteredKg: z.number(),
    co2PerYearAtMaturityKg: z.number(),
    runoffAvoidedM3PerYear: z.number(),
    permeableAreaM2: z.number(),
    coolRoofAreaM2: z.number(),
    horizonYears: z.int(),
    premises: z.array(z.string()),
  })
  .meta({ id: "EsgResult" });

// Garantia em tempo de compilação: DTOs e tipos do domínio não podem divergir.
type Mutual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type ContractChecks = [
  Assert<Mutual<z.infer<typeof recommendationSchema>, Recommendation>>,
  Assert<Mutual<z.infer<typeof ivtuResultSchema>, IvtuResult>>,
  Assert<
    Mutual<
      Omit<z.infer<typeof blockDiagnosticsSchema>, "stressCategory">,
      Omit<BlockDiagnostics, "stressCategory">
    >
  >,
  Assert<Mutual<z.infer<typeof simulationResultSchema>, SimulationResult>>,
  Assert<Mutual<z.infer<typeof esgResultSchema>, EsgResult>>,
];

// ─────────────────────────── Municípios e alertas ───────────────────────────

export const municipalityListResponseSchema = z
  .object({ data: z.array(municipalitySchema.meta({ id: "Municipality" })) })
  .meta({ id: "MunicipalityListResponse" });

export const municipalityQuerySchema = z.object({ municipality: municipalityParam });

export const alertListResponseSchema = z
  .object({ data: z.array(heatAlertSchema.meta({ id: "HeatAlert" })) })
  .meta({ id: "AlertListResponse" });

// ─────────────────────────── Camadas térmicas (mapa) ───────────────────────────

export const mapLayersQuerySchema = z.object({
  municipality: municipalityParam,
  hour: z.coerce.number().int().min(8).max(18).default(14),
});

export const blockFeaturePropertiesSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    neighborhood: z.string(),
    street: z.string(),
    zone: zoneSchema,
    lstC: z.number(),
    /** UTCI na hora solicitada. */
    utci: z.number(),
    stressCategory: stressCategoryIdSchema,
    utciPeak: z.number(),
    ivtu: z.number(),
    ivtuLevel: ivtuLevelSchema,
    canopyCover: z.number(),
    imperviousness: z.number(),
    drainageRisk: z.number(),
    pedestrianFlow: z.number(),
    recommendation: z
      .object({
        type: interventionTypeSchema,
        variant: recommendationSchema.shape.variant,
        level: executionLevelSchema,
        title: z.string(),
      })
      .nullable(),
  })
  .meta({ id: "BlockFeatureProperties" });
export type BlockFeatureProperties = z.infer<typeof blockFeaturePropertiesSchema>;

export const mapLayersResponseSchema = z
  .object({
    type: z.literal("FeatureCollection"),
    features: z.array(
      z.object({
        type: z.literal("Feature"),
        id: z.string(),
        geometry: polygonSchema,
        properties: blockFeaturePropertiesSchema,
      }),
    ),
    meta: z.object({
      municipalityId: z.string(),
      hour: z.int(),
      weather: dailyWeatherSchema.meta({ id: "DailyWeather" }),
      ranges: z.object({
        lstC: z.tuple([z.number(), z.number()]),
        utci: z.tuple([z.number(), z.number()]),
      }),
      notice: dataNoticeSchema,
    }),
  })
  .meta({ id: "MapLayersResponse" });
export type MapLayersResponse = z.infer<typeof mapLayersResponseSchema>;

/**
 * UTCI de todos os quarteirões nas 11 horas (08h–18h) num único payload compacto:
 * o slider de horário do mapa troca as cores no cliente, sem rebaixar a geometria.
 */
export const utciByHourResponseSchema = z
  .object({
    municipalityId: z.string(),
    hours: z.array(z.int()),
    /** `values[blockId][i]` = UTCI (°C, 1 casa) na hora `hours[i]`. */
    values: z.record(z.string(), z.array(z.number())),
    notice: dataNoticeSchema,
  })
  .meta({ id: "UtciByHourResponse" });
export type UtciByHourResponse = z.infer<typeof utciByHourResponseSchema>;

// ─────────────────────────── Quarteirão ───────────────────────────

export const blockDetailResponseSchema = z
  .object({
    block: blockSchema.meta({ id: "Block" }),
    diagnostics: blockDiagnosticsSchema,
    hourly: z.array(hourlyConditionsSchema),
    weather: dailyWeatherSchema,
    notice: dataNoticeSchema,
  })
  .meta({ id: "BlockDetailResponse" });
export type BlockDetailResponse = z.infer<typeof blockDetailResponseSchema>;

export const checklistResponseSchema = z
  .object({
    checklist: fieldChecklistSchema.meta({ id: "FieldChecklist" }),
    applicable: z.array(z.object({ id: checklistItemIdSchema, label: z.string() })),
    progress: z.number().min(0).max(1),
  })
  .meta({ id: "ChecklistResponse" });

export const checklistUpdateSchema = z
  .object({
    items: z.partialRecord(checklistItemIdSchema, z.enum(CHECKLIST_STATUSES)),
    notes: z.string().max(2000).default(""),
  })
  .meta({ id: "ChecklistUpdate" });

// ─────────────────────────── Ranking IVTU ───────────────────────────

export const RANKING_SORTS = ["ivtu", "utci", "priority", "code"] as const;

export const rankingQuerySchema = z.object({
  municipality: municipalityParam,
  neighborhood: z.string().max(80).optional(),
  zones: csv(zoneSchema).optional(),
  ivtuLevels: csv(ivtuLevelSchema).optional(),
  executionLevel: executionLevelSchema.optional(),
  intervention: interventionTypeSchema.optional(),
  search: z.string().trim().max(80).optional(),
  sort: z.enum(RANKING_SORTS).default("ivtu"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type RankingQuery = z.input<typeof rankingQuerySchema>;
export type RankingParams = z.output<typeof rankingQuerySchema>;

export const rankingRowSchema = z
  .object({
    rank: z.int().min(1),
    id: z.string(),
    code: z.string(),
    neighborhood: z.string(),
    street: z.string(),
    zone: zoneSchema,
    centroid: lngLatSchema,
    ivtu: z.number(),
    ivtuLevel: ivtuLevelSchema,
    utciPeak: z.number(),
    stressCategory: stressCategoryIdSchema,
    drainageRisk: z.number(),
    canopyCover: z.number(),
    pedestrianFlow: z.number(),
    recommendation: recommendationSchema
      .pick({
        id: true,
        type: true,
        variant: true,
        level: true,
        title: true,
        priority: true,
        confidence: true,
      })
      .nullable(),
    additionalRecommendations: z.int().min(0),
  })
  .meta({ id: "RankingRow" });
export type RankingRow = z.infer<typeof rankingRowSchema>;

export const rankingResponseSchema = z
  .object({
    data: z.array(rankingRowSchema),
    meta: pageMetaSchema.extend({
      neighborhoods: z.array(z.string()),
      levelCounts: z.record(ivtuLevelSchema, z.int()),
      notice: dataNoticeSchema,
    }),
  })
  .meta({ id: "RankingResponse" });
export type RankingResponse = z.infer<typeof rankingResponseSchema>;

// ─────────────────────────── Simulação ───────────────────────────

export const whatIfRequestSchema = simulationScenarioSchema.meta({ id: "SimulationScenario" });

export const whatIfResponseSchema = z
  .object({
    block: z.object({
      id: z.string(),
      code: z.string(),
      street: z.string(),
      neighborhood: z.string(),
    }),
    result: simulationResultSchema,
    notice: dataNoticeSchema,
  })
  .meta({ id: "WhatIfResponse" });
export type WhatIfResponse = z.infer<typeof whatIfResponseSchema>;

export const saveScenarioRequestSchema = saveScenarioSchema.meta({ id: "SaveScenarioRequest" });
export const savedScenarioListResponseSchema = z
  .object({ data: z.array(savedScenarioSchema.meta({ id: "SavedScenario" })) })
  .meta({ id: "SavedScenarioListResponse" });

export const esgRequestSchema = esgInputSchema.meta({ id: "EsgInput" });

// ─────────────────────────── Ciência cidadã ───────────────────────────

export const citizenReportQuerySchema = z.object({
  municipality: municipalityParam.optional(),
  statuses: csv(reportStatusSchema).optional(),
  categories: csv(reportCategorySchema).optional(),
  since: z.iso.datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const citizenReportListResponseSchema = z
  .object({
    data: z.array(citizenReportSchema.meta({ id: "CitizenReport" })),
    meta: pageMetaSchema.extend({ statusCounts: z.record(reportStatusSchema, z.int()) }),
  })
  .meta({ id: "CitizenReportListResponse" });

export const newCitizenReportRequestSchema = newCitizenReportSchema.meta({
  id: "NewCitizenReport",
});
export const citizenReportStatusUpdateSchema = z
  .object({ status: reportStatusSchema })
  .meta({ id: "CitizenReportStatusUpdate" });

// ─────────────────────────── IoT ───────────────────────────

export const iotNodeSummarySchema = z
  .object({
    node: iotNodeSchema.meta({ id: "IotNode" }),
    status: z.enum(IOT_STATUSES),
    latest: iotReadingSchema.meta({ id: "IotReading" }).nullable(),
    /** Temperaturas das últimas 24 h (para sparkline). */
    sparkline: z.array(z.number()),
  })
  .meta({ id: "IotNodeSummary" });

export const iotNodeListResponseSchema = z
  .object({ data: z.array(iotNodeSummarySchema) })
  .meta({ id: "IotNodeListResponse" });

export const iotReadingsQuerySchema = z.object({
  hours: z.coerce.number().int().min(1).max(168).default(24),
});
export const iotReadingsResponseSchema = z
  .object({ data: z.array(iotReadingSchema) })
  .meta({ id: "IotReadingsResponse" });

export const calibrationResponseSchema = z
  .object({
    data: z.array(
      z.object({
        nodeId: z.string(),
        nodeCode: z.string(),
        timestamp: z.iso.datetime({ offset: true }),
        sensorTempC: z.number(),
        modelAirTempC: z.number(),
        modelUtci: z.number(),
        satelliteLstC: z.number(),
      }),
    ),
    stats: z.object({
      points: z.int(),
      /** Viés médio (sensor − modelo), °C. */
      bias: z.number(),
      rmse: z.number(),
      pearson: z.number(),
    }),
  })
  .meta({ id: "CalibrationResponse" });

// ─────────────────────────── Adote uma Ilha Verde ───────────────────────────

export const adoptionSummarySchema = z
  .object({
    adoption: adoptionSchema.meta({ id: "Adoption" }),
    ndviTrend30d: z.number(),
    esg: esgResultSchema,
    nextTask: adoptionSchema.shape.maintenance.element.nullable(),
    overdueTasks: z.int().min(0),
  })
  .meta({ id: "AdoptionSummary" });
export type AdoptionSummary = z.infer<typeof adoptionSummarySchema>;

export const adoptionListResponseSchema = z
  .object({ data: z.array(adoptionSummarySchema) })
  .meta({ id: "AdoptionListResponse" });

export const newAdoptionRequestSchema = newAdoptionSchema.meta({ id: "NewAdoption" });

// ─────────────────────────── Relatórios para editais ───────────────────────────

export const FUNDING_PROGRAM_IDS = [
  "fundo-clima",
  "ambiente-resiliente-rj",
  "fecam",
  "esg-corporativo",
] as const;
export const fundingProgramIdSchema = z.enum(FUNDING_PROGRAM_IDS);
export type FundingProgramId = z.infer<typeof fundingProgramIdSchema>;

export const fundingProgramSchema = z
  .object({
    id: fundingProgramIdSchema,
    name: z.string(),
    sponsor: z.string(),
    audience: z.enum(["publico", "privado"]),
    description: z.string(),
    emphasis: z.array(z.string()),
  })
  .meta({ id: "FundingProgram" });

export const fundingProgramListResponseSchema = z
  .object({ data: z.array(fundingProgramSchema) })
  .meta({ id: "FundingProgramListResponse" });

export const reportRequestSchema = z
  .object({
    programId: fundingProgramIdSchema,
    municipalityId: municipalityParam,
    projectName: z.string().trim().min(5, "Informe o nome do projeto").max(140),
    department: z.string().trim().min(3, "Informe a secretaria ou o responsável").max(140),
    estimatedBudget: z.number().positive("Informe um valor maior que zero").max(1_000_000_000),
    neighborhoods: z.array(z.string().min(1)).min(1, "Selecione ao menos um bairro").max(20),
    scenarioIds: z.array(z.string()).max(10).default([]),
  })
  .meta({ id: "ReportRequest" });
export type ReportRequest = z.input<typeof reportRequestSchema>;

const kpiSchema = z.object({ label: z.string(), value: z.string(), hint: z.string().optional() });

export const reportDocumentSchema = z
  .object({
    id: z.string(),
    generatedAt: z.iso.datetime({ offset: true }),
    title: z.string(),
    program: fundingProgramSchema,
    municipality: z.object({
      id: z.string(),
      name: z.string(),
      state: z.string(),
      population: z.int(),
    }),
    request: reportRequestSchema,
    diagnosis: z.object({
      blocksAnalyzed: z.int(),
      levelCounts: z.record(ivtuLevelSchema, z.int()),
      averageUtciPeak: z.number(),
      averageLst: z.number(),
      averageCanopy: z.number(),
      populationAffected: z.int(),
      elderlyAffected: z.int(),
      kpis: z.array(kpiSchema),
      priorityBlocks: z.array(rankingRowSchema),
      neighborhoods: z.array(
        z.object({
          name: z.string(),
          blocks: z.int(),
          averageIvtu: z.number(),
          averageUtciPeak: z.number(),
          criticalBlocks: z.int(),
        }),
      ),
    }),
    epidemiology: z.array(z.object({ statement: z.string(), source: z.string() })),
    interventions: z.array(
      z.object({
        type: interventionTypeSchema,
        label: z.string(),
        blocks: z.int(),
        tactical: z.int(),
        structural: z.int(),
      }),
    ),
    socioeconomic: z.array(z.object({ statement: z.string(), basis: z.string() })),
    scenarios: z.array(savedScenarioSchema),
    fieldValidation: z.object({ checklistsStarted: z.int(), checklistsCompleted: z.int() }),
    notices: z.array(z.string()),
    seal: z.string(),
  })
  .meta({ id: "ReportDocument" });
export type ReportDocument = z.infer<typeof reportDocumentSchema>;

// ─────────────────────────── Pedido de piloto ───────────────────────────

export const newPilotRequestRequestSchema = newPilotRequestSchema.meta({ id: "NewPilotRequest" });
export const pilotRequestReceiptResponseSchema = pilotRequestReceiptSchema.meta({
  id: "PilotRequestReceipt",
});
