import { z } from "zod";
import { simulationScenarioSchema } from "./simulate";

/** Cenário de projeto salvo pelo técnico; aparece nos relatórios para editais. */
export const saveScenarioSchema = z.object({
  name: z.string().trim().min(3, "Dê um nome ao cenário").max(80),
  municipalityId: z.string().min(1),
  scenario: simulationScenarioSchema,
});
export type SaveScenarioInput = z.input<typeof saveScenarioSchema>;

export const savedScenarioSchema = saveScenarioSchema.extend({
  id: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  /** Resumo congelado no momento do salvamento (para o relatório). */
  summary: z.object({
    blockCode: z.string(),
    blockLabel: z.string(),
    peakUtciDelta: z.number(),
    peakUtciDeltaRange: z.tuple([z.number(), z.number()]),
    runoffChange: z.number(),
    evapotranspirationChange: z.number(),
    plantedTrees: z.number(),
    permeableAreaM2: z.number(),
    coolRoofAreaM2: z.number(),
  }),
});
export type SavedScenario = z.infer<typeof savedScenarioSchema>;
