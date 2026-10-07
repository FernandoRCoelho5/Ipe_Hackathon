import { z } from "zod";
import { crownAreaM2, SPECIES, type TreeSize } from "../prescription/species";
import { round } from "../shared/math";
import { centralCoefficients } from "../simulation/coefficients";
import { crownGrowthFactor, treePlantingSchema } from "../simulation/simulate";

/**
 * Retorno ESG de um conjunto de intervenções, para o selo do parceiro B2B e para
 * relatórios corporativos. Todas as premissas são devolvidas junto com o resultado,
 * para aparecerem por extenso no selo e nos relatórios.
 */
export const ESG_PREMISES = {
  /** kg de CO₂ sequestrado por árvore por ano, na maturidade (valores conservadores). */
  co2KgPerTreeYear: { pequeno: 8, medio: 15, grande: 25 } satisfies Record<TreeSize, number>,
  /** Sobrevivência esperada das mudas com irrigação assistida. */
  survivalRate: 0.85,
} as const;

export const esgInputSchema = z.object({
  trees: z.array(treePlantingSchema).max(20).default([]),
  permeableAreaM2: z.number().min(0).max(1_000_000).default(0),
  coolRoofAreaM2: z.number().min(0).max(1_000_000).default(0),
  horizonYears: z.number().int().min(1).max(30).default(10),
});
export type EsgInput = z.input<typeof esgInputSchema>;

export interface EsgResult {
  treesPlanted: number;
  survivingTrees: number;
  /** Área de copa (m²) no fim do horizonte. */
  greenAreaM2: number;
  /** CO₂ acumulado no horizonte (kg). */
  co2SequesteredKg: number;
  /** Sequestro anual na maturidade (kg/ano). */
  co2PerYearAtMaturityKg: number;
  /** Água de chuva que deixa de escoar por ano (m³). */
  runoffAvoidedM3PerYear: number;
  permeableAreaM2: number;
  coolRoofAreaM2: number;
  horizonYears: number;
  premises: string[];
}

export function computeEsgImpact(input: EsgInput): EsgResult {
  const parsed = esgInputSchema.parse(input);
  const c = centralCoefficients();
  const survival = ESG_PREMISES.survivalRate;

  let treesPlanted = 0;
  let greenAreaM2 = 0;
  let co2SequesteredKg = 0;
  let co2PerYearAtMaturityKg = 0;

  for (const planting of parsed.trees) {
    const species = SPECIES[planting.speciesId];
    const surviving = planting.count * survival;
    const perYear = ESG_PREMISES.co2KgPerTreeYear[species.size];
    treesPlanted += planting.count;
    greenAreaM2 +=
      surviving * crownAreaM2(species) * crownGrowthFactor(parsed.horizonYears, c.crownGrowthYears);
    co2PerYearAtMaturityKg += surviving * perYear;
    // Árvores jovens sequestram menos: o sequestro acompanha o crescimento da copa.
    for (let year = 1; year <= parsed.horizonYears; year++) {
      co2SequesteredKg += surviving * perYear * crownGrowthFactor(year, c.crownGrowthYears);
    }
  }

  const runoffAvoided =
    parsed.permeableAreaM2 * c.annualRainfallM * (c.runoffImpervious - c.runoffPermeable);

  return {
    treesPlanted,
    survivingTrees: Math.round(treesPlanted * survival),
    greenAreaM2: round(greenAreaM2, 0),
    co2SequesteredKg: round(co2SequesteredKg, 0),
    co2PerYearAtMaturityKg: round(co2PerYearAtMaturityKg, 0),
    runoffAvoidedM3PerYear: round(runoffAvoided, 0),
    permeableAreaM2: parsed.permeableAreaM2,
    coolRoofAreaM2: parsed.coolRoofAreaM2,
    horizonYears: parsed.horizonYears,
    premises: [
      `Sequestro de 8, 15 e 25 kg de CO₂ por árvore por ano na maturidade (pequeno, médio e grande porte), crescendo com a copa.`,
      `Sobrevivência de ${Math.round(survival * 100)}% das mudas, com irrigação assistida.`,
      `Precipitação anual de referência de ${c.annualRainfallM.toLocaleString("pt-BR")} m; coeficiente de escoamento de ${c.runoffImpervious.toLocaleString("pt-BR")} (asfalto) para ${c.runoffPermeable.toLocaleString("pt-BR")} (piso drenante).`,
      "Estimativas a validar no piloto.",
    ],
  };
}
