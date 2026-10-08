"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useActiveMunicipality } from "@/components/layout/municipality-context";
import { PointsMap, type MapPoint } from "@/components/map/points-map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import {
  REPORT_CATEGORIES,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  type ReportCategory,
  type ReportStatus,
} from "@/domain/citizen/schema";
import { IOT_STATUS_LABELS } from "@/domain/iot/schema";
import type { LngLat } from "@/domain/municipality/types";
import { engagementQueries } from "@/lib/api/queries";
import { formatTemperature } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { useUrlState } from "@/lib/use-url-state";
import { NewReportForm } from "./new-report-form";
import { ReportModeration } from "./report-moderation";
import { SensorsPanel } from "./sensors-panel";
import { REPORT_STATUS_COLORS, SENSOR_COLOR } from "./status";

type Tab = "relatos" | "sensores";

/**
 * Tela 05 · Ciência cidadã e IoT. Estado na URL: `?aba=`, `?status=`, `?categoria=`
 * e o item selecionado (`?relato=` ou `?no=`), para links diretos da moderação.
 */
export function CitizenScreen() {
  const municipality = useActiveMunicipality();
  const [params, setParams] = useUrlState();
  const [picked, setPicked] = useState<LngLat | null>(null);
  const t = messages.citizen;

  const tab: Tab = params.get("aba") === "sensores" ? "sensores" : "relatos";
  const status: ReportStatus =
    REPORT_STATUSES.find((s) => s === params.get("status")) ?? "pendente";
  const categoryParam = params.get("categoria");
  const category: ReportCategory | "" =
    categoryParam && categoryParam in REPORT_CATEGORIES ? (categoryParam as ReportCategory) : "";
  const selectedReport = params.get("relato");
  const selectedNode = params.get("no");

  const municipalityId = municipality?.id ?? "";
  // Pontos do mapa: todos os relatos do filtro atual (a lista ao lado é paginada).
  const mapReports = useQuery({
    ...engagementQueries.citizenReports({
      municipality: municipalityId,
      statuses: [status],
      categories: category ? [category] : [],
      pageSize: 100,
    }),
    enabled: !!municipality && tab === "relatos",
  });
  const nodes = useQuery({
    ...engagementQueries.iotNodes(municipalityId),
    enabled: !!municipality,
  });

  if (!municipality) return <CitizenSkeleton />;

  const points: MapPoint[] =
    tab === "relatos"
      ? (mapReports.data?.data ?? []).map((r) => ({
          id: r.id,
          location: r.location,
          kind: "report",
          color: REPORT_STATUS_COLORS[r.status],
          label: `${REPORT_CATEGORIES[r.category]} · ${REPORT_STATUS_LABELS[r.status]}`,
        }))
      : (nodes.data?.data ?? []).map((n) => ({
          id: n.node.id,
          location: n.node.location,
          kind: "sensor",
          color: SENSOR_COLOR,
          label: `${n.node.code} · ${IOT_STATUS_LABELS[n.status]}${n.latest ? ` · ${formatTemperature(n.latest.temperatureC)}` : ""}`,
        }));

  const selectedId =
    tab === "relatos" ? selectedReport : (selectedNode ?? nodes.data?.data[0]?.node.id ?? null);

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        idPrefix="cidada"
        label={t.tabsLabel}
        value={tab}
        onChange={(next) =>
          setParams({ aba: next === "relatos" ? null : next, relato: null, no: null })
        }
        tabs={[
          { id: "relatos", label: t.tabs.reports },
          { id: "sensores", label: t.tabs.sensors },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <div className="h-[22rem] overflow-hidden rounded-card border border-line shadow-card sm:h-[28rem]">
            <PointsMap
              label={t.mapLabel(municipality.name)}
              bbox={municipality.bbox}
              fitKey={municipality.id}
              points={points}
              selectedId={selectedId}
              onSelect={(id) => setParams(tab === "relatos" ? { relato: id } : { no: id })}
              picked={tab === "relatos" ? picked : null}
              onPick={tab === "relatos" ? setPicked : undefined}
            />
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
            {tab === "relatos" ? (
              <>
                {REPORT_STATUSES.map((s) => (
                  <li key={s} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: REPORT_STATUS_COLORS[s] }}
                    />
                    {REPORT_STATUS_LABELS[s]}
                  </li>
                ))}
                <li className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-3 rounded-full border-2 border-verde-ipe bg-amarelo-ipe"
                  />
                  {t.legend.picked}
                </li>
              </>
            ) : (
              <li className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-3 rounded-full border-2 border-white ring-1 ring-black/10"
                  style={{ backgroundColor: SENSOR_COLOR }}
                />
                {t.legend.sensor}
              </li>
            )}
          </ul>
          {tab === "relatos" && (
            <Card>
              <CardHeader>
                <CardTitle>{t.newTitle}</CardTitle>
                <CardDescription>{t.newDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <NewReportForm
                  municipalityId={municipality.id}
                  picked={picked}
                  onSent={() => {
                    setPicked(null);
                    setParams({ status: null });
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {tab === "relatos" ? (
          <TabPanel idPrefix="cidada" id="relatos">
            <ReportModeration
              key={municipality.id}
              municipalityId={municipality.id}
              status={status}
              onStatusChange={(s) =>
                setParams({ status: s === "pendente" ? null : s, relato: null })
              }
              category={category}
              onCategoryChange={(c) => setParams({ categoria: c, relato: null })}
              selectedId={selectedReport}
              onSelect={(report) => setParams({ relato: report.id })}
            />
          </TabPanel>
        ) : (
          <TabPanel idPrefix="cidada" id="sensores">
            <SensorsPanel
              municipalityId={municipality.id}
              nodes={nodes.data?.data}
              selectedId={selectedId}
              onSelect={(id) => setParams({ no: id })}
            />
          </TabPanel>
        )}
      </div>
    </div>
  );
}

export function CitizenSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        {messages.common.loading}
      </span>
      <Skeleton className="h-11 w-80" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Skeleton className="h-[28rem] rounded-card" />
        <Skeleton className="h-[28rem] rounded-card" />
      </div>
    </div>
  );
}
