import { clamp01, normalize } from "../shared/math";
import type { Block } from "./schema";

/**
 * Risco de drenagem (0–1): o mesmo solo impermeável que aquece a rua agrava o alagamento.
 * Combina proximidade do rio (Paraíba do Sul), impermeabilização e relevo plano.
 */
export const DRAINAGE_MODEL = {
  weights: { river: 0.45, imperviousness: 0.35, flatness: 0.2 },
  /** Distância (m) abaixo da qual a proximidade do rio é máxima / acima da qual é nula
   *  (a planície de inundação do Paraíba do Sul é larga nas áreas urbanas). */
  riverRange: [100, 1200] as const,
  /** Declividade (%) abaixo da qual o terreno é tratado como plano / acima, como encosta. */
  slopeRange: [1, 12] as const,
} as const;

export function drainageRisk(
  block: Pick<Block, "distanceToRiverM" | "imperviousness" | "slopePct">,
): number {
  const { weights, riverRange, slopeRange } = DRAINAGE_MODEL;
  const river = 1 - normalize(block.distanceToRiverM, riverRange[0], riverRange[1]);
  const flatness = 1 - normalize(block.slopePct, slopeRange[0], slopeRange[1]);
  return clamp01(
    weights.river * river +
      weights.imperviousness * block.imperviousness +
      weights.flatness * flatness,
  );
}
