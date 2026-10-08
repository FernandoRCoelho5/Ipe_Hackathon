"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ChevronLeft, ChevronRight, MapPin, MessageCircle, Globe } from "lucide-react";
import { useState } from "react";
import { QueryError } from "@/components/data/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  REPORT_CATEGORIES,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  type ReportCategory,
  type ReportStatus,
} from "@/domain/citizen/schema";
import { engagementQueries, mutations, queryKeys, type CitizenReportItem } from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import { formatInteger, formatPercent, formatRelativeTime } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { REPORT_STATUS_COLORS, REPORT_STATUS_TONES } from "./status";

const PAGE_SIZE = 8;

interface ReportModerationProps {
  municipalityId: string;
  status: ReportStatus;
  onStatusChange: (status: ReportStatus) => void;
  category: ReportCategory | "";
  onCategoryChange: (category: ReportCategory | "") => void;
  selectedId: string | null;
  onSelect: (report: CitizenReportItem) => void;
}

/** Fila de moderação: abas por status, filtro por categoria e ações por relato. */
export function ReportModeration({
  municipalityId,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  selectedId,
  onSelect,
}: ReportModerationProps) {
  const t = messages.citizen;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [now] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState("");

  const list = useQuery(
    engagementQueries.citizenReports({
      municipality: municipalityId,
      statuses: [status],
      categories: category ? [category] : [],
      page,
      pageSize: PAGE_SIZE,
    }),
  );

  const moderate = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ReportStatus }) =>
      mutations.moderateCitizenReport(id, next),
    onSuccess: (report) => {
      setAnnouncement(t.moderated(REPORT_STATUS_LABELS[report.status].toLowerCase()));
      void queryClient.invalidateQueries({ queryKey: queryKeys.citizenReports(municipalityId) });
    },
  });

  const counts = list.data?.meta.statusCounts;
  const meta = list.data?.meta;

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={t.statusTabsLabel} className="flex flex-wrap gap-1.5">
        {REPORT_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => {
              setPage(1);
              onStatusChange(s);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              status === s
                ? "border-primary bg-primary text-primary-fg"
                : "border-line bg-surface text-fg hover:border-line-strong",
            )}
          >
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: REPORT_STATUS_COLORS[s] }}
            />
            {REPORT_STATUS_LABELS[s]}
            {counts && <span className="tabular opacity-80">{formatInteger(counts[s] ?? 0)}</span>}
          </button>
        ))}
      </div>

      <SelectField
        label={t.category}
        emptyLabel={t.allCategories}
        value={category}
        onChange={(e) => {
          setPage(1);
          onCategoryChange(e.target.value as ReportCategory | "");
        }}
        options={(Object.keys(REPORT_CATEGORIES) as ReportCategory[]).map((c) => ({
          value: c,
          label: REPORT_CATEGORIES[c],
        }))}
      />

      <p role="status" className="text-xs text-accent empty:hidden">
        {announcement}
      </p>
      {moderate.error && <QueryError error={moderate.error} />}
      {list.error && <QueryError error={list.error} onRetry={() => void list.refetch()} />}

      {list.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : list.data?.data.length === 0 ? (
        <p className="rounded-control border border-dashed border-line-strong p-6 text-center text-sm text-fg-muted">
          {t.empty}
        </p>
      ) : (
        <ul className={cn("flex flex-col gap-2", list.isPlaceholderData && "opacity-60")}>
          {list.data?.data.map((report) => (
            <li
              key={report.id}
              className={cn(
                "flex flex-col gap-2 rounded-control border bg-surface p-3",
                report.id === selectedId ? "border-primary ring-2 ring-primary/25" : "border-line",
              )}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={REPORT_STATUS_TONES[report.status]}>
                  {REPORT_STATUS_LABELS[report.status]}
                </Badge>
                <span className="text-sm font-semibold text-fg">
                  {REPORT_CATEGORIES[report.category]}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-fg">{report.text}</p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                <time dateTime={report.createdAt}>{formatRelativeTime(report.createdAt, now)}</time>
                <span className="inline-flex items-center gap-1">
                  {report.channel === "whatsapp" ? (
                    <MessageCircle aria-hidden className="size-3.5" />
                  ) : (
                    <Globe aria-hidden className="size-3.5" />
                  )}
                  {t.channel[report.channel]}
                </span>
                <span>{t.anon(report.anonId)}</span>
                {report.hasPhoto && (
                  <span className="inline-flex items-center gap-1">
                    <Camera aria-hidden className="size-3.5" />
                    {t.photo}
                  </span>
                )}
                {report.spamScore >= 0.3 && (
                  <Badge tone="danger">{t.spam(formatPercent(report.spamScore))}</Badge>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => onSelect(report)}>
                  <MapPin aria-hidden />
                  {t.locate}
                </Button>
                {REPORT_STATUSES.filter((s) => s !== report.status).map((next) => (
                  <Button
                    key={next}
                    size="sm"
                    variant={next === "validado" ? "secondary" : "outline"}
                    disabled={moderate.isPending}
                    onClick={() => moderate.mutate({ id: report.id, next })}
                  >
                    {t.actions[next]}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {meta && meta.totalPages > 1 && (
        <nav aria-label={t.paginationLabel} className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft aria-hidden />
            {messages.prescription.pagination.previous}
          </Button>
          <span className="text-xs text-fg-muted tabular">
            {messages.prescription.pagination.page(meta.page, meta.totalPages)}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            {messages.prescription.pagination.next}
            <ChevronRight aria-hidden />
          </Button>
        </nav>
      )}
    </div>
  );
}
