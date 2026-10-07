"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FilterX, SearchX } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { QueryError } from "@/components/data/query-error";
import { useActiveMunicipality } from "@/components/layout/municipality-context";
import { useBlockMunicipalitySync } from "@/components/layout/use-block-municipality-sync";
import { IVTU_LEVEL_COLORS } from "@/components/map/scales";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField, SelectField } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ZONE_LABELS, ZONES, type Zone } from "@/domain/block/schema";
import { IVTU_LEVEL_LABELS, IVTU_LEVELS, type IvtuLevel } from "@/domain/ivtu/ivtu";
import {
  EXECUTION_LEVEL_LABELS,
  EXECUTION_LEVELS,
  INTERVENTION_LABELS,
  INTERVENTION_TYPES,
  type ExecutionLevel,
  type InterventionType,
} from "@/domain/prescription/engine";
import { queries } from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import { formatInteger, formatPercent } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks";
import { messages } from "@/lib/i18n";
import { useUrlState } from "@/lib/use-url-state";
import { PrescriptionDrawer } from "./prescription-drawer";
import {
  hasActiveFilters,
  parseRankingState,
  rankingStateToUrl,
  toRankingFilters,
  type RankingUiState,
} from "./ranking-params";
import { RankingTable } from "./ranking-table";

const LEVELS_DESC = [...IVTU_LEVELS].reverse() as IvtuLevel[];

/**
 * Tela 02 · Prescrição. Filtros, ordenação, página e quarteirão aberto vivem na URL:
 * o link copiado reabre exatamente a mesma visão.
 */
export function PrescriptionScreen() {
  const municipality = useActiveMunicipality();
  const [params, setParams] = useUrlState();
  const state = parseRankingState(params);
  const selectedId = params.get("bloco");
  const t = messages.prescription;

  const update = (patch: Partial<RankingUiState>) =>
    setParams(rankingStateToUrl({ page: 1, ...patch }));

  // A busca digitada só vai para a URL (e para a API) após uma pausa.
  const [searchDraft, setSearchDraft] = useState(state.search);
  const debouncedSearch = useDebouncedValue(searchDraft.trim(), 300);
  const syncSearch = useEffectEvent((search: string) => {
    if (search !== state.search) setParams(rankingStateToUrl({ search, page: 1 }));
  });
  useEffect(() => syncSearch(debouncedSearch), [debouncedSearch]);

  const municipalityId = municipality?.id ?? "";
  const filters = toRankingFilters(state, municipalityId);
  const ranking = useQuery({ ...queries.ranking(filters), enabled: !!municipality });
  // Contagem por nível sem o filtro de nível, para os cartões de resumo.
  const summary = useQuery({
    ...queries.ranking({ ...filters, ivtuLevels: [], page: 1, pageSize: 1 }),
    enabled: !!municipality,
  });

  const selectedBlock = useQuery({ ...queries.block(selectedId ?? ""), enabled: !!selectedId });
  useBlockMunicipalitySync(selectedBlock.data?.block, () => setParams({ bloco: null }));

  const selectedRank = ranking.data?.data.find((row) => row.id === selectedId)?.rank;

  if (!municipality) return <PrescriptionSkeleton />;

  const counts = summary.data?.meta.levelCounts;
  const summaryTotal = summary.data?.meta.total ?? 0;
  const meta = ranking.data?.meta;

  const toggleLevel = (level: IvtuLevel) =>
    update({
      levels: state.levels.includes(level)
        ? state.levels.filter((l) => l !== level)
        : [...state.levels, level],
    });

  return (
    <div className="flex flex-col gap-6">
      <section aria-label={t.summaryLabel} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {LEVELS_DESC.map((level) => {
          const active = state.levels.includes(level);
          const count = counts?.[level];
          return (
            <button
              key={level}
              type="button"
              aria-pressed={active}
              onClick={() => toggleLevel(level)}
              title={t.filterByLevel(IVTU_LEVEL_LABELS[level])}
              className={cn(
                "flex flex-col gap-2 rounded-card border bg-surface p-4 text-left shadow-card transition-colors hover:border-line-strong",
                active ? "border-primary ring-2 ring-primary/30" : "border-line",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-fg">
                <span
                  aria-hidden
                  className="size-3 rounded-sm"
                  style={{ backgroundColor: IVTU_LEVEL_COLORS[level] }}
                />
                {IVTU_LEVEL_LABELS[level]}
              </span>
              <span className="text-2xl font-bold tracking-tight text-fg tabular">
                {count === undefined ? <Skeleton className="h-8 w-14" /> : formatInteger(count)}
              </span>
              <span className="text-xs text-fg-muted tabular">
                {count !== undefined && summaryTotal > 0
                  ? formatPercent(count / summaryTotal)
                  : " "}
              </span>
            </button>
          );
        })}
      </section>

      <section
        aria-label={t.filters.title}
        className="grid gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end"
      >
        <SearchField
          label={t.filters.search}
          placeholder={t.filters.searchPlaceholder}
          value={searchDraft}
          onValueChange={setSearchDraft}
        />
        <SelectField
          label={t.filters.neighborhood}
          emptyLabel={t.filters.all}
          value={state.neighborhood}
          onChange={(e) => update({ neighborhood: e.target.value })}
          options={(meta?.neighborhoods ?? []).map((n) => ({ value: n, label: n }))}
        />
        <SelectField
          label={t.filters.zone}
          emptyLabel={t.filters.all}
          value={state.zones[0] ?? ""}
          onChange={(e) => update({ zones: e.target.value ? [e.target.value as Zone] : [] })}
          options={ZONES.map((z) => ({ value: z, label: ZONE_LABELS[z] }))}
        />
        <SelectField
          label={t.filters.intervention}
          emptyLabel={t.filters.allFeminine}
          value={state.intervention}
          onChange={(e) => update({ intervention: e.target.value as InterventionType | "" })}
          options={INTERVENTION_TYPES.map((i) => ({ value: i, label: INTERVENTION_LABELS[i] }))}
        />
        <SelectField
          label={t.filters.executionLevel}
          emptyLabel={t.filters.all}
          value={state.executionLevel}
          onChange={(e) => update({ executionLevel: e.target.value as ExecutionLevel | "" })}
          options={EXECUTION_LEVELS.map((l) => ({ value: l, label: EXECUTION_LEVEL_LABELS[l] }))}
        />
        <Button
          variant="ghost"
          disabled={!hasActiveFilters(state) && !searchDraft}
          onClick={() => {
            setSearchDraft("");
            update({
              search: "",
              neighborhood: "",
              zones: [],
              levels: [],
              intervention: "",
              executionLevel: "",
            });
          }}
        >
          <FilterX aria-hidden />
          {t.filters.clear}
        </Button>
      </section>

      <div className="flex items-center justify-between gap-3 text-sm">
        <p role="status" className="text-fg-muted">
          {meta ? t.table.results(formatInteger(meta.total)) : messages.common.loading}
          {ranking.isFetching && meta && (
            <span className="ml-2 text-fg-subtle">{messages.data.updating}</span>
          )}
        </p>
      </div>

      {ranking.error && <QueryError error={ranking.error} onRetry={() => void ranking.refetch()} />}

      {ranking.isPending ? (
        <Skeleton className="h-[32rem] rounded-card" />
      ) : ranking.data && ranking.data.data.length > 0 ? (
        <RankingTable
          rows={ranking.data.data}
          caption={t.table.caption(municipality.name)}
          sort={state.sort}
          order={state.order}
          stale={ranking.isPlaceholderData}
          onSort={(sort) =>
            update({
              sort,
              order: state.sort === sort ? (state.order === "desc" ? "asc" : "desc") : "desc",
              page: state.page,
            })
          }
          onOpen={(row) => setParams({ bloco: row.id }, { push: true })}
        />
      ) : (
        <EmptyState icon={SearchX} title={t.table.empty} />
      )}

      {meta && meta.totalPages > 1 && (
        <nav aria-label={t.pagination.label} className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={state.page <= 1}
            onClick={() => setParams(rankingStateToUrl({ page: state.page - 1 }))}
          >
            <ChevronLeft aria-hidden />
            {t.pagination.previous}
          </Button>
          <p className="text-sm text-fg-muted tabular">
            {t.pagination.page(meta.page, meta.totalPages)}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={state.page >= meta.totalPages}
            onClick={() => setParams(rankingStateToUrl({ page: state.page + 1 }))}
          >
            {t.pagination.next}
            <ChevronRight aria-hidden />
          </Button>
        </nav>
      )}

      <PrescriptionDrawer
        blockId={selectedId}
        rank={selectedRank}
        onClose={() => setParams({ bloco: null })}
      />
    </div>
  );
}

export function PrescriptionSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        {messages.common.loading}
      </span>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {LEVELS_DESC.map((level) => (
          <Skeleton key={level} className="h-28 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-20 rounded-card" />
      <Skeleton className="h-[32rem] rounded-card" />
    </div>
  );
}
