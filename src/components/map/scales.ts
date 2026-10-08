import type { ExpressionSpecification } from "maplibre-gl";
import { DEFAULT_IVTU_CONFIG, IVTU_LEVEL_LABELS, type IvtuLevel } from "@/domain/ivtu/ivtu";
import { classifyThermalStress } from "@/domain/thermal/stress";
import type { BlockFeatureProperties } from "@/lib/api/contracts";
import { formatDecimal, formatPercent, formatTemperature } from "@/lib/format";

/**
 * Escalas de cor das camadas do mapa, das tabelas e dos gráficos.
 *
 * As faixas são FIXAS (não relativas ao conjunto): a mesma cor significa o mesmo valor
 * em qualquer hora, município ou ano, e o slider de horário mostra a cidade aquecendo.
 * As cores térmicas espelham os tokens `--color-thermal-*` de src/app/globals.css.
 */

export const THERMAL_COLORS = [
  "#1e842d",
  "#82b930",
  "#fab20a",
  "#fa6f14",
  "#d2381c",
  "#8c1c13",
] as const;

export type ColorStop = readonly [value: number, color: string];

export const MAP_LAYER_IDS = ["utci", "lst", "ivtu", "canopy", "drainage"] as const;
export type MapLayerId = (typeof MAP_LAYER_IDS)[number];

interface LayerBase {
  id: MapLayerId;
  label: string;
  shortLabel: string;
  description: string;
  /** Valor do quarteirão formatado com unidade (tooltip, painel, legenda). */
  format: (value: number) => string;
  /** Rótulo qualitativo que acompanha a cor (leitura sem depender só dela). */
  describe: (value: number) => string;
}

export interface ContinuousLayer extends LayerBase {
  kind: "continuous";
  property: "utci" | "lstC" | "canopyCover" | "drainageRisk";
  stops: readonly ColorStop[];
  /** Marcas exibidas sob a barra de gradiente. */
  ticks: readonly number[];
}

export interface CategoricalLayer extends LayerBase {
  kind: "categorical";
  property: "ivtu";
  classes: readonly { id: IvtuLevel; label: string; range: string; color: string }[];
}

export type MapLayerConfig = ContinuousLayer | CategoricalLayer;

const T = DEFAULT_IVTU_CONFIG.thresholds;

export const IVTU_LEVEL_COLORS: Record<IvtuLevel, string> = {
  baixo: THERMAL_COLORS[0],
  medio: THERMAL_COLORS[2],
  alto: THERMAL_COLORS[3],
  critico: THERMAL_COLORS[4],
};

export function ivtuLevelFor(score: number): IvtuLevel {
  if (score >= T.critical) return "critico";
  if (score >= T.high) return "alto";
  if (score >= T.medium) return "medio";
  return "baixo";
}

function qualitative(value: number, cuts: readonly number[], labels: readonly string[]) {
  const index = cuts.findIndex((cut) => value < cut);
  return labels[index === -1 ? labels.length - 1 : index];
}

export const MAP_LAYERS: Record<MapLayerId, MapLayerConfig> = {
  utci: {
    id: "utci",
    kind: "continuous",
    label: "Sensação térmica (UTCI)",
    shortLabel: "UTCI",
    description: "Como o pedestre sente o calor na hora escolhida: ar, sol, vento e umidade.",
    property: "utci",
    stops: [
      [26, THERMAL_COLORS[0]],
      [30, THERMAL_COLORS[1]],
      [34, THERMAL_COLORS[2]],
      [38, THERMAL_COLORS[3]],
      [42, THERMAL_COLORS[4]],
      [46, THERMAL_COLORS[5]],
    ],
    ticks: [26, 32, 38, 46],
    format: (v) => formatTemperature(v),
    describe: (v) => classifyThermalStress(v).label,
  },
  lst: {
    id: "lst",
    kind: "continuous",
    label: "Temperatura de superfície",
    shortLabel: "Superfície",
    description: "Temperatura do chão e dos telhados medida por satélite (Landsat, ~10h).",
    property: "lstC",
    stops: [
      [25, THERMAL_COLORS[0]],
      [30, THERMAL_COLORS[1]],
      [35, THERMAL_COLORS[2]],
      [40, THERMAL_COLORS[3]],
      [45, THERMAL_COLORS[4]],
      [50, THERMAL_COLORS[5]],
    ],
    ticks: [25, 30, 35, 40, 45, 50],
    format: (v) => formatTemperature(v),
    describe: (v) =>
      qualitative(v, [30, 38, 45], ["Superfície amena", "Quente", "Muito quente", "Escaldante"]),
  },
  ivtu: {
    id: "ivtu",
    kind: "categorical",
    label: "Vulnerabilidade (IVTU)",
    shortLabel: "IVTU",
    description:
      "Índice 0–100 que combina calor, circulação de pedestres e vulnerabilidade social.",
    property: "ivtu",
    classes: [
      {
        id: "critico",
        label: IVTU_LEVEL_LABELS.critico,
        range: `≥ ${T.critical}`,
        color: IVTU_LEVEL_COLORS.critico,
      },
      {
        id: "alto",
        label: IVTU_LEVEL_LABELS.alto,
        range: `${T.high}–${T.critical}`,
        color: IVTU_LEVEL_COLORS.alto,
      },
      {
        id: "medio",
        label: IVTU_LEVEL_LABELS.medio,
        range: `${T.medium}–${T.high}`,
        color: IVTU_LEVEL_COLORS.medio,
      },
      {
        id: "baixo",
        label: IVTU_LEVEL_LABELS.baixo,
        range: `< ${T.medium}`,
        color: IVTU_LEVEL_COLORS.baixo,
      },
    ],
    format: (v) => formatDecimal(v),
    describe: (v) => `Vulnerabilidade ${IVTU_LEVEL_LABELS[ivtuLevelFor(v)].toLowerCase()}`,
  },
  canopy: {
    id: "canopy",
    kind: "continuous",
    label: "Cobertura arbórea",
    shortLabel: "Árvores",
    description:
      "Fração do quarteirão sob copa de árvores (Sentinel-2). Abaixo de 30% falta sombra.",
    property: "canopyCover",
    stops: [
      [0, "#f1e7c4"],
      [0.1, "#d6e39a"],
      [0.2, "#a5cf5c"],
      [0.3, "#82b930"],
      [0.45, "#1e842d"],
      [0.6, "#0b4f33"],
    ],
    ticks: [0, 0.15, 0.3, 0.45, 0.6],
    format: (v) => formatPercent(v),
    describe: (v) =>
      qualitative(
        v,
        [0.1, 0.2, 0.3],
        ["Quase sem árvores", "Pouca sombra", "Sombra parcial", "Bem arborizado"],
      ),
  },
  drainage: {
    id: "drainage",
    kind: "continuous",
    label: "Risco de alagamento",
    shortLabel: "Drenagem",
    description: "Proximidade do Paraíba do Sul, impermeabilização e relevo plano (0–100%).",
    property: "drainageRisk",
    stops: [
      [0, "#e3f3f7"],
      [0.25, "#a9dcea"],
      [0.5, "#159ebf"],
      [0.75, "#046a8f"],
      [1, "#033d52"],
    ],
    ticks: [0, 0.25, 0.5, 0.75, 1],
    format: (v) => formatPercent(v),
    describe: (v) =>
      qualitative(
        v,
        [0.3, 0.5, 0.7],
        ["Risco baixo", "Risco moderado", "Risco alto", "Risco muito alto"],
      ),
  },
};

export function layerValue(layer: MapLayerConfig, properties: BlockFeatureProperties): number {
  return properties[layer.property];
}

// ─────────────────────────── Cores ───────────────────────────

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex(rgb: readonly number[]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

/** Cor interpolada linearmente em RGB (o mesmo que a expressão `interpolate` do MapLibre). */
export function colorAt(stops: readonly ColorStop[], value: number): string {
  if (value <= stops[0][0]) return stops[0][1];
  const last = stops[stops.length - 1];
  if (value >= last[0]) return last[1];
  const upper = stops.findIndex(([v]) => v > value);
  const [v0, c0] = stops[upper - 1];
  const [v1, c1] = stops[upper];
  const t = (value - v0) / (v1 - v0);
  const a = parseHex(c0);
  const b = parseHex(c1);
  return toHex(a.map((channel, i) => channel + (b[i] - channel) * t));
}

export function layerColor(layer: MapLayerConfig, value: number): string {
  return layer.kind === "categorical"
    ? IVTU_LEVEL_COLORS[ivtuLevelFor(value)]
    : colorAt(layer.stops, value);
}

export function utciColor(utci: number): string {
  return colorAt((MAP_LAYERS.utci as ContinuousLayer).stops, utci);
}

export function lstColor(lst: number): string {
  return colorAt((MAP_LAYERS.lst as ContinuousLayer).stops, lst);
}

/** Luminância relativa (WCAG 2.1). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Texto legível sobre uma cor de dado: Verde Ipê ou branco, o de maior contraste. */
export function readableTextOn(background: string): "#083e28" | "#ffffff" {
  return contrastRatio(background, "#083e28") >= contrastRatio(background, "#ffffff")
    ? "#083e28"
    : "#ffffff";
}

// ─────────────────────────── Expressões do MapLibre ───────────────────────────

/**
 * Cor de preenchimento da camada. No UTCI, o valor da hora vem do `feature-state`
 * (definido pelo slider) e cai para a propriedade do GeoJSON enquanto ele não existe.
 */
export function fillColorExpression(layer: MapLayerConfig): ExpressionSpecification {
  if (layer.kind === "categorical") {
    return [
      "match",
      ["get", "ivtuLevel"],
      ...layer.classes.flatMap((c) => [c.id, c.color]),
      "#cccccc",
    ] as unknown as ExpressionSpecification;
  }
  const input: ExpressionSpecification =
    layer.property === "utci"
      ? ["coalesce", ["feature-state", "utci"], ["get", "utci"]]
      : ["get", layer.property];
  return ["interpolate", ["linear"], input, ...layer.stops.flat()] as ExpressionSpecification;
}
