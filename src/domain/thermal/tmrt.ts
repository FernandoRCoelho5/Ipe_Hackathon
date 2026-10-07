import { clamp01 } from "../shared/math";

/**
 * Temperatura radiante média (Tmrt) do pedestre, estimada a partir de:
 *  - radiação solar global (ondas curtas), atenuada pelo sombreamento;
 *  - temperatura de superfície (LST), que irradia ondas longas para o pedestre.
 *
 *   Tmrt ≈ Ta + a_sw · S · (1 − η · sombra) + a_lw · (Tsup − Ta)
 *
 * Com S = 900 W/m² ao sol pleno, o termo solar soma ≈ 30 °C a Ta, ordem de grandeza
 * observada em medições de Tmrt em cânions urbanos tropicais. A sombra de copa densa
 * remove ≈ 85% desse ganho (a radiação difusa permanece).
 */
export const TMRT_MODEL = {
  /** °C de Tmrt por W/m² de radiação solar global. */
  shortwaveGain: 0.034,
  /** Fração do ganho solar removida por sombra total. */
  shadeEfficacy: 0.85,
  /** °C de Tmrt por °C de excesso da superfície sobre o ar. */
  longwaveGain: 0.35,
} as const;

export interface TmrtInput {
  airTemp: number;
  surfaceTemp: number;
  /** Radiação solar global (W/m²). */
  solarRadiation: number;
  /** Fração sombreada do percurso do pedestre (0–1). */
  shade: number;
}

export function estimateMeanRadiantTemp(
  { airTemp, surfaceTemp, solarRadiation, shade }: TmrtInput,
  model: { shortwaveGain: number; shadeEfficacy: number; longwaveGain: number } = TMRT_MODEL,
): number {
  const solar =
    model.shortwaveGain * Math.max(0, solarRadiation) * (1 - model.shadeEfficacy * clamp01(shade));
  const longwave = model.longwaveGain * (surfaceTemp - airTemp);
  return airTemp + solar + longwave;
}
