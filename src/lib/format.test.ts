import { describe, expect, it } from "vitest";
import {
  formatClock,
  formatCurrency,
  formatDate,
  formatDecimal,
  formatHour,
  formatInteger,
  formatIsoDate,
  formatPercent,
  formatRelativeTime,
  formatSigned,
  formatSignedTemperature,
  formatTemperature,
} from "./format";

/** Normaliza espaços não separáveis do Intl para comparar com texto legível. */
const plain = (value: string) => value.replace(/[  ]/g, " ");

describe("formatação pt-BR", () => {
  it("usa separador de milhar e vírgula decimal", () => {
    expect(formatInteger(261563)).toBe("261.563");
    expect(formatDecimal(38.456, 1)).toBe("38,5");
    expect(formatDecimal(2, 2)).toBe("2,00");
  });

  it("formata temperaturas sem quebra entre número e unidade", () => {
    expect(formatTemperature(38.42)).toBe("38,4 °C");
    expect(plain(formatSignedTemperature(-2.34))).toBe("−2,3 °C");
    expect(plain(formatSignedTemperature(1.25))).toBe("+1,3 °C");
  });

  it("não exibe sinal em zero, inclusive após arredondamento", () => {
    expect(formatSigned(0)).toBe("0,0");
    expect(formatSigned(-0.04)).toBe("0,0");
  });

  it("formata percentuais a partir de frações", () => {
    expect(formatPercent(0.18)).toBe("18%");
    expect(formatPercent(0.183, { digits: 1 })).toBe("18,3%");
    expect(formatPercent(0.18, { signed: true })).toBe("+18%");
    expect(formatPercent(-0.05, { signed: true })).toBe("−5%");
  });

  it("formata reais", () => {
    expect(plain(formatCurrency(218020))).toBe("R$ 218.020,00");
    expect(plain(formatCurrency(218020, { compact: true }))).toBe("R$ 218 mil");
  });

  it("formata horas do dia", () => {
    expect(formatHour(8)).toBe("08:00");
    expect(formatHour(13.5)).toBe("13:30");
  });

  it("formata datas no fuso de São Paulo", () => {
    expect(formatDate("2026-10-07T02:00:00Z", "short")).toBe("06/10/2026");
    expect(formatDate("2026-10-07T15:00:00Z", "long")).toBe("7 de outubro de 2026");
  });

  it("formata tempo relativo com referência explícita", () => {
    const now = new Date("2026-10-07T12:00:00Z");
    expect(formatRelativeTime("2026-10-07T11:55:00Z", now)).toBe("há 5 minutos");
    expect(formatRelativeTime("2026-10-06T12:00:00Z", now)).toBe("ontem");
    expect(formatRelativeTime("2026-10-07T12:00:00Z", now)).toBe("agora");
  });

  it("formata a data local para nomes de arquivo", () => {
    // 01:30 UTC ainda é o dia anterior em São Paulo (UTC−3).
    expect(formatIsoDate("2026-10-08T01:30:00.000Z")).toBe("2026-10-07");
    expect(formatClock("2026-10-08T17:30:00.000Z")).toBe("14:30");
  });
});
