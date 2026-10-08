"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  MapMouseEvent,
} from "maplibre-gl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { BBox, LngLat } from "@/domain/municipality/types";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { useTheme } from "@/lib/use-theme";
import { BASEMAP_STYLES, firstSymbolLayerId, loadMapLibre, MAP_LOCALE } from "./maplibre";

/**
 * Mapa de pontos (relatos cidadãos e sensores IoT). Mesmo motor do mapa térmico;
 * seleção por `feature-state` e, opcionalmente, escolha de um local com clique.
 */

export interface MapPoint {
  id: string;
  location: LngLat;
  kind: "report" | "sensor";
  color: string;
  /** Texto do tooltip (o valor nunca depende só da cor). */
  label: string;
}

interface PointsMapProps {
  bbox: BBox;
  fitKey: string;
  points: readonly MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Local escolhido pelo usuário (novo relato). */
  picked?: LngLat | null;
  onPick?: (location: LngLat) => void;
  label: string;
  className?: string;
}

const POINTS = "ipe-points";
const POINTS_LAYER = "ipe-points-circle";
const PICKED = "ipe-picked";
const PICKED_LAYER = "ipe-picked-circle";

const selected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];

function toCollection(points: readonly MapPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((p) => ({
      type: "Feature" as const,
      id: p.id,
      geometry: { type: "Point" as const, coordinates: [...p.location] },
      properties: { id: p.id, kind: p.kind, color: p.color },
    })),
  };
}

function pickedCollection(picked: LngLat | null | undefined) {
  return {
    type: "FeatureCollection" as const,
    features: picked
      ? [
          {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [...picked] },
            properties: {},
          },
        ]
      : [],
  };
}

export function PointsMap({
  bbox,
  fitKey,
  points,
  selectedId,
  onSelect,
  picked,
  onPick,
  label,
  className,
}: PointsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [styleRevision, setStyleRevision] = useState(0);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const { resolvedTheme } = useTheme();
  const appliedTheme = useRef<string | null>(null);
  const highlighted = useRef<string | null>(null);
  const styleReady = styleRevision > 0;

  const initial = useEffectEvent(() => ({ bbox, theme: resolvedTheme }));

  const install = useEffectEvent((map: MapLibreMap) => {
    const ring = resolvedTheme === "dark" ? "#061b13" : "#ffffff";
    const beforeId = firstSymbolLayerId(map);
    if (!map.getSource(POINTS)) {
      map.addSource(POINTS, { type: "geojson", data: toCollection(points), promoteId: "id" });
    }
    if (!map.getSource(PICKED)) {
      map.addSource(PICKED, { type: "geojson", data: pickedCollection(picked) });
    }
    if (!map.getLayer(POINTS_LAYER)) {
      map.addLayer(
        {
          id: POINTS_LAYER,
          type: "circle",
          source: POINTS,
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": ["case", selected, 11, ["==", ["get", "kind"], "sensor"], 8, 5.5],
            "circle-stroke-color": ["case", selected, "#fab20a", ring],
            "circle-stroke-width": ["case", selected, 3, ["==", ["get", "kind"], "sensor"], 3, 1.5],
          },
        },
        beforeId,
      );
    }
    if (!map.getLayer(PICKED_LAYER)) {
      map.addLayer({
        id: PICKED_LAYER,
        type: "circle",
        source: PICKED,
        paint: {
          "circle-color": "#fab20a",
          "circle-radius": 9,
          "circle-stroke-color": "#083e28",
          "circle-stroke-width": 3,
        },
      });
    }
  });

  const handleHover = useEffectEvent((id: string | null, x = 0, y = 0) => {
    const map = mapRef.current;
    if (!map) return;
    const point = id ? points.find((p) => p.id === id) : undefined;
    map.getCanvas().style.cursor = point ? "pointer" : onPick ? "crosshair" : "";
    setHover(point ? { x, y, text: point.label } : null);
  });

  const handleClick = useEffectEvent((event: MapMouseEvent) => {
    const map = mapRef.current;
    if (!map) return;
    const hit = map.queryRenderedFeatures(event.point, { layers: [POINTS_LAYER] })[0];
    if (hit?.id !== undefined) {
      onSelect?.(String(hit.id));
      return;
    }
    onPick?.([Math.round(event.lngLat.lng * 1e6) / 1e6, Math.round(event.lngLat.lat * 1e6) / 1e6]);
  });

  const fit = useEffectEvent(() => mapRef.current?.fitBounds(bbox, { padding: 24, duration: 600 }));

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    void (async () => {
      const maplibre = await loadMapLibre();
      if (cancelled || !containerRef.current) return;
      const view = initial();
      try {
        map = new maplibre.Map({
          container: containerRef.current,
          style: BASEMAP_STYLES[view.theme],
          bounds: view.bbox,
          fitBoundsOptions: { padding: 24 },
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
      map.on("style.load", () => {
        if (map) install(map);
        setStyleRevision((n) => n + 1);
      });
      map.on("mousemove", POINTS_LAYER, (e: MapLayerMouseEvent) => {
        const id = e.features?.[0]?.id;
        handleHover(id === undefined ? null : String(id), e.point.x, e.point.y);
      });
      map.on("mouseleave", POINTS_LAYER, () => handleHover(null));
      map.on("click", (e) => handleClick(e));
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !appliedTheme.current || appliedTheme.current === resolvedTheme) return;
    appliedTheme.current = resolvedTheme;
    map.setStyle(BASEMAP_STYLES[resolvedTheme], { diff: false });
  }, [resolvedTheme]);

  useEffect(() => {
    mapRef.current?.getSource<GeoJSONSource>(POINTS)?.setData(toCollection(points));
  }, [points, styleRevision]);

  useEffect(() => {
    mapRef.current?.getSource<GeoJSONSource>(PICKED)?.setData(pickedCollection(picked));
  }, [picked, styleRevision]);

  // Reenquadra só quando o município muda, não a cada troca de tema.
  useEffect(() => {
    if (styleReady) fit();
  }, [fitKey, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource(POINTS)) return;
    if (highlighted.current) {
      map.setFeatureState({ source: POINTS, id: highlighted.current }, { selected: false });
    }
    highlighted.current = selectedId ?? null;
    if (selectedId) {
      map.setFeatureState({ source: POINTS, id: selectedId }, { selected: true });
      const point = points.find((p) => p.id === selectedId);
      if (point && !map.getBounds().contains(point.location)) {
        map.easeTo({ center: point.location, duration: 600 });
      }
    }
  }, [selectedId, points, styleRevision]);

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
      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 max-w-64 rounded-control border border-line bg-surface/95 px-3 py-2 text-xs text-fg shadow-pop"
          style={{ left: hover.x + 12, top: Math.max(8, hover.y - 48) }}
        >
          {hover.text}
        </div>
      )}
    </div>
  );
}
