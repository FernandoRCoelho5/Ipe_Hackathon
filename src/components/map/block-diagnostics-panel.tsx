"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, SlidersHorizontal, X } from "lucide-react";
import { HourlyUtciChart } from "@/components/charts/hourly-utci-chart";
import { UtciChip } from "@/components/data/badges";
import { QueryError } from "@/components/data/query-error";
import { LegalSeal } from "@/components/layout/legal-seal";
import { BlockAttributes } from "@/components/prescription/block-attributes";
import { IvtuBreakdown } from "@/components/prescription/ivtu-breakdown";
import { RecommendationCard } from "@/components/prescription/recommendation-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ZONE_LABELS } from "@/domain/block/schema";
import { classifyThermalStress } from "@/domain/thermal/stress";
import { queries } from "@/lib/api/queries";
import { formatHour, formatTemperature } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { utciColor } from "./scales";

interface BlockDiagnosticsPanelProps {
  blockId: string;
  activeHour: number;
  onClose: () => void;
}

/** Diagnóstico do quarteirão selecionado no mapa: calor, IVTU, atributos e ação. */
export function BlockDiagnosticsPanel({
  blockId,
  activeHour,
  onClose,
}: BlockDiagnosticsPanelProps) {
  const t = messages.map.panel;
  const { data, error, isPending, refetch } = useQuery(queries.block(blockId));

  if (isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4 p-5">
        <span className="sr-only" role="status">
          {messages.common.loading}
        </span>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col gap-3 p-5">
        <CloseButton onClose={onClose} label={t.close} />
        <QueryError error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const { block, diagnostics, hourly } = data;
  const atHour = hourly.find((h) => h.hour === activeHour);
  const primary = diagnostics.prescription.primary;
  const extra = diagnostics.prescription.recommendations.length - (primary ? 1 : 0);
  const peakColor = utciColor(diagnostics.utciPeak);

  return (
    <article aria-labelledby="block-panel-title" className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-line bg-surface/95 px-5 py-4 backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs font-medium tracking-[0.14em] text-fg-muted uppercase">
            {block.code} · {block.neighborhood}
          </p>
          <h2 id="block-panel-title" className="text-lg leading-snug font-semibold text-fg">
            {block.street}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            <Badge>{ZONE_LABELS[block.zone]}</Badge>
          </div>
        </div>
        <CloseButton onClose={onClose} label={t.close} />
      </header>

      <div className="flex flex-col gap-6 px-5 py-5">
        <section aria-labelledby="peak-title" className="flex flex-col gap-2">
          <h3 id="peak-title" className="text-xs font-semibold text-fg-muted">
            {t.peakTitle}
          </h3>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <span
              className="h-10 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: peakColor }}
              aria-hidden
            />
            <span className="text-4xl leading-none font-bold tracking-tight text-fg tabular">
              {formatTemperature(diagnostics.utciPeak)}
            </span>
            <span className="pb-1 text-sm text-fg-muted">
              {t.peakAt(formatHour(diagnostics.utciPeakHour))}
            </span>
          </div>
          <p className="text-sm font-medium text-fg">
            {classifyThermalStress(diagnostics.utciPeak).label}
          </p>
          {atHour && (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              {t.atHour(formatHour(activeHour))}: <UtciChip utci={atHour.utci} showCategory />
            </p>
          )}
        </section>

        <section aria-labelledby="hourly-title" className="flex flex-col gap-2">
          <div>
            <h3 id="hourly-title" className="text-sm font-semibold text-fg">
              {t.hourlyTitle}
            </h3>
            <p className="text-xs text-fg-muted">{t.hourlyDescription}</p>
          </div>
          <HourlyUtciChart
            data={hourly.map((h) => ({ hour: h.hour, utci: h.utci }))}
            activeHour={activeHour}
          />
        </section>

        <section aria-labelledby="ivtu-title" className="flex flex-col gap-3">
          <h3 id="ivtu-title" className="text-sm font-semibold text-fg">
            {t.ivtuTitle}
          </h3>
          <IvtuBreakdown ivtu={diagnostics.ivtu} />
        </section>

        <section aria-labelledby="attributes-title" className="flex flex-col gap-3">
          <h3 id="attributes-title" className="text-sm font-semibold text-fg">
            {t.attributesTitle}
          </h3>
          <BlockAttributes block={block} drainageRisk={diagnostics.drainageRisk} />
        </section>

        <section aria-labelledby="recommendation-title" className="flex flex-col gap-3">
          <h3 id="recommendation-title" className="text-sm font-semibold text-fg">
            {t.recommendationTitle}
          </h3>
          {primary ? (
            <RecommendationCard recommendation={primary} compact />
          ) : (
            <p className="text-sm text-fg-muted">{t.noRecommendation}</p>
          )}
          {extra > 0 && <p className="text-xs text-fg-muted">{t.more(extra)}</p>}
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/prescricao?bloco=${block.id}`} size="sm">
              {t.openPrescription}
              <ArrowRight aria-hidden />
            </ButtonLink>
            <ButtonLink href={`/simulador?bloco=${block.id}`} size="sm" variant="outline">
              <SlidersHorizontal aria-hidden />
              {t.simulate}
            </ButtonLink>
          </div>
        </section>

        <LegalSeal compact />
      </div>
    </article>
  );
}

function CloseButton({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="-m-1 shrink-0 rounded-md p-1.5 text-fg-muted hover:bg-surface-muted hover:text-fg"
    >
      <X aria-hidden className="size-5" />
    </button>
  );
}
