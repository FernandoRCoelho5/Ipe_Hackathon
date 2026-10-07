import { z } from "zod";
import { clamp } from "../shared/math";
import { relativeHumidityFrom, vaporPressure } from "./humidity";

/**
 * Dia meteorológico de referência de um município (no piloto: estação INMET mais próxima).
 * Os perfis horários abaixo derivam destes poucos parâmetros.
 */
export const dailyWeatherSchema = z.object({
  municipalityId: z.string(),
  /** Data local (AAAA-MM-DD) do dia de referência. */
  date: z.string(),
  stationName: z.string(),
  tMin: z.number().min(-10).max(40),
  tMax: z.number().min(0).max(50),
  /** UR no horário da mínima (0–1); a pressão de vapor é tomada como constante no dia. */
  rhAtMin: z.number().min(0.1).max(1),
  /** Vento médio a 10 m (m/s). */
  windMean: z.number().min(0).max(20),
  /** Radiação solar global máxima (W/m²) em céu claro. */
  solarPeak: z.number().min(0).max(1200),
});
export type DailyWeather = z.infer<typeof dailyWeatherSchema>;

/** Janela de análise do pedestre e pico solar exibidos no produto. */
export const DAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
export const SOLAR_PEAK_WINDOW = [11, 15] as const;
/** Horário aproximado da passagem do Landsat 8/9 sobre a região (hora local). */
export const SATELLITE_OVERPASS_HOUR = 10.25;

const SUNRISE = 5.6;
const SUNSET = 18.9;
const HOUR_OF_MIN = 6;
const HOUR_OF_MAX = 15;

/** Radiação solar global (W/m²) em céu claro, perfil senoidal entre nascer e pôr do sol. */
export function solarRadiationAt(hour: number, peak: number): number {
  if (hour <= SUNRISE || hour >= SUNSET) return 0;
  return peak * Math.sin((Math.PI * (hour - SUNRISE)) / (SUNSET - SUNRISE));
}

/** Temperatura do ar (°C): mínima às 6h, máxima às 15h, interpolação cossenoidal. */
export function airTemperatureAt(hour: number, tMin: number, tMax: number): number {
  const amplitude = tMax - tMin;
  const h = ((hour % 24) + 24) % 24;
  if (h >= HOUR_OF_MIN && h <= HOUR_OF_MAX) {
    const t = (h - HOUR_OF_MIN) / (HOUR_OF_MAX - HOUR_OF_MIN);
    return tMin + (amplitude * (1 - Math.cos(Math.PI * t))) / 2;
  }
  // Resfriamento das 15h até as 6h do dia seguinte (15 horas).
  const elapsed = h > HOUR_OF_MAX ? h - HOUR_OF_MAX : h + 24 - HOUR_OF_MAX;
  const t = elapsed / (24 - HOUR_OF_MAX + HOUR_OF_MIN);
  return tMax - (amplitude * (1 - Math.cos(Math.PI * t))) / 2;
}

/** UR horária mantendo a pressão de vapor do início da manhã (ponto de orvalho estável). */
export function relativeHumidityAt(hour: number, weather: DailyWeather, airTempOffset = 0): number {
  const ea = vaporPressure(weather.tMin, weather.rhAtMin);
  const ta = airTemperatureAt(hour, weather.tMin, weather.tMax) + airTempOffset;
  return clamp(relativeHumidityFrom(ta, ea), 0.15, 0.98);
}

/** Vento a 10 m: brisa um pouco mais forte à tarde. */
export function windSpeedAt(hour: number, windMean: number): number {
  const phase = clamp((hour - 6) / 14, 0, 1);
  return windMean * (0.8 + 0.4 * Math.sin(Math.PI * phase));
}

/**
 * Temperatura de superfície horária a partir da LST observada na passagem do satélite.
 * O excesso sobre o ar acompanha a radiação solar com ~45 min de atraso (inércia térmica)
 * e mantém um resíduo noturno de 10% (calor armazenado no asfalto e no concreto).
 */
export function surfaceTemperatureAt(
  hour: number,
  observedLst: number,
  weather: DailyWeather,
  airTempOffset = 0,
): number {
  const lag = 0.75;
  const taOverpass =
    airTemperatureAt(SATELLITE_OVERPASS_HOUR, weather.tMin, weather.tMax) + airTempOffset;
  const excessAtOverpass = observedLst - taOverpass;
  const reference = solarRadiationAt(SATELLITE_OVERPASS_HOUR - lag, weather.solarPeak);
  const ratio = reference > 0 ? solarRadiationAt(hour - lag, weather.solarPeak) / reference : 0;
  const excess = excessAtOverpass * (0.1 + 0.9 * ratio);
  return airTemperatureAt(hour, weather.tMin, weather.tMax) + airTempOffset + excess;
}
