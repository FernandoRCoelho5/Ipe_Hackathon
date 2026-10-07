"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import { SimulationChart } from "@/components/charts/simulation-chart";
import { Callout } from "@/components/ui/callout";
import type { SimulationResult } from "@/domain/simulation/simulate";
import { cn } from "@/lib/cn";
import {
  formatHour,
  formatInteger,
  formatPercent,
  formatSignedTemperature,
  formatTemperature,
} from "@/lib/format";
import { messages } from "@/lib/i18n";
import { formatRelativeChange } from "./scenario";

/** Efeito estimado do cenário: manchete com faixa de incerteza, curva horária e métricas. */
export function SimulationResults({
  result,
  stale,
}: {
  result: SimulationResult;
  stale?: boolean;
}) {
  const t = messages.simulator;
  const m = t.metrics;
  const delta = result.peakUtciDelta;

  const metrics: { label: string; value: string; hint?: string; good?: boolean }[] = [
    {
      label: m.surface,
      value: formatSignedTemperature(result.surfaceTempDelta),
      good: result.surfaceTempDelta < 0,
    },
    {
      label: m.evapotranspiration,
      value: formatRelativeChange(result.evapotranspirationChange),
      good: result.evapotranspirationChange > 0,
    },
    {
      label: m.runoff,
      value: formatPercent(result.runoffChange, { signed: true }),
      hint: m.retained(formatInteger(result.retainedVolumeM3PerYear)),
      good: result.runoffChange < 0,
    },
    {
      label: m.canopy,
      value: `${formatPercent(result.canopyCover.before)} → ${formatPercent(result.canopyCover.after)}`,
      good: result.canopyCover.after > result.canopyCover.before,
    },
    {
      label: m.trees,
      value: `${formatInteger(result.plantedTrees)} / ${formatInteger(result.plantingCapacity)}`,
    },
    { label: m.permeableArea, value: `${formatInteger(result.permeableAreaM2)} m²` },
    { label: m.coolRoofArea, value: `${formatInteger(result.coolRoofAreaM2)} m²` },
  ];

  return (
    <div
      className={cn("flex flex-col gap-6 transition-opacity", stale && "opacity-60")}
      aria-busy={stale}
    >
      <section aria-labelledby="peak-result" className="flex flex-col gap-2">
        <h3 id="peak-result" className="text-sm font-semibold text-fg-muted">
          {t.peakLabel}
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-fg">
          <span className="text-2xl font-semibold text-fg-muted tabular line-through decoration-1">
            {formatTemperature(result.baselinePeakUtci)}
          </span>
          <ArrowRight aria-hidden className="size-5 self-center text-fg-subtle" />
          <span className="text-4xl font-bold tracking-tight tabular">
            {formatTemperature(result.simulatedPeakUtci)}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-sm font-semibold tabular",
              delta.central < 0
                ? "bg-azul-cidade/15 text-azul-rio dark:text-azul-cidade"
                : "bg-surface-muted text-fg-muted",
            )}
          >
            {formatSignedTemperature(delta.central)}
          </span>
        </p>
        <p className="text-xs text-fg-muted">
          {t.peakRange(
            formatSignedTemperature(delta.conservative),
            formatSignedTemperature(delta.optimistic),
          )}
        </p>
      </section>

      <section aria-labelledby="chart-title" className="flex flex-col gap-2">
        <div>
          <h3 id="chart-title" className="text-sm font-semibold text-fg">
            {t.chartTitle}
          </h3>
          <p className="text-xs text-fg-muted">{t.chartDescription}</p>
        </div>
        <SimulationChart data={result.hourly} />
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent">
            {t.tableToggle}
          </summary>
          <table className="mt-2 w-full text-xs tabular">
            <thead className="text-fg-muted">
              <tr className="border-b border-line">
                <th scope="col" className="py-1.5 text-left font-medium">
                  {t.hour}
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  {t.series.current}
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  {t.series.simulated}
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  {t.delta}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-fg">
              {result.hourly.map((h) => (
                <tr key={h.hour} className={h.inPeakWindow ? "font-semibold" : undefined}>
                  <th scope="row" className="py-1 text-left font-normal">
                    {formatHour(h.hour)}
                  </th>
                  <td className="py-1 text-right">{formatTemperature(h.current)}</td>
                  <td className="py-1 text-right">{formatTemperature(h.simulated)}</td>
                  <td className="py-1 text-right">{formatSignedTemperature(h.delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex flex-col gap-1 rounded-control border border-line bg-surface-muted/40 p-3"
          >
            <dt className="text-xs text-fg-muted">{metric.label}</dt>
            <dd
              className={cn(
                "text-lg font-semibold tabular",
                metric.good ? "text-accent" : "text-fg",
              )}
            >
              {metric.value}
            </dd>
            {metric.hint && <dd className="text-xs text-fg-subtle">{metric.hint}</dd>}
          </div>
        ))}
      </dl>

      {result.warnings.length > 0 && (
        <Callout tone="warning" title={t.warningsTitle}>
          <ul className="flex flex-col gap-1">
            {result.warnings.map((w) => (
              <li key={w} className="flex gap-2">
                <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </Callout>
      )}
    </div>
  );
}
