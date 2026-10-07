import { ZONES, type Zone } from "@/domain/block/schema";
import { IVTU_LEVELS, type IvtuLevel } from "@/domain/ivtu/ivtu";
import {
  EXECUTION_LEVELS,
  INTERVENTION_TYPES,
  type ExecutionLevel,
  type InterventionType,
} from "@/domain/prescription/engine";
import { RANKING_SORTS } from "@/lib/api/contracts";
import type { RankingFilters } from "@/lib/api/queries";
import type { UrlPatch } from "@/lib/use-url-state";

/**
 * Filtros do ranking ⇄ URL em português (`?nivel=critico,alto&bairro=Centro&pagina=2`).
 * Valores desconhecidos são descartados: um link antigo ou editado à mão nunca quebra a tela.
 */

export const RANKING_PAGE_SIZE = 15;

type Sort = (typeof RANKING_SORTS)[number];

export interface RankingUiState {
  search: string;
  neighborhood: string;
  zones: Zone[];
  levels: IvtuLevel[];
  intervention: InterventionType | "";
  executionLevel: ExecutionLevel | "";
  sort: Sort;
  order: "asc" | "desc";
  page: number;
}

function pick<T extends string>(allowed: readonly T[], value: string | null): T | "" {
  return allowed.find((item) => item === value) ?? "";
}

function pickList<T extends string>(allowed: readonly T[], value: string | null): T[] {
  if (!value) return [];
  const wanted = new Set(value.split(","));
  return allowed.filter((item) => wanted.has(item));
}

export function parseRankingState(params: Pick<URLSearchParams, "get">): RankingUiState {
  const page = Number.parseInt(params.get("pagina") ?? "1", 10);
  return {
    search: (params.get("q") ?? "").slice(0, 80),
    neighborhood: (params.get("bairro") ?? "").slice(0, 80),
    zones: pickList(ZONES, params.get("uso")),
    levels: pickList(IVTU_LEVELS, params.get("nivel")),
    intervention: pick(INTERVENTION_TYPES, params.get("intervencao")),
    executionLevel: pick(EXECUTION_LEVELS, params.get("prazo")),
    sort: pick(RANKING_SORTS, params.get("ordem")) || "ivtu",
    order: params.get("dir") === "asc" ? "asc" : "desc",
    page: Number.isFinite(page) && page >= 1 ? page : 1,
  };
}

/** Patch de URL para um novo estado (omite os valores padrão para links curtos). */
export function rankingStateToUrl(state: Partial<RankingUiState>): UrlPatch {
  const patch: UrlPatch = {};
  if ("search" in state) patch.q = state.search;
  if ("neighborhood" in state) patch.bairro = state.neighborhood;
  if ("zones" in state) patch.uso = state.zones;
  if ("levels" in state) patch.nivel = state.levels;
  if ("intervention" in state) patch.intervencao = state.intervention;
  if ("executionLevel" in state) patch.prazo = state.executionLevel;
  if ("sort" in state) patch.ordem = state.sort === "ivtu" ? null : state.sort;
  if ("order" in state) patch.dir = state.order === "desc" ? null : state.order;
  if ("page" in state) patch.pagina = state.page === 1 ? null : state.page;
  return patch;
}

export function toRankingFilters(state: RankingUiState, municipality: string): RankingFilters {
  return {
    municipality,
    search: state.search || undefined,
    neighborhood: state.neighborhood || undefined,
    zones: state.zones,
    ivtuLevels: state.levels,
    intervention: state.intervention || undefined,
    executionLevel: state.executionLevel || undefined,
    sort: state.sort,
    order: state.order,
    page: state.page,
    pageSize: RANKING_PAGE_SIZE,
  };
}

export function hasActiveFilters(state: RankingUiState): boolean {
  return Boolean(
    state.search ||
    state.neighborhood ||
    state.zones.length ||
    state.levels.length ||
    state.intervention ||
    state.executionLevel,
  );
}
