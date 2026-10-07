"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronRight } from "lucide-react";
import { IvtuBadge, UtciChip } from "@/components/data/badges";
import { QueryError } from "@/components/data/query-error";
import { LegalSeal } from "@/components/layout/legal-seal";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { IVTU_LEVEL_LABELS, IVTU_LEVELS } from "@/domain/ivtu/ivtu";
import type { Municipality } from "@/domain/municipality/types";
import type { MapLayersResponse } from "@/lib/api/contracts";
import { queries } from "@/lib/api/queries";
import { formatInteger, formatPercent, formatTemperature } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { IVTU_LEVEL_COLORS } from "./scales";

interface MunicipalityOverviewProps {
  municipality: Municipality;
  features: MapLayersResponse["features"] | undefined;
  onSelect: (id: string) => void;
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
}

/**
 * Resumo do município e lista dos quarteirões mais vulneráveis.
 * A lista é também a alternativa acessível ao mapa: selecionar um item o localiza.
 */
export function MunicipalityOverview({
  municipality,
  features,
  onSelect,
}: MunicipalityOverviewProps) {
  const t = messages.map.overview;
  const ranking = useQuery(
    queries.ranking({ municipality: municipality.id, sort: "ivtu", order: "desc", pageSize: 6 }),
  );
  const counts = ranking.data?.meta.levelCounts;
  const total = ranking.data?.meta.total ?? 0;

  return (
    <section aria-labelledby="overview-title" className="flex flex-col gap-6 px-5 py-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-[0.14em] text-fg-muted uppercase">
          {municipality.name} · {municipality.state}
        </p>
        <h2 id="overview-title" className="text-lg font-semibold text-fg">
          {t.title}
        </h2>
      </div>

      {ranking.error && <QueryError error={ranking.error} onRetry={() => void ranking.refetch()} />}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Stat
          label={t.blocks}
          value={ranking.data ? formatInteger(total) : <Skeleton className="h-7 w-16" />}
        />
        <Stat
          label={t.critical}
          value={counts ? formatInteger(counts.critico) : <Skeleton className="h-7 w-16" />}
          hint={counts && total > 0 ? formatPercent(counts.critico / total) : undefined}
        />
        <Stat
          label={t.peak}
          value={
            features ? (
              formatTemperature(average(features.map((f) => f.properties.utciPeak)))
            ) : (
              <Skeleton className="h-7 w-20" />
            )
          }
        />
        <Stat
          label={t.lst}
          value={
            features ? (
              formatTemperature(average(features.map((f) => f.properties.lstC)))
            ) : (
              <Skeleton className="h-7 w-20" />
            )
          }
        />
      </dl>

      {counts && total > 0 && (
        <figure className="flex flex-col gap-2">
          <figcaption className="text-xs font-semibold text-fg">{t.distribution}</figcaption>
          <div aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {[...IVTU_LEVELS].reverse().map((level) =>
              counts[level] > 0 ? (
                <span
                  key={level}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(counts[level] / total) * 100}%`,
                    backgroundColor: IVTU_LEVEL_COLORS[level],
                  }}
                />
              ) : null,
            )}
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {[...IVTU_LEVELS].reverse().map((level) => (
              <li key={level} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 rounded-sm"
                  style={{ backgroundColor: IVTU_LEVEL_COLORS[level] }}
                />
                <span className="text-fg-muted">{IVTU_LEVEL_LABELS[level]}</span>
                <span className="ml-auto font-semibold text-fg tabular">
                  {formatInteger(counts[level])}
                </span>
              </li>
            ))}
          </ul>
        </figure>
      )}

      <div className="flex flex-col gap-2">
        <div>
          <h3 className="text-sm font-semibold text-fg">{t.hottest}</h3>
          <p className="text-xs text-fg-muted">{t.hottestHint}</p>
        </div>
        <ol className="flex flex-col divide-y divide-line rounded-control border border-line">
          {ranking.isPending
            ? Array.from({ length: 5 }, (_, i) => (
                <li key={i} className="p-3">
                  <Skeleton className="h-10" />
                </li>
              ))
            : ranking.data?.data.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(row.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                  >
                    <span className="w-6 text-center text-xs font-semibold text-fg-muted tabular">
                      {row.rank}º
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-fg">{row.street}</span>
                      <span className="truncate text-xs text-fg-muted">
                        {row.code} · {row.neighborhood}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <IvtuBadge score={row.ivtu} level={row.ivtuLevel} />
                      <UtciChip utci={row.utciPeak} />
                    </span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                  </button>
                </li>
              ))}
        </ol>
        <ButtonLink href="/prescricao" variant="ghost" size="sm" className="self-start">
          {t.seeRanking}
          <ArrowRight aria-hidden />
        </ButtonLink>
      </div>

      <LegalSeal compact />
    </section>
  );
}
