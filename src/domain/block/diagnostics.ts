import { computeIvtu, DEFAULT_IVTU_CONFIG, type IvtuConfig, type IvtuResult } from "../ivtu/ivtu";
import { prescribe, type Prescription } from "../prescription/engine";
import { round } from "../shared/math";
import type { DailyWeather } from "../thermal/diurnal";
import { heatStressSeverity, type ThermalStressCategoryId } from "../thermal/stress";
import { drainageRisk } from "./drainage";
import { hourlyProfile, peakConditions, type HourlyConditions } from "./pedestrian";
import type { Block } from "./schema";

/**
 * Diagnóstico completo de um quarteirão: tudo o que é DERIVADO por modelo.
 * Selo obrigatório: pré-diagnóstico automatizado para subsidiar o profissional responsável.
 */
export interface BlockDiagnostics {
  blockId: string;
  /** UTCI de pico (11h–15h), °C. */
  utciPeak: number;
  utciPeakHour: number;
  stressCategory: ThermalStressCategoryId;
  /** Severidade ordinal ao calor (0–4) — base da "classificação do risco térmico". */
  heatSeverity: 0 | 1 | 2 | 3 | 4;
  airTempPeak: number;
  meanRadiantTempPeak: number;
  drainageRisk: number;
  ivtu: IvtuResult;
  prescription: Prescription;
}

export interface DiagnoseOptions {
  ivtuConfig?: IvtuConfig;
  /** Perfil horário já calculado (evita recomputar quando a tela também o exibe). */
  profile?: HourlyConditions[];
}

export function diagnoseBlock(
  block: Block,
  weather: DailyWeather,
  options: DiagnoseOptions = {},
): BlockDiagnostics {
  const profile = options.profile ?? hourlyProfile(block, weather);
  const peak = peakConditions(profile);
  const drainage = drainageRisk(block);
  const ivtu = computeIvtu(
    {
      utciPeak: peak.utci,
      lstC: block.lstC,
      pedestrianFlow: block.pedestrianFlow,
      incomePerCapita: block.incomePerCapita,
      densityPerKm2: block.densityPerKm2,
      elderlyShare: block.elderlyShare,
    },
    options.ivtuConfig ?? DEFAULT_IVTU_CONFIG,
  );

  return {
    blockId: block.id,
    utciPeak: round(peak.utci, 1),
    utciPeakHour: peak.hour,
    stressCategory: peak.category.id,
    heatSeverity: heatStressSeverity(peak.utci),
    airTempPeak: round(peak.airTemp, 1),
    meanRadiantTempPeak: round(peak.meanRadiantTemp, 1),
    drainageRisk: round(drainage, 3),
    ivtu: { ...ivtu, score: round(ivtu.score, 1) },
    prescription: prescribe({ block, utciPeak: peak.utci, drainageRisk: drainage }),
  };
}
