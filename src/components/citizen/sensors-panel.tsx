"use client";

import { useQuery } from "@tanstack/react-query";
import { BatteryMedium, Droplets, Signal, Thermometer, Wifi } from "lucide-react";
import { useState } from "react";
import { CalibrationChart } from "@/components/charts/calibration-chart";
import { ReadingsChart } from "@/components/charts/readings-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { QueryError } from "@/components/data/query-error";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { IOT_STATUS_LABELS, signalBars } from "@/domain/iot/schema";
import { engagementQueries, type IotNodeSummary } from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import {
  formatDecimal,
  formatInteger,
  formatPercent,
  formatRelativeTime,
  formatSignedTemperature,
  formatTemperature,
} from "@/lib/format";
import { messages } from "@/lib/i18n";
import { IOT_STATUS_TONES } from "./status";

const PERIODS = [24, 72, 168] as const;

interface SensorsPanelProps {
  municipalityId: string;
  nodes: IotNodeSummary[] | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Rede de nós IoT: estado de cada nó, série de leituras e calibração sensor × modelo. */
export function SensorsPanel({ municipalityId, nodes, selectedId, onSelect }: SensorsPanelProps) {
  const t = messages.citizen.sensors;
  const [now] = useState(() => Date.now());
  const selected = nodes?.find((n) => n.node.id === selectedId) ?? nodes?.[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-fg">{t.title}</h2>
        <p className="text-sm text-fg-muted">{t.description}</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        {!nodes
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-36" />
              </li>
            ))
          : nodes.map((summary) => (
              <li key={summary.node.id}>
                <NodeCard
                  summary={summary}
                  now={now}
                  active={summary.node.id === selected?.node.id}
                  onSelect={() => onSelect(summary.node.id)}
                />
              </li>
            ))}
      </ul>

      {selected && <NodeReadings summary={selected} />}

      <Calibration municipalityId={municipalityId} />
    </div>
  );
}

function NodeCard({
  summary,
  now,
  active,
  onSelect,
}: {
  summary: IotNodeSummary;
  now: number;
  active: boolean;
  onSelect: () => void;
}) {
  const t = messages.citizen.sensors;
  const { node, latest, status, sparkline } = summary;
  const bars = latest ? signalBars(latest.signalDbm) : 0;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-3 rounded-control border bg-surface p-4 text-left transition-colors hover:border-line-strong",
        active ? "border-primary ring-2 ring-primary/25" : "border-line",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-fg">{node.code}</span>
          <span className="truncate text-xs text-fg-muted">{node.label}</span>
        </span>
        <Badge tone={IOT_STATUS_TONES[status]}>{IOT_STATUS_LABELS[status]}</Badge>
      </span>
      {latest ? (
        <>
          <span className="flex flex-wrap items-end justify-between gap-3">
            <span className="flex items-center gap-3 text-sm text-fg tabular">
              <span className="inline-flex items-center gap-1 text-2xl font-bold tracking-tight">
                <Thermometer aria-hidden className="size-4 text-thermal-4" />
                {formatTemperature(latest.temperatureC)}
              </span>
              <span className="inline-flex items-center gap-1 text-fg-muted">
                <Droplets aria-hidden className="size-3.5 text-azul-cidade" />
                <span className="sr-only">{t.humidity}</span>
                {formatPercent(latest.humidity)}
              </span>
            </span>
            <Sparkline values={sparkline} label={t.sparkline} width={96} height={28} />
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted tabular">
            <span className="inline-flex items-center gap-1">
              <BatteryMedium aria-hidden className="size-3.5" />
              {t.battery} {formatInteger(latest.batteryPct)}%
            </span>
            <span className="inline-flex items-center gap-1">
              {node.connectivity === "wifi" ? (
                <Wifi aria-hidden className="size-3.5" />
              ) : (
                <Signal aria-hidden className="size-3.5" />
              )}
              {t.signal} {bars}/4
            </span>
            <span>{t.lastReading(formatRelativeTime(latest.timestamp, now))}</span>
          </span>
        </>
      ) : (
        <span className="text-sm text-fg-muted">{t.noReading}</span>
      )}
    </button>
  );
}

function NodeReadings({ summary }: { summary: IotNodeSummary }) {
  const t = messages.citizen.sensors;
  const [hours, setHours] = useState<(typeof PERIODS)[number]>(24);
  const readings = useQuery(engagementQueries.iotReadings(summary.node.id, hours));
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>{t.readingsTitle(summary.node.code)}</CardTitle>
        <div role="group" aria-label={t.period} className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={hours === p}
              onClick={() => setHours(p)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium",
                hours === p
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-line text-fg hover:border-line-strong",
              )}
            >
              {t.hours(p)}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {readings.error ? (
          <QueryError error={readings.error} onRetry={() => void readings.refetch()} />
        ) : !readings.data ? (
          <Skeleton className="h-56" />
        ) : readings.data.data.length < 2 ? (
          <p className="text-sm text-fg-muted">{t.noReading}</p>
        ) : (
          <div className={readings.isPlaceholderData ? "opacity-60" : undefined}>
            <ReadingsChart readings={readings.data.data} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Calibration({ municipalityId }: { municipalityId: string }) {
  const t = messages.citizen.sensors;
  const { data, error, refetch } = useQuery(engagementQueries.calibration(municipalityId));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.calibrationTitle}</CardTitle>
        <CardDescription>{t.calibrationDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {error && <QueryError error={error} onRetry={() => void refetch()} />}
        {!data ? (
          <Skeleton className="h-72" />
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label={t.bias}
                value={formatSignedTemperature(data.stats.bias)}
                hint={t.biasHint}
              />
              <Stat label={t.rmse} value={formatTemperature(data.stats.rmse)} />
              <Stat label={t.pearson} value={formatDecimal(data.stats.pearson, 3)} />
              <Stat label={t.points} value={formatInteger(data.stats.points)} />
            </dl>
            {data.data.length > 1 && <CalibrationChart points={data.data} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}
