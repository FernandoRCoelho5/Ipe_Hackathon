import { describe, expect, it } from "vitest";
import { DEFAULT_IVTU_CONFIG, IVTU_LEVELS } from "@/domain/ivtu/ivtu";
import {
  colorAt,
  contrastRatio,
  fillColorExpression,
  ivtuLevelFor,
  layerColor,
  MAP_LAYER_IDS,
  MAP_LAYERS,
  readableTextOn,
  THERMAL_COLORS,
  utciColor,
} from "./scales";

describe("escalas de cor do mapa", () => {
  it("interpola entre as paradas e satura nas pontas", () => {
    const stops = [
      [0, "#000000"],
      [10, "#ffffff"],
    ] as const;
    expect(colorAt(stops, -5)).toBe("#000000");
    expect(colorAt(stops, 0)).toBe("#000000");
    expect(colorAt(stops, 5)).toBe("#808080");
    expect(colorAt(stops, 10)).toBe("#ffffff");
    expect(colorAt(stops, 99)).toBe("#ffffff");
  });

  it("devolve exatamente a cor da parada no valor da parada", () => {
    expect(utciColor(26)).toBe(THERMAL_COLORS[0]);
    expect(utciColor(38)).toBe(THERMAL_COLORS[3]);
    expect(utciColor(50)).toBe(THERMAL_COLORS[5]);
  });

  it("toda camada contínua tem paradas e marcas crescentes", () => {
    for (const id of MAP_LAYER_IDS) {
      const layer = MAP_LAYERS[id];
      if (layer.kind !== "continuous") continue;
      const values = layer.stops.map(([v]) => v);
      expect(values).toEqual([...values].sort((a, b) => a - b));
      expect(new Set(values).size).toBe(values.length);
      for (const tick of layer.ticks) {
        expect(tick).toBeGreaterThanOrEqual(values[0]);
        expect(tick).toBeLessThanOrEqual(values[values.length - 1]);
      }
    }
  });

  it("classifica o IVTU pelos limiares do domínio", () => {
    const t = DEFAULT_IVTU_CONFIG.thresholds;
    expect(ivtuLevelFor(t.medium - 0.1)).toBe("baixo");
    expect(ivtuLevelFor(t.medium)).toBe("medio");
    expect(ivtuLevelFor(t.high)).toBe("alto");
    expect(ivtuLevelFor(t.critical)).toBe("critico");
    const ivtu = MAP_LAYERS.ivtu;
    expect(ivtu.kind).toBe("categorical");
    if (ivtu.kind === "categorical") {
      expect(ivtu.classes.map((c) => c.id).sort()).toEqual([...IVTU_LEVELS].sort());
    }
    expect(layerColor(ivtu, 90)).toBe(THERMAL_COLORS[4]);
  });

  it("descreve o valor com rótulo, sem depender só da cor", () => {
    expect(MAP_LAYERS.utci.describe(40)).toBe("Estresse muito forte ao calor");
    expect(MAP_LAYERS.canopy.describe(0.05)).toBe("Quase sem árvores");
    expect(MAP_LAYERS.utci.format(38.44)).toBe("38,4 °C");
  });

  it("gera expressões do MapLibre: UTCI lê o feature-state da hora", () => {
    const utci = fillColorExpression(MAP_LAYERS.utci);
    expect(utci[0]).toBe("interpolate");
    expect(JSON.stringify(utci)).toContain('["feature-state","utci"]');
    const ivtu = fillColorExpression(MAP_LAYERS.ivtu);
    expect(ivtu[0]).toBe("match");
    expect(ivtu).toContain("critico");
  });

  it("escolhe texto legível (AA para texto grande) sobre cada cor térmica", () => {
    for (const color of THERMAL_COLORS) {
      expect(contrastRatio(color, readableTextOn(color))).toBeGreaterThanOrEqual(3);
    }
    expect(readableTextOn("#fab20a")).toBe("#083e28");
    expect(readableTextOn("#8c1c13")).toBe("#ffffff");
  });
});
