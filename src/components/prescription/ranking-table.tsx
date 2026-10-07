"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";
import { ExecutionLevelBadge, IvtuBadge, UtciChip } from "@/components/data/badges";
import { Badge } from "@/components/ui/badge";
import { ZONE_LABELS } from "@/domain/block/schema";
import type { RankingRow } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import { messages } from "@/lib/i18n";
import type { RankingUiState } from "./ranking-params";

type Sort = RankingUiState["sort"];

interface RankingTableProps {
  rows: readonly RankingRow[];
  caption: string;
  sort: Sort;
  order: "asc" | "desc";
  onSort: (sort: Sort) => void;
  onOpen: (row: RankingRow) => void;
  /** Mantém a tabela anterior visível (esmaecida) enquanto a nova página carrega. */
  stale?: boolean;
}

/** Ranking IVTU. Cabeçalhos ordenáveis com `aria-sort`; cada linha abre a prescrição. */
export function RankingTable({
  rows,
  caption,
  sort,
  order,
  onSort,
  onOpen,
  stale,
}: RankingTableProps) {
  const t = messages.prescription.table;

  const sortHeader = (key: Sort, label: string, className?: string) => {
    const active = sort === key;
    const Icon = active ? (order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th
        scope="col"
        aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
        className={cn("px-3 py-3 font-medium", className)}
      >
        <button
          type="button"
          onClick={() => onSort(key)}
          title={t.sortBy(label)}
          className={cn(
            "-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-surface-muted hover:text-fg",
            active && "text-fg",
          )}
        >
          {label}
          <Icon aria-hidden className={cn("size-3.5", !active && "opacity-50")} />
        </button>
      </th>
    );
  };

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-card border border-line bg-surface shadow-card transition-opacity",
        stale && "opacity-60",
      )}
    >
      <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-surface-muted/60 text-xs text-fg-muted">
          <tr>
            <th scope="col" className="w-16 px-3 py-3 text-center font-medium">
              {t.rank}
            </th>
            {sortHeader("code", t.block)}
            {sortHeader("ivtu", t.ivtu)}
            {sortHeader("utci", t.utci)}
            <th scope="col" className="px-3 py-3 font-medium">
              {t.canopy}
            </th>
            {sortHeader("priority", t.recommendation)}
            <th scope="col" className="px-3 py-3 text-right font-medium">
              <span className="sr-only">{t.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onOpen(row)}
              className="cursor-pointer transition-colors hover:bg-surface-muted/70"
            >
              <td className="px-3 py-3 text-center font-semibold text-fg-muted tabular">
                {row.rank}º
              </td>
              <td className="px-3 py-3">
                <p className="font-medium text-fg">{row.street}</p>
                <p className="text-xs text-fg-muted">
                  {row.code} · {row.neighborhood} · {ZONE_LABELS[row.zone]}
                </p>
              </td>
              <td className="px-3 py-3">
                <IvtuBadge score={row.ivtu} level={row.ivtuLevel} />
              </td>
              <td className="px-3 py-3">
                <UtciChip utci={row.utciPeak} />
              </td>
              <td className="px-3 py-3 text-fg tabular">{formatPercent(row.canopyCover)}</td>
              <td className="px-3 py-3">
                {row.recommendation ? (
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium text-fg">{row.recommendation.title}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <ExecutionLevelBadge level={row.recommendation.level} />
                      {row.additionalRecommendations > 0 && (
                        <Badge>+{row.additionalRecommendations}</Badge>
                      )}
                    </span>
                  </div>
                ) : (
                  <span className="text-fg-subtle">{t.none}</span>
                )}
              </td>
              <td className="px-3 py-3 text-right">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(row);
                  }}
                  aria-label={t.detailsOf(row.code)}
                  className="inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-accent-soft"
                >
                  {t.details}
                  <ChevronRight aria-hidden className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
