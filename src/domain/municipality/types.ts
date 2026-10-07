/** Coordenada geográfica no padrão GeoJSON: [longitude, latitude] (WGS 84). */
export type LngLat = readonly [lng: number, lat: number];

/** Caixa delimitadora no padrão GeoJSON: [oeste, sul, leste, norte]. */
export type BBox = readonly [west: number, south: number, east: number, north: number];

/**
 * Município atendido. A plataforma escala trocando apenas estes dados
 * (nome + bounding box + centro + zoom); nada disso fica fixo na interface.
 */
export interface Municipality {
  /** Identificador estável em kebab-case, usado em URLs e filtros. */
  id: string;
  name: string;
  state: string;
  /** Código IBGE de 7 dígitos. */
  ibgeCode: string;
  population: number;
  populationYear: number;
  center: LngLat;
  bbox: BBox;
  /** Zoom inicial sugerido para enquadrar a área urbana. */
  defaultZoom: number;
}
