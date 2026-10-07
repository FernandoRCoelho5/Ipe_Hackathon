import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import type { Zone } from "@/domain/block/schema";
import type { EsgInput } from "@/domain/esg/esg";
import type { IvtuLevel } from "@/domain/ivtu/ivtu";
import type { SaveScenarioInput } from "@/domain/simulation/saved-scenario";
import type { SimulationScenarioInput } from "@/domain/simulation/simulate";
import { apiClient } from "./client";
import type {
  alertListResponseSchema,
  BlockDetailResponse,
  checklistResponseSchema,
  checklistUpdateSchema,
  esgResultSchema,
  MapLayersResponse,
  RankingQuery,
  RankingResponse,
  savedScenarioListResponseSchema,
  UtciByHourResponse,
  WhatIfResponse,
} from "./contracts";

/**
 * Consultas da API v1 para o TanStack Query: chave, função e política de cache juntas.
 * As telas usam `useQuery(queries.x(...))`; mutações invalidam pelas mesmas chaves.
 */

export type AlertListResponse = z.infer<typeof alertListResponseSchema>;
export type ChecklistResponse = z.infer<typeof checklistResponseSchema>;
export type ChecklistUpdate = z.input<typeof checklistUpdateSchema>;
export type SavedScenarioListResponse = z.infer<typeof savedScenarioListResponseSchema>;
export type EsgResultResponse = z.infer<typeof esgResultSchema>;

/** Filtros do ranking no cliente: listas como arrays (a API recebe CSV). */
export type RankingFilters = Omit<RankingQuery, "page" | "pageSize" | "zones" | "ivtuLevels"> & {
  zones?: readonly Zone[];
  ivtuLevels?: readonly IvtuLevel[];
  page?: number;
  pageSize?: number;
};

/** Dados demonstrativos mudam no máximo por hora: cinco minutos evita refetch à toa. */
const STALE = 5 * 60_000;

export const queryKeys = {
  municipality: (id: string) => ["municipality", id] as const,
  block: (id: string) => ["block", id] as const,
  checklist: (blockId: string) => ["block", blockId, "checklist"] as const,
  scenarios: (municipalityId: string) => ["scenarios", municipalityId] as const,
};

export const queries = {
  mapLayers: (municipality: string) =>
    queryOptions({
      queryKey: [...queryKeys.municipality(municipality), "map-layers"],
      // A geometria vem uma vez (hora de pico); o slider recolore com `utciByHour`.
      queryFn: ({ signal }) =>
        apiClient.get<MapLayersResponse>(
          "/thermals/map-layers",
          { municipality, hour: 14 },
          signal,
        ),
      staleTime: STALE,
    }),

  utciByHour: (municipality: string) =>
    queryOptions({
      queryKey: [...queryKeys.municipality(municipality), "utci-by-hour"],
      queryFn: ({ signal }) =>
        apiClient.get<UtciByHourResponse>("/thermals/utci-by-hour", { municipality }, signal),
      staleTime: STALE,
    }),

  alerts: (municipality: string) =>
    queryOptions({
      queryKey: [...queryKeys.municipality(municipality), "alerts"],
      queryFn: ({ signal }) =>
        apiClient.get<AlertListResponse>("/alerts", { municipality }, signal),
      staleTime: STALE,
    }),

  ranking: (params: RankingFilters) =>
    queryOptions({
      queryKey: [...queryKeys.municipality(params.municipality), "ranking", params],
      queryFn: ({ signal }) =>
        apiClient.get<RankingResponse>("/prescriptions/ivtu-ranking", { ...params }, signal),
      staleTime: STALE,
      placeholderData: keepPreviousData,
    }),

  block: (id: string) =>
    queryOptions({
      queryKey: queryKeys.block(id),
      queryFn: ({ signal }) =>
        apiClient.get<BlockDetailResponse>(`/blocks/${encodeURIComponent(id)}`, {}, signal),
      staleTime: STALE,
    }),

  checklist: (blockId: string) =>
    queryOptions({
      queryKey: queryKeys.checklist(blockId),
      queryFn: ({ signal }) =>
        apiClient.get<ChecklistResponse>(
          `/blocks/${encodeURIComponent(blockId)}/checklist`,
          {},
          signal,
        ),
    }),

  scenarios: (municipality: string) =>
    queryOptions({
      queryKey: queryKeys.scenarios(municipality),
      queryFn: ({ signal }) =>
        apiClient.get<SavedScenarioListResponse>("/simulation/scenarios", { municipality }, signal),
    }),

  whatIf: (scenario: SimulationScenarioInput) =>
    queryOptions({
      queryKey: ["what-if", scenario],
      queryFn: ({ signal }) =>
        apiClient.post<WhatIfResponse>("/simulation/what-if", scenario, signal),
      staleTime: Infinity,
      placeholderData: keepPreviousData,
    }),

  esg: (input: EsgInput) =>
    queryOptions({
      queryKey: ["esg", input],
      queryFn: ({ signal }) => apiClient.post<EsgResultResponse>("/esg/impact", input, signal),
      staleTime: Infinity,
      placeholderData: keepPreviousData,
    }),
};

export const mutations = {
  updateChecklist: (blockId: string, update: ChecklistUpdate) =>
    apiClient.put<ChecklistResponse>(`/blocks/${encodeURIComponent(blockId)}/checklist`, update),
  saveScenario: (input: SaveScenarioInput) =>
    apiClient.post<SavedScenarioListResponse["data"][number]>("/simulation/scenarios", input),
};
