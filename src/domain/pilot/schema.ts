import { z } from "zod";

/**
 * Pedido de piloto (CTA "Solicitar piloto" da landing).
 * Único ponto em que a plataforma recebe dado pessoal: o contato institucional de quem
 * pede o piloto, com consentimento explícito e finalidade única (responder ao pedido).
 */

export const PILOT_ORGANIZATION_TYPES = {
  prefeitura: "Prefeitura",
  "governo-estadual": "Governo estadual ou autarquia",
  empresa: "Empresa",
  outro: "Outra organização",
} as const;
export type PilotOrganizationType = keyof typeof PILOT_ORGANIZATION_TYPES;
export const pilotOrganizationTypeSchema = z.enum(
  Object.keys(PILOT_ORGANIZATION_TYPES) as [PilotOrganizationType, ...PilotOrganizationType[]],
);

export const PILOT_INTERESTS = {
  diagnostico: "Mapa de calor e diagnóstico",
  prescricao: "Prescrição por quarteirão",
  relatorios: "Relatórios para editais",
  esg: "Relatório ESG corporativo",
  "ciencia-cidada": "Ciência cidadã e sensores IoT",
  adote: "Adote uma Ilha Verde",
} as const;
export type PilotInterest = keyof typeof PILOT_INTERESTS;
export const pilotInterestSchema = z.enum(
  Object.keys(PILOT_INTERESTS) as [PilotInterest, ...PilotInterest[]],
);

export const newPilotRequestSchema = z.object({
  organization: z.string().trim().min(2, "Informe a organização").max(140),
  organizationType: pilotOrganizationTypeSchema,
  municipality: z.string().trim().min(2, "Informe o município de interesse").max(80),
  contactName: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.email("Informe um e-mail válido").max(160),
  interests: z
    .array(pilotInterestSchema)
    .min(1, "Escolha ao menos um módulo")
    .max(Object.keys(PILOT_INTERESTS).length),
  message: z.string().trim().max(1000, "Use no máximo 1.000 caracteres").optional(),
  consent: z.literal(true, "É preciso autorizar o contato para enviar o pedido"),
});
export type NewPilotRequest = z.infer<typeof newPilotRequestSchema>;

/** Comprovante devolvido a quem pediu: não ecoa dados pessoais. */
export const pilotRequestReceiptSchema = z.object({
  id: z.string(),
  protocol: z.string().regex(/^IPE-\d{4}-[A-Z0-9]{6}$/),
  createdAt: z.iso.datetime({ offset: true }),
});
export type PilotRequestReceipt = z.infer<typeof pilotRequestReceiptSchema>;
