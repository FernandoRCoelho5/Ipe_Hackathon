import { describe, expect, it } from "vitest";
import { createRng } from "../shared/random";
import {
  classifyIvtu,
  computeIvtu,
  DEFAULT_IVTU_CONFIG,
  ivtuConfigSchema,
  pedestrianComponent,
  type IvtuInput,
} from "./ivtu";

const base: IvtuInput = {
  utciPeak: 38,
  lstC: 42,
  pedestrianFlow: 400,
  incomePerCapita: 1800,
  densityPerKm2: 7000,
  elderlyShare: 0.14,
};

describe("IVTU", () => {
  it("fica sempre entre 0 e 100", () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i++) {
      const r = computeIvtu({
        utciPeak: rng.range(0, 60),
        lstC: rng.range(15, 70),
        pedestrianFlow: rng.range(0, 5000),
        incomePerCapita: rng.range(0, 20000),
        densityPerKm2: rng.range(0, 40000),
        elderlyShare: rng.range(0, 1),
      });
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      for (const c of Object.values(r.components)) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it("é monotônico: piorar qualquer entrada nunca reduz o índice", () => {
    const rng = createRng(11);
    const worse: Array<[keyof IvtuInput, (v: number) => number]> = [
      ["utciPeak", (v) => v + rng.range(0, 6)],
      ["lstC", (v) => v + rng.range(0, 8)],
      ["pedestrianFlow", (v) => v + rng.range(0, 800)],
      ["incomePerCapita", (v) => Math.max(0, v - rng.range(0, 1500))],
      ["densityPerKm2", (v) => v + rng.range(0, 5000)],
      ["elderlyShare", (v) => Math.min(1, v + rng.range(0, 0.1))],
    ];
    for (let i = 0; i < 300; i++) {
      const input: IvtuInput = {
        utciPeak: rng.range(20, 50),
        lstC: rng.range(25, 55),
        pedestrianFlow: rng.range(0, 2000),
        incomePerCapita: rng.range(400, 6000),
        densityPerKm2: rng.range(0, 20000),
        elderlyShare: rng.range(0, 0.3),
      };
      const before = computeIvtu(input).score;
      for (const [key, transform] of worse) {
        const after = computeIvtu({ ...input, [key]: transform(input[key]) }).score;
        expect(after).toBeGreaterThanOrEqual(before - 1e-9);
      }
    }
  });

  it("usa a média ponderada normalizada dos componentes", () => {
    const r = computeIvtu(base);
    const w = DEFAULT_IVTU_CONFIG.weights;
    const expected =
      (100 *
        (w.thermal * r.components.thermal +
          w.pedestrian * r.components.pedestrian +
          w.social * r.components.social)) /
      (w.thermal + w.pedestrian + w.social);
    expect(r.score).toBeCloseTo(expected, 9);
  });

  it("respeita pesos configuráveis (só calor ⇒ IVTU = componente térmico)", () => {
    const config = { ...DEFAULT_IVTU_CONFIG, weights: { thermal: 1, pedestrian: 0, social: 0 } };
    const r = computeIvtu(base, config);
    expect(r.score).toBeCloseTo(100 * r.components.thermal, 9);
  });

  it("classifica níveis pelos limiares, com limites inclusivos", () => {
    const t = DEFAULT_IVTU_CONFIG.thresholds;
    expect(classifyIvtu(49.9, t)).toBe("baixo");
    expect(classifyIvtu(50, t)).toBe("medio");
    expect(classifyIvtu(64, t)).toBe("alto");
    expect(classifyIvtu(72, t)).toBe("critico");
  });

  it("satura a circulação no fluxo máximo de referência", () => {
    expect(pedestrianComponent(0, DEFAULT_IVTU_CONFIG)).toBe(0);
    expect(pedestrianComponent(1500, DEFAULT_IVTU_CONFIG)).toBeCloseTo(1, 9);
    expect(pedestrianComponent(9000, DEFAULT_IVTU_CONFIG)).toBe(1);
  });

  it("valida a configuração: pesos zerados e limiares fora de ordem são rejeitados", () => {
    expect(ivtuConfigSchema.safeParse(DEFAULT_IVTU_CONFIG).success).toBe(true);
    expect(
      ivtuConfigSchema.safeParse({
        ...DEFAULT_IVTU_CONFIG,
        weights: { thermal: 0, pedestrian: 0, social: 0 },
      }).success,
    ).toBe(false);
    expect(
      ivtuConfigSchema.safeParse({
        ...DEFAULT_IVTU_CONFIG,
        thresholds: { medium: 60, high: 50, critical: 75 },
      }).success,
    ).toBe(false);
    expect(
      ivtuConfigSchema.safeParse({
        ...DEFAULT_IVTU_CONFIG,
        thermal: { ...DEFAULT_IVTU_CONFIG.thermal, utciRange: [40, 30] },
      }).success,
    ).toBe(false);
  });
});
