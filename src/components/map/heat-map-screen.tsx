"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudSun } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QueryError } from "@/components/data/query-error";
import { useActiveMunicipality } from "@/components/layout/municipality-context";
import { useBlockMunicipalitySync } from "@/components/layout/use-block-municipality-sync";
import { Skeleton } from "@/components/ui/skeleton";
import type { BBox } from "@/domain/municipality/types";
import { queries } from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import { formatTemperature } from "@/lib/format";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/hooks";
import { messages } from "@/lib/i18n";
import { useUrlState } from "@/lib/use-url-state";
import { BlockDiagnosticsPanel } from "./block-diagnostics-panel";
import { HeatAlertBanner } from "./heat-alert-banner";
import { HourControl, LayerSwitcher } from "./map-controls";
import { MapLegend } from "./map-legend";
import { MunicipalityOverview } from "./municipality-overview";
import { MAP_LAYER_IDS, MAP_LAYERS, type MapLayerId } from "./scales";
import { ThermalMap } from "./thermal-map";

const DEFAULT_HOUR = 14;
/** No desktop, o cartão de controles cobre ~22rem à esquerda do mapa. */
const DESKTOP_PADDING = { top: 48, bottom: 48, left: 384, right: 48 };
const [eyebrowNumber, eyebrowLabel] = messages.screens.map.eyebrow.split(" · ");
const card = "rounded-card border border-line bg-surface/95 p-4 shadow-card backdrop-blur-md";

function parseLayer(value: string | null): MapLayerId {
  return MAP_LAYER_IDS.find((id) => id === value) ?? "utci";
}

/**
 * Tela 01 · Mapa de calor. Estado na URL: `?camada=` e `?bloco=` (links compartilháveis).
 * Fluxo: geometria + atributos (uma vez) → UTCI das 11 horas (uma vez) → slider recolore.
 */
export function HeatMapScreen() {
  const municipality = useActiveMunicipality();
  const [params, setParams] = useUrlState();
  const selectedId = params.get("bloco");
  const layer = MAP_LAYERS[parseLayer(params.get("camada"))];
  const [hour, setHour] = useState(DEFAULT_HOUR);
  const reducedMotion = usePrefersReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const enabled = municipality !== null;
  const municipalityId = municipality?.id ?? "";
  const layers = useQuery({ ...queries.mapLayers(municipalityId), enabled });
  const byHour = useQuery({ ...queries.utciByHour(municipalityId), enabled });
  const selectedBlock = useQuery({ ...queries.block(selectedId ?? ""), enabled: !!selectedId });

  const asideRef = useRef<HTMLElement>(null);
  const select = useCallback((id: string | null) => setParams({ bloco: id }), [setParams]);

  // No celular o painel fica abaixo do mapa: ao selecionar, leva o leitor até ele.
  useEffect(() => {
    if (selectedId && !isDesktop) {
      asideRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    }
  }, [selectedId, isDesktop, reducedMotion]);
  useBlockMunicipalitySync(selectedBlock.data?.block, () => select(null));

  const hourValues = useMemo(() => {
    if (!byHour.data) return undefined;
    const index = byHour.data.hours.indexOf(hour);
    return new Map(Object.entries(byHour.data.values).map(([id, values]) => [id, values[index]]));
  }, [byHour.data, hour]);

  /** Enquadra a mancha de quarteirões analisados (mais justa que o bbox do município). */
  const dataBbox = useMemo((): BBox | undefined => {
    const features = layers.data?.features;
    if (!features?.length) return undefined;
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const f of features) {
      for (const [x, y] of f.geometry.coordinates[0]) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    return [minX, minY, maxX, maxY];
  }, [layers.data]);

  const ivtuCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of layers.data?.features ?? []) {
      counts[f.properties.ivtuLevel] = (counts[f.properties.ivtuLevel] ?? 0) + 1;
    }
    return counts;
  }, [layers.data]);

  if (!municipality) return <HeatMapSkeleton />;

  const weather = layers.data?.meta.weather;

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-4.5rem-1px)] lg:flex-row">
      <div className="relative flex flex-col lg:min-w-0 lg:flex-1">
        <div className="relative h-[62dvh] lg:absolute lg:inset-0 lg:h-auto">
          <ThermalMap
            label={messages.map.regionLabel(municipality.name)}
            bbox={dataBbox ?? municipality.bbox}
            fitKey={`${municipality.id}:${dataBbox ? "dados" : "municipio"}`}
            padding={isDesktop ? DESKTOP_PADDING : 24}
            features={layers.data?.features}
            layer={layer}
            hourValues={hourValues}
            selectedId={selectedId}
            onSelect={select}
            reducedMotion={reducedMotion}
          />
          {layers.isPending && (
            <div className="absolute inset-0 grid place-items-center bg-surface/40">
              <p role="status" className={cn(card, "text-sm text-fg-muted")}>
                {messages.map.loading}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 p-3 sm:p-4 lg:pointer-events-none lg:absolute lg:inset-y-4 lg:left-4 lg:w-88 lg:justify-between lg:p-0">
          <div className="flex flex-col gap-3">
            <section
              aria-labelledby="map-title"
              className={cn(card, "flex flex-col gap-4 lg:pointer-events-auto")}
            >
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium tracking-[0.18em] text-fg-muted uppercase">
                  <span className="mr-2 font-semibold text-highlight-ink">{eyebrowNumber}</span>
                  {eyebrowLabel}
                </p>
                <h1 id="map-title" className="text-xl font-bold tracking-tight text-fg">
                  {messages.screens.map.title}
                </h1>
              </div>
              <LayerSwitcher
                value={layer.id}
                onChange={(id) => setParams({ camada: id === "utci" ? null : id })}
              />
              {layer.id === "utci" && <HourControl hour={hour} onChange={setHour} />}
              {weather && (
                <p className="flex items-start gap-2 text-xs text-fg-muted">
                  <CloudSun aria-hidden className="size-4 shrink-0 text-accent" />
                  {messages.map.weather(weather.stationName, formatTemperature(weather.tMax))}
                </p>
              )}
              {layers.error && (
                <QueryError error={layers.error} onRetry={() => void layers.refetch()} />
              )}
            </section>
            <HeatAlertBanner municipalityId={municipality.id} className="lg:pointer-events-auto" />
          </div>
          <div className={cn(card, "lg:pointer-events-auto")}>
            <MapLegend
              layer={layer}
              counts={layer.kind === "categorical" ? ivtuCounts : undefined}
            />
          </div>
        </div>
      </div>

      <aside
        ref={asideRef}
        aria-label={selectedId ? messages.map.panel.label : messages.map.overview.title}
        className="border-t border-line bg-surface lg:w-104 lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-l"
      >
        {selectedId ? (
          <BlockDiagnosticsPanel
            key={selectedId}
            blockId={selectedId}
            activeHour={hour}
            onClose={() => select(null)}
          />
        ) : (
          <MunicipalityOverview
            municipality={municipality}
            features={layers.data?.features}
            onSelect={select}
          />
        )}
      </aside>
    </div>
  );
}

export function HeatMapSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col lg:h-[calc(100dvh-4.5rem-1px)] lg:flex-row">
      <span className="sr-only" role="status">
        {messages.map.loading}
      </span>
      <Skeleton className="h-[62dvh] rounded-none lg:h-auto lg:flex-1" />
      <div className="flex flex-col gap-4 p-5 lg:w-104">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
