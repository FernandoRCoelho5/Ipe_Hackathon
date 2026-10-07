import { z } from "zod";
import { lngLatSchema, polygonSchema } from "../shared/geo";

export const ZONES = ["comercial", "residencial", "misto", "industrial", "verde"] as const;
export const zoneSchema = z.enum(ZONES);
export type Zone = z.infer<typeof zoneSchema>;

export const ZONE_LABELS: Record<Zone, string> = {
  comercial: "Comercial",
  residencial: "Residencial",
  misto: "Uso misto",
  industrial: "Industrial",
  verde: "Área verde / praça",
};

const share = z.number().min(0).max(1);

/**
 * Quarteirão: unidade de análise do Ipê.
 * Os atributos são OBSERVADOS ou ESTIMADOS a partir das fontes do pipeline
 * (satélite, OSM, IBGE/Ipea). Tudo o que é derivado por modelo (UTCI, IVTU,
 * prescrição) é calculado no domínio e não fica armazenado aqui.
 */
export const blockSchema = z.object({
  id: z.string(),
  municipalityId: z.string(),
  /** Código curto exibido em tabelas: "VR-0042". */
  code: z.string(),
  neighborhood: z.string(),
  /** Logradouro principal (face de maior circulação). */
  street: z.string(),
  zone: zoneSchema,
  geometry: polygonSchema,
  centroid: lngLatSchema,
  areaM2: z.number().positive(),
  perimeterM: z.number().positive(),

  // Superfície — sensoriamento remoto (Landsat 8/9, Sentinel-2)
  /** LST (°C), composição de verão na passagem do satélite (~10h local). */
  lstC: z.number().min(10).max(75),
  ndvi: z.number().min(-0.2).max(1),
  /** Cobertura arbórea do quarteirão (0–1). */
  canopyCover: share,
  /** Sombreamento arbóreo sobre as calçadas (0–1). */
  streetCanopy: share,
  /** Sombra projetada por edificações no pico solar (0–1). */
  buildingShade: share,
  imperviousness: share,
  /** Fração de telhados metálicos ou de fibrocimento na área coberta. */
  roofMetalShare: share,
  roofAreaM2: z.number().min(0),
  /** Solo livre em canteiros, praças e recuos — base dos "locais potenciais". */
  freeSoilShare: share,
  sidewalkWidthM: z.number().min(0).max(15),
  /** Exposição ao vento (1 = campo aberto; < 1 = cânion urbano). */
  windExposure: z.number().min(0.2).max(1.3),

  // Drenagem (OSM + DEM)
  distanceToRiverM: z.number().min(0),
  slopePct: z.number().min(0).max(60),

  // Mobilidade e vulnerabilidade social (IBGE/Ipea por setor censitário)
  /** Pedestres por hora no pico (estimativa). */
  pedestrianFlow: z.number().min(0),
  population: z.number().int().min(0),
  densityPerKm2: z.number().min(0),
  elderlyShare: share,
  /** Renda domiciliar per capita (R$/mês). */
  incomePerCapita: z.number().min(0),
});
export type Block = z.infer<typeof blockSchema>;
