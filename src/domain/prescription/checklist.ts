import { z } from "zod";

/**
 * Checklist de validação de campo. Toda indicação do sistema é um "local potencial"
 * e só vira projeto depois desta verificação, que contorna o que o satélite não vê
 * (redes subterrâneas, fiação, acessos).
 */
export const CHECKLIST_ITEMS = {
  "fiacao-aerea": {
    label: "Fiação aérea compatível com a altura da copa (ou poda programada)",
    appliesTo: ["arborizacao"],
  },
  "largura-calcada": {
    label: "Calçada com mais de 2 m, preservando faixa livre de 1,20 m (NBR 9050)",
    appliesTo: ["arborizacao", "pavimento-permeavel"],
  },
  recuos: {
    label: "Recuos, canteiros e praças com solo livre para plantio",
    appliesTo: ["arborizacao"],
  },
  "redes-subterraneas": {
    label: "Sem interferência com redes subterrâneas (água, esgoto, gás, telecom)",
    appliesTo: ["arborizacao", "pavimento-permeavel"],
  },
  "acessos-visibilidade": {
    label: "Distância segura de esquinas, garagens, postes e sinalização",
    appliesTo: ["arborizacao"],
  },
  "drenagem-existente": {
    label: "Bocas de lobo e caimento compatíveis com piso drenante",
    appliesTo: ["pavimento-permeavel"],
  },
  "infiltracao-solo": {
    label: "Capacidade de infiltração do solo verificada (ensaio in loco)",
    appliesTo: ["pavimento-permeavel"],
  },
  "estrutura-telhado": {
    label: "Estrutura e estado da cobertura aptos à pintura atérmica",
    appliesTo: ["telhado-frio"],
  },
  "responsavel-tecnico": {
    label: "Anotação de responsabilidade técnica (ART/RRT) do profissional",
    appliesTo: ["arborizacao", "pavimento-permeavel", "telhado-frio"],
  },
} as const;

export type ChecklistItemId = keyof typeof CHECKLIST_ITEMS;
export const CHECKLIST_ITEM_IDS = Object.keys(CHECKLIST_ITEMS) as ChecklistItemId[];
export const checklistItemIdSchema = z.enum(
  CHECKLIST_ITEM_IDS as [ChecklistItemId, ...ChecklistItemId[]],
);

export const CHECKLIST_STATUSES = [
  "pendente",
  "conforme",
  "nao-conforme",
  "nao-se-aplica",
] as const;
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];

/** Checklist preenchido para um quarteirão (persistido por quarteirão). */
export const fieldChecklistSchema = z.object({
  blockId: z.string().min(1),
  items: z.partialRecord(checklistItemIdSchema, z.enum(CHECKLIST_STATUSES)),
  notes: z.string().max(2000).default(""),
  updatedAt: z.string().optional(),
});
export type FieldChecklist = z.infer<typeof fieldChecklistSchema>;

export function checklistFor(types: readonly string[]): ChecklistItemId[] {
  return CHECKLIST_ITEM_IDS.filter((id) =>
    (CHECKLIST_ITEMS[id].appliesTo as readonly string[]).some((t) => types.includes(t)),
  );
}

/** Progresso (0–1) considerando apenas os itens aplicáveis. */
export function checklistProgress(
  checklist: Pick<FieldChecklist, "items">,
  applicable: readonly ChecklistItemId[],
) {
  if (applicable.length === 0) return 1;
  const done = applicable.filter((id) => {
    const status = checklist.items[id];
    return status !== undefined && status !== "pendente";
  }).length;
  return done / applicable.length;
}
