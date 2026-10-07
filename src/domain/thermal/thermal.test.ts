import { describe, expect, it } from "vitest";
import { HOT_DAY } from "../test-fixtures";
import {
  airTemperatureAt,
  relativeHumidityAt,
  solarRadiationAt,
  surfaceTemperatureAt,
  windSpeedAt,
} from "./diurnal";
import { relativeHumidityFrom, saturationVaporPressure, vaporPressure } from "./humidity";
import { classifyThermalStress, heatStressSeverity } from "./stress";
import { estimateMeanRadiantTemp } from "./tmrt";
import { computeUtci } from "./utci";

describe("psicrometria", () => {
  it("reproduz a pressão de saturação de referência", () => {
    expect(saturationVaporPressure(0)).toBeCloseTo(6.11, 1);
    expect(saturationVaporPressure(20)).toBeCloseTo(23.4, 0);
    expect(saturationVaporPressure(30)).toBeCloseTo(42.4, 0);
  });

  it("converte UR ↔ pressão de vapor de forma inversa e saturando em 100%", () => {
    const ea = vaporPressure(28, 0.6);
    expect(relativeHumidityFrom(28, ea)).toBeCloseTo(0.6, 6);
    expect(relativeHumidityFrom(10, 40)).toBe(1);
  });
});

describe("escala de estresse UTCI", () => {
  it.each([
    [47, "estresse-extremo-calor", 4],
    [46, "estresse-extremo-calor", 4],
    [40, "estresse-muito-forte-calor", 3],
    [35, "estresse-forte-calor", 2],
    [28, "estresse-moderado-calor", 1],
    [20, "sem-estresse", 0],
    [5, "estresse-leve-frio", 0],
    [-50, "estresse-extremo-frio", 0],
  ] as const)("UTCI %s °C → %s", (utci, id, severity) => {
    expect(classifyThermalStress(utci).id).toBe(id);
    expect(heatStressSeverity(utci)).toBe(severity);
  });
});

describe("UTCI simplificado", () => {
  it("coincide com Ta nas condições de referência do UTCI", () => {
    for (const ta of [15, 20, 25, 28]) {
      const { utci } = computeUtci({
        airTemp: ta,
        meanRadiantTemp: ta,
        windSpeed: 0.5,
        relativeHumidity: 0.5,
      });
      expect(utci).toBeCloseTo(ta, 6);
    }
  });

  it("aumenta com a radiação, diminui com o vento e aumenta com a umidade no calor", () => {
    const base = { airTemp: 33, meanRadiantTemp: 50, windSpeed: 1, relativeHumidity: 0.5 };
    const u = (o: Partial<typeof base>) => computeUtci({ ...base, ...o }).utci;
    expect(u({ meanRadiantTemp: 60 })).toBeGreaterThan(u({}));
    expect(u({ windSpeed: 3 })).toBeLessThan(u({}));
    expect(u({ relativeHumidity: 0.8 })).toBeGreaterThan(u({}));
  });

  it("limita o vento à faixa de validade do UTCI", () => {
    const calm = computeUtci({
      airTemp: 30,
      meanRadiantTemp: 40,
      windSpeed: 0,
      relativeHumidity: 0.5,
    });
    const ref = computeUtci({
      airTemp: 30,
      meanRadiantTemp: 40,
      windSpeed: 0.5,
      relativeHumidity: 0.5,
    });
    expect(calm.utci).toBeCloseTo(ref.utci, 6);
  });

  it("expõe as parcelas que explicam o resultado", () => {
    const r = computeUtci({
      airTemp: 33,
      meanRadiantTemp: 58,
      windSpeed: 1,
      relativeHumidity: 0.6,
    });
    expect(r.utci).toBeCloseTo(
      33 + r.components.radiant + r.components.wind + r.components.humidity,
      6,
    );
    expect(r.category.id).toBe("estresse-muito-forte-calor");
  });
});

describe("temperatura radiante média", () => {
  it("sombra reduz Tmrt e superfície quente aumenta", () => {
    const base = { airTemp: 34, surfaceTemp: 45, solarRadiation: 850, shade: 0 };
    const sun = estimateMeanRadiantTemp(base);
    expect(estimateMeanRadiantTemp({ ...base, shade: 1 })).toBeLessThan(sun);
    expect(estimateMeanRadiantTemp({ ...base, surfaceTemp: 55 })).toBeGreaterThan(sun);
    expect(estimateMeanRadiantTemp({ ...base, solarRadiation: 0, surfaceTemp: 34 })).toBe(34);
  });
});

describe("perfis diurnos", () => {
  it("temperatura mínima às 6h e máxima às 15h", () => {
    expect(airTemperatureAt(6, 22, 35)).toBeCloseTo(22, 6);
    expect(airTemperatureAt(15, 22, 35)).toBeCloseTo(35, 6);
    expect(airTemperatureAt(3, 22, 35)).toBeGreaterThan(22);
    expect(airTemperatureAt(21, 22, 35)).toBeLessThan(35);
  });

  it("radiação nula à noite e máxima perto do meio-dia solar", () => {
    expect(solarRadiationAt(4, 900)).toBe(0);
    expect(solarRadiationAt(20, 900)).toBe(0);
    expect(solarRadiationAt(12.25, 900)).toBeCloseTo(900, -1);
  });

  it("UR cai à tarde e permanece em faixa física", () => {
    const morning = relativeHumidityAt(7, HOT_DAY);
    const afternoon = relativeHumidityAt(15, HOT_DAY);
    expect(afternoon).toBeLessThan(morning);
    expect(afternoon).toBeGreaterThan(0.15);
  });

  it("vento é mais forte à tarde e superfície recupera a LST na passagem do satélite", () => {
    expect(windSpeedAt(14, 2)).toBeGreaterThan(windSpeedAt(8, 2));
    expect(surfaceTemperatureAt(10.25, 44, HOT_DAY)).toBeCloseTo(44, 6);
    expect(surfaceTemperatureAt(13, 44, HOT_DAY)).toBeGreaterThan(44);
  });
});
