"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  LngLatBoundsLike,
  PaddingOptions,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { BBox } from "@/domain/municipality/types";
import type { BlockFeatureProperties, MapLayersResponse } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { useTheme } from "@/lib/use-theme";
import { BASEMAP_STYLES, firstSymbolLayerId, loadMapLibre, MAP_LOCALE } from "./maplibre";
import { fillColorExpression, layerColor, readableTextOn, type MapLayerConfig } from "./scales";

/**
 * Mapa térmico (MapLibre GL, ADR-002). É o único arquivo que conhece o motor do mapa:
 * trocar para Mapbox ou Deck.gl muda só esta implementação.
 *
 * - A geometria entra uma vez por município (GeoJSON com `promoteId: "id"`);
 * - o UTCI da hora escolhida chega por `feature-state` (sem rebaixar a geometria);
 * - seleção e destaque também são `feature-state`, então recolorir é instantâneo.
 */

const SOURCE_ID = "ipe-blocks";
const FILL_ID = "ipe-blocks-fill";
const LINE_ID = "ipe-blocks-line";

type Feature = MapLayersResponse["features"][number];

export interface ThermalMapProps {
  /** Área inicial e enquadramento ao trocar de município. */
  bbox: BBox;
  /** Chave do enquadramento: quando muda, o mapa reenquadra em `bbox`. */
  fitKey: string;
  /** Margens do enquadramento (px), descontando painéis sobrepostos ao mapa. */
  padding?: PaddingOptions | number;
  features: readonly Feature[] | undefined;
  layer: MapLayerConfig;
  /** UTCI da hora escolhida por quarteirão (sobrepõe a propriedade `utci`). */
  hourValues?: ReadonlyMap<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  label: string;
  reducedMotion?: boolean;
  className?: string;
}

interface HoverInfo {
  x: number;
  y: number;
  /** Largura do mapa no momento do evento (mantém o tooltip dentro da área). */
  width: number;
  properties: BlockFeatureProperties;
}

function featureBounds(feature: Feature): LngLatBoundsLike {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of feature.geometry.coordinates[0]) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

function widen(padding: PaddingOptions | number, extra: number): PaddingOptions | number {
  if (typeof padding === "number") return padding + extra;
  return {
    top: (padding.top ?? 0) + extra,
    bottom: (padding.bottom ?? 0) + extra,
    left: (padding.left ?? 0) + extra,
    right: (padding.right ?? 0) + extra,
  };
}

function toCollection(features: readonly Feature[] | undefined) {
  return { type: "FeatureCollection" as const, features: [...(features ?? [])] };
}

const isSelected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];
const isHovered: ExpressionSpecification = ["boolean", ["feature-state", "hover"], false];

export function ThermalMap({
  bbox,
  fitKey,
  padding = 32,
  features,
  layer,
  hourValues,
  selectedId,
  onSelect,
  label,
  reducedMotion = false,
  className,
}: ThermalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  /** Incrementa a cada carga de estilo (inicial ou troca de tema). */
  const [styleRevision, setStyleRevision] = useState(0);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const { resolvedTheme } = useTheme();
  const hoveredId = useRef<string | null>(null);
  const clickedId = useRef<string | null>(null);
  const highlightedId = useRef<string | null>(null);
  const appliedTheme = useRef<string | null>(null);
  const styleReady = styleRevision > 0;

  const initialView = useEffectEvent(() => ({ bbox, padding, theme: resolvedTheme }));

  const handleHover = useEffectEvent((id: string | null, x = 0, y = 0) => {
    const map = mapRef.current;
    if (!map) return;
    if (hoveredId.current !== id) {
      if (hoveredId.current) {
        map.setFeatureState({ source: SOURCE_ID, id: hoveredId.current }, { hover: false });
      }
      if (id) map.setFeatureState({ source: SOURCE_ID, id }, { hover: true });
      hoveredId.current = id;
    }
    map.getCanvas().style.cursor = id ? "pointer" : "";
    const properties = id ? features?.find((f) => f.id === id)?.properties : undefined;
    setHover(properties ? { x, y, width: map.getContainer().clientWidth, properties } : null);
  });

  const handleClick = useEffectEvent((id: string) => {
    clickedId.current = id;
    onSelect(id);
  });

  const installLayers = useEffectEvent((map: MapLibreMap) => {
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, { type: "geojson", data: toCollection(features), promoteId: "id" });
    }
    const beforeId = firstSymbolLayerId(map);
    const outline = resolvedTheme === "dark" ? "#fab20a" : "#083e28";
    if (!map.getLayer(FILL_ID)) {
      map.addLayer(
        {
          id: FILL_ID,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": fillColorExpression(layer),
            "fill-opacity": ["case", isSelected, 0.95, isHovered, 0.92, 0.78],
          },
        },
        beforeId,
      );
    }
    if (!map.getLayer(LINE_ID)) {
      map.addLayer(
        {
          id: LINE_ID,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": [
              "case",
              isSelected,
              outline,
              isHovered,
              outline,
              "rgba(8, 62, 40, 0.28)",
            ],
            "line-width": ["case", isSelected, 3, isHovered, 1.6, 0.4],
          },
        },
        beforeId,
      );
    }
  });

  const fitToMunicipality = useEffectEvent(() => {
    mapRef.current?.fitBounds(bbox, { padding, duration: reducedMotion ? 0 : 900 });
  });

  // ── Criação do mapa (uma vez) ──
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;

    void (async () => {
      const maplibre = await loadMapLibre();
      if (cancelled || !containerRef.current) return;
      const view = initialView();
      try {
        map = new maplibre.Map({
          container: containerRef.current,
          style: BASEMAP_STYLES[view.theme],
          bounds: view.bbox,
          fitBoundsOptions: { padding: view.padding },
          minZoom: 9,
          maxZoom: 18,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          attributionControl: { compact: true },
          locale: MAP_LOCALE,
        });
      } catch (error) {
        logger.warn("Mapa indisponível (WebGL)", { error: String(error) });
        setFailed(true);
        return;
      }
      appliedTheme.current = view.theme;
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibre.ScaleControl({ unit: "metric" }), "bottom-right");

      map.on("style.load", () => {
        if (map) installLayers(map);
        setStyleRevision((n) => n + 1);
      });
      map.on("mousemove", FILL_ID, (event: MapLayerMouseEvent) => {
        const id = event.features?.[0]?.id;
        if (id !== undefined) handleHover(String(id), event.point.x, event.point.y);
      });
      map.on("mouseleave", FILL_ID, () => handleHover(null));
      map.on("click", FILL_ID, (event: MapLayerMouseEvent) => {
        const id = event.features?.[0]?.id;
        if (id !== undefined) handleClick(String(id));
      });
      map.on("error", (event) => logger.warn("Erro no mapa", { error: String(event.error) }));
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Tema: troca o basemap (recarga completa dispara "style.load") ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !appliedTheme.current || appliedTheme.current === resolvedTheme) return;
    appliedTheme.current = resolvedTheme;
    map.setStyle(BASEMAP_STYLES[resolvedTheme], { diff: false });
  }, [resolvedTheme]);

  // ── Dados (troca de município) ──
  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>(SOURCE_ID);
    if (source && features) source.setData(toCollection(features));
  }, [features, styleRevision]);

  // ── Enquadramento ao trocar de município (trocar o tema não reenquadra) ──
  useEffect(() => {
    if (styleReady) fitToMunicipality();
  }, [fitKey, styleReady]);

  // ── Camada ativa ──
  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer(FILL_ID))
      map.setPaintProperty(FILL_ID, "fill-color", fillColorExpression(layer));
  }, [layer, styleRevision]);

  // ── UTCI da hora (feature-state) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource(SOURCE_ID) || !hourValues || !features) return;
    for (const [id, utci] of hourValues) {
      map.setFeatureState({ source: SOURCE_ID, id }, { utci });
    }
  }, [hourValues, features, styleRevision]);

  // ── Seleção ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource(SOURCE_ID) || !features) return;
    if (highlightedId.current) {
      map.setFeatureState({ source: SOURCE_ID, id: highlightedId.current }, { selected: false });
    }
    highlightedId.current = selectedId;
    if (!selectedId) return;
    map.setFeatureState({ source: SOURCE_ID, id: selectedId }, { selected: true });
    // Seleção vinda de fora do mapa (lista, URL): leva o quarteirão para a vista.
    if (clickedId.current !== selectedId) {
      const feature = features.find((f) => f.id === selectedId);
      if (feature) {
        map.fitBounds(featureBounds(feature), {
          padding: widen(padding, 96),
          maxZoom: 15.5,
          duration: reducedMotion ? 0 : 900,
        });
      }
    }
    clickedId.current = null;
  }, [selectedId, features, styleRevision, reducedMotion, padding]);

  const hoverValue = hover
    ? layer.property === "utci"
      ? (hourValues?.get(hover.properties.id) ?? hover.properties.utci)
      : hover.properties[layer.property]
    : null;
  const hoverColor = hoverValue === null ? null : layerColor(layer, hoverValue);

  return (
    <div
      className={cn("relative isolate h-full w-full overflow-hidden bg-surface-sunken", className)}
    >
      <div ref={containerRef} role="region" aria-label={label} className="h-full w-full" />
      {failed && (
        <div className="absolute inset-0 grid place-items-center p-6">
          <p className="max-w-sm text-center text-sm text-fg-muted">{messages.map.webglError}</p>
        </div>
      )}
      {hover && hoverValue !== null && hoverColor && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-60 rounded-control border border-line bg-surface/95 p-3 text-xs shadow-pop backdrop-blur-sm"
          style={{
            left: Math.max(8, Math.min(hover.x + 14, hover.width - 248)),
            top: Math.max(8, hover.y - 110),
          }}
        >
          <p className="font-semibold text-fg">
            {hover.properties.code} · {hover.properties.street}
          </p>
          <p className="text-fg-muted">{hover.properties.neighborhood}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 font-semibold tabular"
              style={{ backgroundColor: hoverColor, color: readableTextOn(hoverColor) }}
            >
              {layer.format(hoverValue)}
            </span>
            <span className="text-fg">{layer.describe(hoverValue)}</span>
          </p>
          <p className="mt-2 text-fg-subtle">{messages.map.tooltipHint}</p>
        </div>
      )}
    </div>
  );
}
