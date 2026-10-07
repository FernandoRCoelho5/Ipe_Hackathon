// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_IVTU_CONFIG } from "@/domain/ivtu/ivtu";
import {
  diagnoseBlockById,
  diagnoseMunicipality,
  getReferenceWeather,
  NotFoundError,
  utciAtHour,
} from "./diagnostics";

describe("serviço de diagnóstico", () => {
  it("diagnostica todos os quarteirões do município e memoiza o resultado", async () => {
    const first = diagnoseMunicipality("barra-mansa");
    expect(diagnoseMunicipality("barra-mansa")).toBe(first);
    const result = await first;
    expect(result.length).toBeGreaterThan(300);
    const levels = new Set(result.map((r) => r.diagnostics.ivtu.level));
    expect(levels).toEqual(new Set(["baixo", "medio", "alto", "critico"]));
  });

  it("recalcula com pesos diferentes do IVTU", async () => {
    const thermalOnly = {
      ...DEFAULT_IVTU_CONFIG,
      weights: { thermal: 1, pedestrian: 0, social: 0 },
    };
    const [base, custom] = await Promise.all([
      diagnoseMunicipality("resende"),
      diagnoseMunicipality("resende", thermalOnly),
    ]);
    expect(custom).not.toBe(base);
    expect(custom[0].diagnostics.ivtu.score).toBeCloseTo(
      100 * custom[0].diagnostics.ivtu.components.thermal,
      0,
    );
  });

  it("detalha um quarteirão com perfil horário 08h–18h", async () => {
    const detail = await diagnoseBlockById("vr-0001");
    expect(detail.hourly.map((h) => h.hour)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(detail.diagnostics.blockId).toBe("vr-0001");
    await expect(diagnoseBlockById("vr-9999")).rejects.toBeInstanceOf(NotFoundError);
    await expect(getReferenceWeather("petropolis")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("UTCI horário: o pico da tarde é mais quente que a manhã", async () => {
    const [morning, afternoon] = await Promise.all([
      utciAtHour("volta-redonda", 8),
      utciAtHour("volta-redonda", 14),
    ]);
    const id = "vr-0001";
    expect(afternoon.get(id)).toBeGreaterThan(morning.get(id) ?? Infinity);
  });
});
