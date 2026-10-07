import { describe, expect, it } from "vitest";
import { HOT_DAY, makeBlock } from "../test-fixtures";
import { diagnoseBlock } from "./diagnostics";
import { drainageRisk } from "./drainage";
import { hourlyProfile, localAirTempOffset, pedestrianShade, peakConditions } from "./pedestrian";
import { blockSchema } from "./schema";

describe("quarteirão", () => {
  it("fixture válida pelo schema", () => {
    expect(blockSchema.safeParse(makeBlock()).success).toBe(true);
    expect(blockSchema.safeParse(makeBlock({ canopyCover: 1.4 })).success).toBe(false);
  });

  it("superfície quente aquece o ar local; copa resfria; o desvio é limitado", () => {
    expect(localAirTempOffset({ lstC: 48, canopyCover: 0.05 })).toBeGreaterThan(0);
    expect(localAirTempOffset({ lstC: 28, canopyCover: 0.6 })).toBeLessThan(0);
    expect(localAirTempOffset({ lstC: 90, canopyCover: 0 })).toBe(2.5);
  });

  it("sombra do pedestre combina copa e edificações, sem passar de 100%", () => {
    expect(pedestrianShade({ streetCanopy: 0.5, buildingShade: 0.1 })).toBeCloseTo(0.55, 6);
    expect(pedestrianShade({ streetCanopy: 1, buildingShade: 0.5 })).toBe(1);
  });

  it("praça arborizada é mais fresca que corredor comercial no pico", () => {
    const commercial = peakConditions(hourlyProfile(makeBlock(), HOT_DAY));
    const park = peakConditions(
      hourlyProfile(
        makeBlock({
          lstC: 28,
          canopyCover: 0.6,
          streetCanopy: 0.55,
          buildingShade: 0,
          windExposure: 1,
        }),
        HOT_DAY,
      ),
    );
    expect(park.utci).toBeLessThan(commercial.utci - 3);
    expect(commercial.hour).toBeGreaterThanOrEqual(11);
    expect(commercial.hour).toBeLessThanOrEqual(15);
  });

  it("risco de drenagem cresce perto do rio, com impermeabilização e em terreno plano", () => {
    const far = drainageRisk({ distanceToRiverM: 2000, imperviousness: 0.5, slopePct: 10 });
    const near = drainageRisk({ distanceToRiverM: 60, imperviousness: 0.5, slopePct: 10 });
    const sealed = drainageRisk({ distanceToRiverM: 2000, imperviousness: 0.95, slopePct: 10 });
    const flat = drainageRisk({ distanceToRiverM: 2000, imperviousness: 0.5, slopePct: 0.5 });
    expect(near).toBeGreaterThan(far);
    expect(sealed).toBeGreaterThan(far);
    expect(flat).toBeGreaterThan(far);
    expect(drainageRisk({ distanceToRiverM: 0, imperviousness: 1, slopePct: 0 })).toBe(1);
  });

  it("diagnóstico reúne UTCI, IVTU, drenagem e prescrição", () => {
    const d = diagnoseBlock(makeBlock(), HOT_DAY);
    expect(d.blockId).toBe("vr-0001");
    expect(d.utciPeak).toBeGreaterThan(38);
    expect(d.heatSeverity).toBeGreaterThanOrEqual(3);
    expect(d.ivtu.level).toMatch(/alto|critico/);
    expect(d.prescription.primary?.type).toBe("arborizacao");
    expect(d.prescription.primary?.variant).toBe("copa-elevada");
  });
});
