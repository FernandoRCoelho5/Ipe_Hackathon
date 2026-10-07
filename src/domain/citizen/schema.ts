import { z } from "zod";
import { lngLatSchema } from "../shared/geo";

/**
 * Relato de ciência cidadã (WhatsApp ou web).
 * LGPD: guarda APENAS texto, coordenadas e categoria. O remetente vira um identificador
 * anônimo irreversível; telefone, nome e foto de pessoas nunca são armazenados.
 */
export const REPORT_CATEGORIES = {
  "ponto-onibus-sem-sombra": "Ponto de ônibus sem sombra",
  "asfalto-derretendo": "Asfalto derretendo",
  "calcada-sem-arvores": "Calçada sem árvores",
  "praca-sem-sombra": "Praça sem sombra",
  "calor-equipamento-publico": "Calor intenso em escola ou posto",
  alagamento: "Alagamento após chuva",
  "arvore-precisa-cuidado": "Árvore precisando de cuidado",
} as const;
export type ReportCategory = keyof typeof REPORT_CATEGORIES;
export const reportCategorySchema = z.enum(
  Object.keys(REPORT_CATEGORIES) as [ReportCategory, ...ReportCategory[]],
);

export const REPORT_STATUSES = ["pendente", "validado", "descartado", "spam"] as const;
export const reportStatusSchema = z.enum(REPORT_STATUSES);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pendente: "Pendente",
  validado: "Validado",
  descartado: "Descartado",
  spam: "Spam",
};

export const citizenReportSchema = z.object({
  id: z.string(),
  municipalityId: z.string(),
  /** Quarteirão mais próximo, quando o ponto cai dentro da área analisada. */
  blockId: z.string().nullable(),
  location: lngLatSchema,
  category: reportCategorySchema,
  text: z.string().min(1).max(500),
  createdAt: z.iso.datetime({ offset: true }),
  /** Identificador anônimo (hash irreversível do remetente). */
  anonId: z.string().regex(/^anon-[0-9a-f]{6}$/),
  channel: z.enum(["whatsapp", "web"]),
  /** Probabilidade de spam (0–1) do filtro automático. */
  spamScore: z.number().min(0).max(1),
  status: reportStatusSchema,
  /** O relato veio com foto de local (sem pessoas); só a indicação é exibida. */
  hasPhoto: z.boolean(),
});
export type CitizenReport = z.infer<typeof citizenReportSchema>;

/** Entrada de um novo relato pela web: o servidor completa id, data, anonId e spamScore. */
export const newCitizenReportSchema = z.object({
  municipalityId: z.string().min(1),
  location: lngLatSchema,
  category: reportCategorySchema,
  text: z.string().trim().min(5, "Descreva o problema em ao menos 5 caracteres").max(500),
});
export type NewCitizenReport = z.infer<typeof newCitizenReportSchema>;

/**
 * Score antispam heurístico (0–1): links, repetição de caracteres, caixa alta e
 * textos muito curtos elevam o score. No piloto, combinado a limites por remetente.
 */
export function spamScore(text: string): number {
  const t = text.trim();
  let score = 0;
  if (/https?:\/\/|www\.|\.com\b|bit\.ly/i.test(t)) score += 0.55;
  if (/(.)\1{4,}/.test(t)) score += 0.3;
  if (t.length < 12) score += 0.25;
  const letters = t.replace(/[^a-zà-ú]/gi, "");
  if (letters.length > 8 && letters === letters.toUpperCase()) score += 0.2;
  if (/promo|ganhe|grátis|gratis|clique|pix|sorteio/i.test(t)) score += 0.35;
  return Math.min(1, Math.round(score * 100) / 100);
}
