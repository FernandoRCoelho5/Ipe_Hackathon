import { z } from "zod";
import { clamp, normalize, weightedMean } from "../shared/math";

/**
 * IVTU — Índice de Vulnerabilidade Térmica Urbana (0–100).
 *
 *   IVTU = 100 · (wT·T + wP·P + wS·S) / (wT + wP + wS)
 *
 *   T  estresse térmico     = combinação de UTCI de pico e LST
 *   P  circulação           = pedestres/h no pico (escala logarítmica)
 *   S  vulnerabilidade      = renda (invertida), densidade e % de idosos 65+
 *
 * Cada componente é normalizado por FAIXAS FIXAS (ver `ivtuConfigSchema`), não pelo
 * mínimo/máximo do conjunto, para que o índice seja comparável entre municípios e anos.
 * O índice é monotônico: piorar qualquer entrada nunca reduz o IVTU.
 */

const range = z
  .tuple([z.number(), z.number()])
  .refine(([min, max]) => max > min, "O limite superior da faixa deve ser maior que o inferior");
const weight = z.number().min(0).max(1);

export const ivtuConfigSchema = z
  .object({
    weights: z.object({ thermal: weight, pedestrian: weight, social: weight }),
    thermal: z.object({
      utciWeight: weight,
      lstWeight: weight,
      utciRange: range,
      lstRange: range,
    }),
    pedestrian: z.object({ maxFlow: z.number().positive() }),
    social: z.object({
      incomeWeight: weight,
      densityWeight: weight,
      elderlyWeight: weight,
      incomeRange: range,
      densityRange: range,
      elderlyRange: range,
    }),
    thresholds: z.object({
      medium: z.number().min(0).max(100),
      high: z.number().min(0).max(100),
      critical: z.number().min(0).max(100),
    }),
  })
  .refine(
    ({ weights }) => weights.thermal + weights.pedestrian + weights.social > 0,
    "Ao menos um peso do IVTU deve ser maior que zero",
  )
  .refine(
    ({ thresholds: t }) => t.medium < t.high && t.high < t.critical,
    "Os limiares devem ser crescentes: médio < alto < crítico",
  );

export type IvtuConfig = z.infer<typeof ivtuConfigSchema>;

/**
 * Pesos padrão 0,45 / 0,25 / 0,30:
 *  - estresse térmico é o perigo em si e domina o índice;
 *  - vulnerabilidade social pesa mais que circulação porque ~80% dos óbitos associados
 *    ao calor no Brasil (2000–2019) foram de idosos 65+ (Fiocruz/UFBA);
 *  - circulação mede quantas pessoas ficam expostas no pico solar.
 * Faixas térmicas começam no estresse FORTE (UTCI 32 °C): no verão quase todo quarteirão
 * passa do estresse moderado, e o índice precisa discriminar entre eles.
 * Limiares 50/64/72 calibrados para que ~10–15% dos quarteirões sejam críticos no verão
 * do Sul Fluminense (ver docs/METHODOLOGY.md).
 * Todos são ajustáveis na gestão (perfil Administrador Municipal).
 */
export const DEFAULT_IVTU_CONFIG: IvtuConfig = {
  weights: { thermal: 0.45, pedestrian: 0.25, social: 0.3 },
  thermal: { utciWeight: 0.7, lstWeight: 0.3, utciRange: [32, 46], lstRange: [30, 50] },
  pedestrian: { maxFlow: 1500 },
  social: {
    incomeWeight: 0.4,
    densityWeight: 0.25,
    elderlyWeight: 0.35,
    incomeRange: [600, 4500],
    densityRange: [1000, 15000],
    elderlyRange: [0.05, 0.25],
  },
  thresholds: { medium: 50, high: 64, critical: 72 },
};

export const IVTU_LEVELS = ["baixo", "medio", "alto", "critico"] as const;
export type IvtuLevel = (typeof IVTU_LEVELS)[number];

export const IVTU_LEVEL_LABELS: Record<IvtuLevel, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};

export interface IvtuInput {
  utciPeak: number;
  lstC: number;
  pedestrianFlow: number;
  incomePerCapita: number;
  densityPerKm2: number;
  elderlyShare: number;
}

export interface IvtuComponents {
  /** Cada componente em [0, 1]. */
  thermal: number;
  pedestrian: number;
  social: number;
}

export interface IvtuResult {
  score: number;
  level: IvtuLevel;
  components: IvtuComponents;
}

export function thermalComponent(input: Pick<IvtuInput, "utciPeak" | "lstC">, config: IvtuConfig) {
  const t = config.thermal;
  return weightedMean(
    [normalize(input.utciPeak, ...t.utciRange), normalize(input.lstC, ...t.lstRange)],
    [t.utciWeight, t.lstWeight],
  );
}

/** Escala logarítmica: as primeiras centenas de pedestres pesam mais que o excedente. */
export function pedestrianComponent(flow: number, config: IvtuConfig): number {
  return clamp(Math.log1p(Math.max(0, flow)) / Math.log1p(config.pedestrian.maxFlow), 0, 1);
}

export function socialComponent(
  input: Pick<IvtuInput, "incomePerCapita" | "densityPerKm2" | "elderlyShare">,
  config: IvtuConfig,
): number {
  const s = config.social;
  return weightedMean(
    [
      1 - normalize(input.incomePerCapita, ...s.incomeRange),
      normalize(input.densityPerKm2, ...s.densityRange),
      normalize(input.elderlyShare, ...s.elderlyRange),
    ],
    [s.incomeWeight, s.densityWeight, s.elderlyWeight],
  );
}

export function classifyIvtu(score: number, thresholds: IvtuConfig["thresholds"]): IvtuLevel {
  if (score >= thresholds.critical) return "critico";
  if (score >= thresholds.high) return "alto";
  if (score >= thresholds.medium) return "medio";
  return "baixo";
}

export function computeIvtu(
  input: IvtuInput,
  config: IvtuConfig = DEFAULT_IVTU_CONFIG,
): IvtuResult {
  const components: IvtuComponents = {
    thermal: thermalComponent(input, config),
    pedestrian: pedestrianComponent(input.pedestrianFlow, config),
    social: socialComponent(input, config),
  };
  const w = config.weights;
  const score =
    100 *
    weightedMean(
      [components.thermal, components.pedestrian, components.social],
      [w.thermal, w.pedestrian, w.social],
    );
  return { score, level: classifyIvtu(score, config.thresholds), components };
}
