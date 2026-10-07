import { z } from "zod";

/** Coordenada GeoJSON: [longitude, latitude] em WGS 84. */
export const lngLatSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export type LngLat = [lng: number, lat: number];
/** Aceita tuplas somente leitura nos parâmetros (ex.: constantes `as const`). */
export type LngLatLike = readonly [lng: number, lat: number];

/** Caixa delimitadora GeoJSON: [oeste, sul, leste, norte]. */
export const bboxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);
export type BBox = [west: number, south: number, east: number, north: number];
export type BBoxLike = readonly [west: number, south: number, east: number, north: number];

/** Polígono GeoJSON simples (um anel externo fechado). */
export const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(lngLatSchema).min(4)).min(1),
});
export type Polygon = { type: "Polygon"; coordinates: LngLat[][] };

const EARTH_RADIUS_M = 6_371_008.8;
const METERS_PER_DEGREE_LAT = 111_320;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distância geodésica (haversine) em metros. */
export function distanceMeters(a: LngLatLike, b: LngLatLike): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Projeção local equiretangular em metros a partir de uma origem.
 * Precisa o bastante (erro < 0,1%) na escala de uma cidade.
 */
export function toLocalMeters(point: LngLatLike, origin: LngLatLike): [x: number, y: number] {
  const x = (point[0] - origin[0]) * METERS_PER_DEGREE_LAT * Math.cos(toRad(origin[1]));
  const y = (point[1] - origin[1]) * METERS_PER_DEGREE_LAT;
  return [x, y];
}

export function fromLocalMeters(x: number, y: number, origin: LngLatLike): LngLat {
  const lng = origin[0] + x / (METERS_PER_DEGREE_LAT * Math.cos(toRad(origin[1])));
  const lat = origin[1] + y / METERS_PER_DEGREE_LAT;
  return [lng, lat];
}

/** Distância em metros de um ponto a uma polilinha (projeção local). */
export function distanceToPolylineMeters(point: LngLatLike, line: readonly LngLatLike[]): number {
  if (line.length === 0) return Number.POSITIVE_INFINITY;
  const [px, py] = toLocalMeters(point, point);
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = toLocalMeters(line[i], point);
    const [bx, by] = toLocalMeters(line[i + 1], point);
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    const t =
      lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    best = Math.min(best, Math.hypot(px - cx, py - cy));
  }
  if (line.length === 1) {
    const [ax, ay] = toLocalMeters(line[0], point);
    best = Math.hypot(px - ax, py - ay);
  }
  return best;
}

/** Área (m²) de um anel em coordenadas geográficas, pela fórmula do laço em projeção local. */
export function ringAreaMeters(ring: readonly LngLatLike[]): number {
  if (ring.length < 4) return 0;
  const origin = ring[0];
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = toLocalMeters(ring[i], origin);
    const [x2, y2] = toLocalMeters(ring[i + 1], origin);
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

/** Perímetro (m) de um anel. */
export function ringPerimeterMeters(ring: readonly LngLatLike[]): number {
  let perimeter = 0;
  for (let i = 0; i < ring.length - 1; i++) perimeter += distanceMeters(ring[i], ring[i + 1]);
  return perimeter;
}

/** Centróide simples (média dos vértices, sem repetir o ponto de fechamento). */
export function ringCentroid(ring: readonly LngLatLike[]): LngLat {
  const points = ring.slice(0, -1);
  const lng = points.reduce((acc, p) => acc + p[0], 0) / points.length;
  const lat = points.reduce((acc, p) => acc + p[1], 0) / points.length;
  return [lng, lat];
}

export function bboxContains(bbox: BBoxLike, point: LngLatLike): boolean {
  return point[0] >= bbox[0] && point[0] <= bbox[2] && point[1] >= bbox[1] && point[1] <= bbox[3];
}
