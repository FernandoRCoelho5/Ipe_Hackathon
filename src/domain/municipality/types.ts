import { z } from "zod";
import { bboxSchema, lngLatSchema } from "../shared/geo";

export type { BBox, LngLat } from "../shared/geo";

/**
 * Município atendido. A plataforma escala trocando apenas estes dados
 * (nome + bounding box + centro + zoom); nada disso fica fixo na interface.
 */
export const municipalitySchema = z.object({
  /** Identificador estável em kebab-case, usado em URLs e filtros. */
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  state: z.string().length(2),
  /** Código IBGE de 7 dígitos. */
  ibgeCode: z.string().regex(/^\d{7}$/),
  population: z.number().int().positive(),
  populationYear: z.number().int(),
  center: lngLatSchema,
  bbox: bboxSchema,
  /** Zoom inicial sugerido para enquadrar a área urbana. */
  defaultZoom: z.number().min(1).max(20),
});
export type Municipality = z.infer<typeof municipalitySchema>;
