/**
 * Infraestrutura comum dos mapas MapLibre (ADR-002, ADR-016): carregamento sob demanda,
 * worker servido do próprio domínio, basemaps por tema e controles em português.
 */

export const BASEMAP_STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

export const MAP_LOCALE: Record<string, string> = {
  "AttributionControl.ToggleAttribution": "Mostrar ou ocultar créditos do mapa",
  "AttributionControl.MapFeedback": "Sugerir correção no mapa",
  "Map.Title": "Mapa",
  "NavigationControl.ZoomIn": "Aproximar",
  "NavigationControl.ZoomOut": "Afastar",
  "NavigationControl.ResetBearing": "Girar o mapa; clique para voltar ao norte",
  "ScaleControl.Meters": "m",
  "ScaleControl.Kilometers": "km",
  "CooperativeGesturesHandler.WindowsHelpText": "Use Ctrl + rolagem para aproximar o mapa",
  "CooperativeGesturesHandler.MacHelpText": "Use ⌘ + rolagem para aproximar o mapa",
  "CooperativeGesturesHandler.MobileHelpText": "Use dois dedos para mover o mapa",
};

/** Importa o MapLibre só no navegador e aponta o worker para /vendor (mesmo domínio). */
export async function loadMapLibre() {
  const maplibre = await import("maplibre-gl");
  maplibre.setWorkerUrl(`/vendor/maplibre-gl-worker.mjs?v=${maplibre.getVersion()}`);
  return maplibre;
}

/** Primeira camada de rótulos do basemap: nossas camadas entram abaixo dela. */
export function firstSymbolLayerId(map: import("maplibre-gl").Map): string | undefined {
  return map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
}
