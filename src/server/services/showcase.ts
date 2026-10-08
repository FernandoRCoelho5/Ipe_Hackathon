import "server-only";
import type { IvtuLevel } from "@/domain/ivtu/ivtu";
import { EXECUTION_LEVEL_LABELS } from "@/domain/prescription/engine";
import { toLocalMeters } from "@/domain/shared/geo";
import { classifyThermalStress } from "@/domain/thermal/stress";
import { getRepositories } from "@/server/repositories";
import { diagnoseMunicipality } from "./diagnostics";

/**
 * Vitrine da landing: um recorte real dos dados demonstrativos em torno do quarteirão
 * mais crítico (1º do IVTU) do primeiro município, pronto para desenhar em SVG.
 *
 * - `blocks`: polígonos por quarteirão com a sensação térmica do pedestre (UTCI);
 * - `pixels`: o mesmo recorte como o satélite o vê — células de 30 m com a temperatura de
 *   superfície média do que cai dentro de cada uma (rua e quarteirão viram uma média).
 */

/** Recorte em metros (largura × altura) em torno do quarteirão crítico. */
const WINDOW = { width: 780, height: 480 };
const PIXEL_M = 30;
/** Amostras por eixo dentro de cada pixel (16 pontos) para a média de área. */
const SAMPLES = 4;

export interface ShowcaseBlock {
  id: string;
  code: string;
  /** Caminho SVG no sistema do recorte (metros, y para baixo). */
  path: string;
  lst: number;
  utciPeak: number;
}

export interface ShowcasePixel {
  x: number;
  y: number;
  lst: number;
}

export interface Showcase {
  municipality: string;
  neighborhood: string;
  width: number;
  height: number;
  pixelSize: number;
  focus: {
    id: string;
    code: string;
    street: string;
    utciPeak: number;
    stressLabel: string;
    ivtu: number;
    ivtuLevel: IvtuLevel;
    recommendation: { title: string; level: string } | null;
    /** Centro do quarteirão no recorte (para o rótulo do mapa). */
    anchor: [x: number, y: number];
  };
  blocks: ShowcaseBlock[];
  pixels: ShowcasePixel[];
}

type Point = [number, number];

function insidePolygon([x, y]: Point, ring: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export async function buildShowcase(): Promise<Showcase | null> {
  const [municipality] = await getRepositories().municipalities.list();
  if (!municipality) return null;
  const diagnosed = await diagnoseMunicipality(municipality.id);
  if (diagnosed.length === 0) return null;
  const focus = diagnosed.reduce((a, b) =>
    b.diagnostics.ivtu.score > a.diagnostics.ivtu.score ? b : a,
  );
  const origin = focus.block.centroid;

  // Centro do recorte: puxado em direção aos quarteirões vizinhos (o crítico pode estar na
  // borda da mancha urbana), sem tirar o crítico do terço central do recorte.
  const neighbors = diagnosed
    .map(({ block }) => toLocalMeters(block.centroid, origin))
    .filter(([x, y]) => Math.hypot(x, y) <= 450);
  const pull = (values: number[], limit: number) =>
    Math.max(-limit, Math.min(limit, values.reduce((s, v) => s + v, 0) / values.length));
  const shiftX = pull(
    neighbors.map(([x]) => x),
    WINDOW.width / 6,
  );
  const shiftY = pull(
    neighbors.map(([, y]) => y),
    WINDOW.height / 6,
  );

  // Metros locais → coordenadas do SVG (origem no canto superior esquerdo do recorte).
  const project = (lngLat: readonly [number, number]): Point => {
    const [x, y] = toLocalMeters(lngLat, origin);
    return [x - shiftX + WINDOW.width / 2, WINDOW.height / 2 - (y - shiftY)];
  };
  const inWindow = ([x, y]: Point, margin = 0) =>
    x >= -margin && x <= WINDOW.width + margin && y >= -margin && y <= WINDOW.height + margin;

  const nearby = diagnosed
    .map(({ block, diagnostics }) => ({
      block,
      diagnostics,
      ring: block.geometry.coordinates[0].map(project),
    }))
    .filter(({ ring }) => ring.some((p) => inWindow(p, 40)));

  const blocks: ShowcaseBlock[] = nearby.map(({ block, diagnostics, ring }) => ({
    id: block.id,
    code: block.code,
    path: `M${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`,
    lst: block.lstC,
    utciPeak: diagnostics.utciPeak,
  }));

  // Pixel de 30 m: média de área da temperatura de superfície. Amostras na rua (fora de
  // qualquer quarteirão) recebem a média do recorte — o satélite também as mistura.
  const meanLst = nearby.reduce((sum, n) => sum + n.block.lstC, 0) / nearby.length;
  const pixels: ShowcasePixel[] = [];
  for (let y = 0; y < WINDOW.height; y += PIXEL_M) {
    for (let x = 0; x < WINDOW.width; x += PIXEL_M) {
      let sum = 0;
      for (let i = 0; i < SAMPLES; i++) {
        for (let j = 0; j < SAMPLES; j++) {
          const point: Point = [
            x + ((i + 0.5) * PIXEL_M) / SAMPLES,
            y + ((j + 0.5) * PIXEL_M) / SAMPLES,
          ];
          const hit = nearby.find((n) => insidePolygon(point, n.ring));
          sum += hit ? hit.block.lstC : meanLst;
        }
      }
      pixels.push({ x, y, lst: Math.round((sum / SAMPLES ** 2) * 10) / 10 });
    }
  }

  const recommendation = focus.diagnostics.prescription.recommendations[0];
  return {
    municipality: municipality.name,
    neighborhood: focus.block.neighborhood,
    width: WINDOW.width,
    height: WINDOW.height,
    pixelSize: PIXEL_M,
    focus: {
      id: focus.block.id,
      code: focus.block.code,
      street: focus.block.street,
      utciPeak: focus.diagnostics.utciPeak,
      stressLabel: classifyThermalStress(focus.diagnostics.utciPeak).label,
      ivtu: focus.diagnostics.ivtu.score,
      ivtuLevel: focus.diagnostics.ivtu.level,
      recommendation: recommendation
        ? { title: recommendation.title, level: EXECUTION_LEVEL_LABELS[recommendation.level] }
        : null,
      anchor: project(origin),
    },
    blocks,
    pixels,
  };
}
