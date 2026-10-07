import { describe, expect, it } from "vitest";
import { ndviTrendPer30Days, newAdoptionSchema } from "./adoption/schema";
import { isAlertActive, type HeatAlert } from "./alerts/schema";
import { newCitizenReportSchema, spamScore } from "./citizen/schema";
import { iotStatus, signalBars, type IotReading } from "./iot/schema";
import {
  bboxContains,
  distanceMeters,
  distanceToPolylineMeters,
  fromLocalMeters,
  ringAreaMeters,
  ringCentroid,
  ringPerimeterMeters,
  toLocalMeters,
} from "./shared/geo";
import { clamp, lerp, mean, normalize, pearson, round, weightedMean } from "./shared/math";
import { createRng, hashString } from "./shared/random";

describe("matemática", () => {
  it("normaliza, limita e interpola", () => {
    expect(normalize(5, 0, 10)).toBe(0.5);
    expect(normalize(-5, 0, 10)).toBe(0);
    expect(normalize(15, 0, 10)).toBe(1);
    expect(normalize(5, 3, 3)).toBe(0);
    expect(clamp(7, 0, 5)).toBe(5);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(round(1.2345, 2)).toBe(1.23);
    expect(mean([])).toBe(0);
    expect(weightedMean([1, 3], [0, 0])).toBe(0);
    expect(weightedMean([1, 3], [1, 3])).toBe(2.5);
  });

  it("correlação de Pearson", () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 9);
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 9);
    expect(pearson([1, 1, 1], [1, 2, 3])).toBe(0);
    expect(pearson([1], [1])).toBe(0);
  });
});

describe("aleatoriedade determinística", () => {
  it("mesma semente, mesma sequência", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(seqA);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it("utilitários respeitam faixas e pesos", () => {
    const rng = createRng(1);
    for (let i = 0; i < 200; i++) {
      const n = rng.int(3, 6);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
      expect(rng.weighted(["a", "b"], [0, 1])).toBe("b");
    }
    const samples = Array.from({ length: 4000 }, () => rng.normal(10, 2));
    expect(mean(samples)).toBeCloseTo(10, 0);
    expect(["x", "y"]).toContain(rng.pick(["x", "y"]));
    expect(typeof rng.chance(0.5)).toBe("boolean");
    expect(hashString("vr-0001")).toBe(hashString("vr-0001"));
    expect(hashString("vr-0001")).not.toBe(hashString("vr-0002"));
  });
});

describe("geometria", () => {
  const origin = [-44.104, -22.5231] as const;

  it("distâncias e projeção local são consistentes", () => {
    const p = fromLocalMeters(300, 400, origin);
    expect(distanceMeters(origin, p)).toBeCloseTo(500, -1);
    const [x, y] = toLocalMeters(p, origin);
    expect(x).toBeCloseTo(300, 6);
    expect(y).toBeCloseTo(400, 6);
  });

  it("área, perímetro e centróide de um quadrado de 100 m", () => {
    const ring = [
      fromLocalMeters(0, 0, origin),
      fromLocalMeters(100, 0, origin),
      fromLocalMeters(100, 100, origin),
      fromLocalMeters(0, 100, origin),
      fromLocalMeters(0, 0, origin),
    ];
    expect(ringAreaMeters(ring)).toBeCloseTo(10_000, -1);
    expect(ringPerimeterMeters(ring)).toBeCloseTo(400, 0);
    const c = ringCentroid(ring);
    expect(distanceMeters(c, fromLocalMeters(50, 50, origin))).toBeLessThan(0.5);
    expect(ringAreaMeters(ring.slice(0, 3))).toBe(0);
  });

  it("distância a polilinha e contenção em bbox", () => {
    const line = [fromLocalMeters(-500, 0, origin), fromLocalMeters(500, 0, origin)];
    expect(distanceToPolylineMeters(fromLocalMeters(0, 120, origin), line)).toBeCloseTo(120, 0);
    expect(distanceToPolylineMeters(origin, [])).toBe(Infinity);
    expect(distanceToPolylineMeters(fromLocalMeters(0, 50, origin), [origin])).toBeCloseTo(50, 0);
    expect(bboxContains([-45, -23, -44, -22], origin)).toBe(true);
    expect(bboxContains([-45, -23, -44.2, -22], origin)).toBe(false);
  });
});

describe("relatos cidadãos", () => {
  it("score antispam separa relato legítimo de propaganda", () => {
    expect(
      spamScore("O ponto de ônibus da Rua 33 não tem nenhuma sombra ao meio-dia."),
    ).toBeLessThan(0.3);
    expect(spamScore("PROMOÇÃO!!! clique www.ganhe.com e ganhe pix")).toBeGreaterThan(0.8);
    expect(spamScore("aaaaaaa")).toBeGreaterThan(0.5);
  });

  it("valida novo relato sem nenhum dado pessoal", () => {
    const valid = newCitizenReportSchema.safeParse({
      municipalityId: "volta-redonda",
      location: [-44.1, -22.52],
      category: "calcada-sem-arvores",
      text: "Calçada inteira sem árvore nenhuma.",
    });
    expect(valid.success).toBe(true);
    expect(Object.keys(newCitizenReportSchema.shape)).not.toContain("phone");
    expect(newCitizenReportSchema.safeParse({ ...valid.data, text: "oi" }).success).toBe(false);
  });
});

describe("IoT", () => {
  const now = new Date("2026-01-20T18:00:00Z");
  const reading = (o: Partial<IotReading> = {}): IotReading => ({
    nodeId: "iot-01",
    timestamp: "2026-01-20T17:30:00Z",
    temperatureC: 34,
    humidity: 0.5,
    batteryPct: 80,
    signalDbm: -65,
    ...o,
  });

  it("status operacional pela última leitura", () => {
    expect(iotStatus(reading(), now)).toBe("online");
    expect(iotStatus(reading({ batteryPct: 12 }), now)).toBe("bateria-baixa");
    expect(iotStatus(reading({ signalDbm: -101 }), now)).toBe("sinal-fraco");
    expect(iotStatus(reading({ timestamp: "2026-01-20T09:00:00Z" }), now)).toBe("offline");
    expect(iotStatus(undefined, now)).toBe("offline");
  });

  it("barras de sinal", () => {
    expect([-55, -65, -75, -90, -110].map(signalBars)).toEqual([4, 3, 2, 1, 0]);
  });
});

describe("Adote uma Ilha Verde e alertas", () => {
  it("tendência de NDVI ignora observações com nuvem", () => {
    const series = [
      { date: "2026-01-01", ndvi: 0.2, sensor: "Sentinel-2" as const, cloudy: false },
      { date: "2026-01-06", ndvi: 0.9, sensor: "Sentinel-2" as const, cloudy: true },
      { date: "2026-01-31", ndvi: 0.26, sensor: "Landsat 8/9" as const, cloudy: false },
    ];
    expect(ndviTrendPer30Days(series)).toBeCloseTo(0.06, 6);
    expect(ndviTrendPer30Days(series.slice(0, 1))).toBe(0);
  });

  it("valida cadastro de parceria", () => {
    expect(
      newAdoptionSchema.safeParse({
        municipalityId: "resende",
        blockId: "rs-0010",
        partnerName: "Padaria Pão do Vale",
        partnerType: "comercio",
        trees: [{ speciesId: "quaresmeira", count: 6 }],
      }).success,
    ).toBe(true);
    expect(
      newAdoptionSchema.safeParse({
        municipalityId: "resende",
        blockId: "",
        partnerName: "X",
        partnerType: "comercio",
      }).success,
    ).toBe(false);
  });

  it("alerta ativo apenas dentro da vigência", () => {
    const alert: HeatAlert = {
      id: "a1",
      municipalityIds: ["volta-redonda"],
      level: "alerta",
      title: "Onda de calor",
      message: "…",
      maxTempC: 38.4,
      startsAt: "2026-01-19T12:00:00Z",
      endsAt: "2026-01-23T23:00:00Z",
      source: "Simulado",
    };
    expect(isAlertActive(alert, new Date("2026-01-20T18:00:00Z"))).toBe(true);
    expect(isAlertActive(alert, new Date("2026-01-25T00:00:00Z"))).toBe(false);
  });
});
