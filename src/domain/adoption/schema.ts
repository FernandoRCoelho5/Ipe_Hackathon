import { z } from "zod";
import { treePlantingSchema } from "../simulation/simulate";

/** "Adote uma Ilha Verde": parceria público-privada de manutenção de uma área. */
export const PARTNER_TYPES = {
  industria: "Indústria",
  comercio: "Comércio local",
  construtora: "Construtora",
  shopping: "Shopping",
  logistica: "Logística",
  servicos: "Serviços",
} as const;
export type PartnerType = keyof typeof PARTNER_TYPES;
export const partnerTypeSchema = z.enum(
  Object.keys(PARTNER_TYPES) as [PartnerType, ...PartnerType[]],
);

export const ndviObservationSchema = z.object({
  date: z.iso.date(),
  ndvi: z.number().min(-0.2).max(1),
  sensor: z.enum(["Sentinel-2", "Landsat 8/9"]),
  /** Observação descartada por nuvem (exibida esmaecida). */
  cloudy: z.boolean(),
});
export type NdviObservation = z.infer<typeof ndviObservationSchema>;

export const MAINTENANCE_TYPES = {
  irrigacao: "Irrigação",
  poda: "Poda de formação",
  adubacao: "Adubação",
  "reposicao-muda": "Reposição de muda",
  "vistoria-pavimento": "Vistoria do pavimento permeável",
  "limpeza-jardim-chuva": "Limpeza do jardim de chuva",
} as const;
export type MaintenanceType = keyof typeof MAINTENANCE_TYPES;
export const maintenanceTypeSchema = z.enum(
  Object.keys(MAINTENANCE_TYPES) as [MaintenanceType, ...MaintenanceType[]],
);

export const maintenanceTaskSchema = z.object({
  id: z.string(),
  type: maintenanceTypeSchema,
  dueDate: z.iso.date(),
  status: z.enum(["concluida", "pendente", "atrasada"]),
  /** Gerada pelo modelo preditivo (queda de NDVI, calor extremo), e não pelo calendário fixo. */
  predicted: z.boolean(),
  reason: z.string(),
});
export type MaintenanceTask = z.infer<typeof maintenanceTaskSchema>;

export const adoptionSchema = z.object({
  id: z.string(),
  municipalityId: z.string(),
  blockId: z.string(),
  areaName: z.string(),
  partnerName: z.string(),
  partnerType: partnerTypeSchema,
  status: z.enum(["ativa", "em-implantacao"]),
  adoptedAt: z.iso.date(),
  commitments: z.object({
    trees: z.array(treePlantingSchema),
    permeableAreaM2: z.number().min(0),
    coolRoofAreaM2: z.number().min(0),
    maintenanceMonths: z.number().int().min(1).max(120),
  }),
  ndviSeries: z.array(ndviObservationSchema),
  maintenance: z.array(maintenanceTaskSchema),
});
export type Adoption = z.infer<typeof adoptionSchema>;

/** Cadastro de nova parceria (formulário). */
export const newAdoptionSchema = z.object({
  municipalityId: z.string().min(1),
  blockId: z.string().min(1, "Selecione a área adotada"),
  partnerName: z.string().trim().min(3, "Informe o nome da organização").max(120),
  partnerType: partnerTypeSchema,
  trees: z.array(treePlantingSchema).max(10).default([]),
  permeableAreaM2: z.number().min(0).max(100_000).default(0),
  coolRoofAreaM2: z.number().min(0).max(100_000).default(0),
  maintenanceMonths: z.number().int().min(6).max(120).default(24),
});
export type NewAdoption = z.infer<typeof newAdoptionSchema>;

/**
 * Tendência de NDVI (variação por 30 dias) por regressão linear nas observações sem nuvem.
 * Positiva = área ficando mais verde.
 */
export function ndviTrendPer30Days(series: readonly NdviObservation[]): number {
  const valid = series.filter((o) => !o.cloudy);
  if (valid.length < 2) return 0;
  const t0 = new Date(valid[0].date).getTime();
  const xs = valid.map((o) => (new Date(o.date).getTime() - t0) / 86_400_000);
  const ys = valid.map((o) => o.ndvi);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : (num / den) * 30;
}
