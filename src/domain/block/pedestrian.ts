import { clamp, clamp01 } from "../shared/math";
import {
  airTemperatureAt,
  DAY_HOURS,
  relativeHumidityAt,
  SOLAR_PEAK_WINDOW,
  solarRadiationAt,
  surfaceTemperatureAt,
  windSpeedAt,
  type DailyWeather,
} from "../thermal/diurnal";
import { estimateMeanRadiantTemp, TMRT_MODEL } from "../thermal/tmrt";
import { computeUtci } from "../thermal/utci";
import type { ThermalStressCategory } from "../thermal/stress";
import type { Block } from "./schema";

/**
 * Atributos do quarteirão que afetam o pedestre. O simulador altera estes valores
 * (mais copa, menos superfície quente) e reaproveita o mesmo cálculo.
 */
export type PedestrianSurface = Pick<
  Block,
  "lstC" | "canopyCover" | "streetCanopy" | "buildingShade" | "windExposure"
>;

export const LOCAL_CLIMATE_MODEL = {
  /** °C de aquecimento do ar por °C de LST acima de 38 °C (ilha de calor do ar). */
  airPerLst: 0.05,
  /** °C de resfriamento do ar por unidade de cobertura arbórea acima de 15% (0,3 °C a cada 10 p.p.). */
  airPerCanopy: 3,
  /** Faixa plausível do desvio local da temperatura do ar (°C). */
  airOffsetRange: [-2, 2.5] as const,
  /** Peso do sombreamento arbóreo de calçada na sombra do pedestre. */
  treeShadeWeight: 0.9,
} as const;

/** Desvio da temperatura do ar no quarteirão em relação à estação meteorológica. */
export function localAirTempOffset(
  surface: Pick<PedestrianSurface, "lstC" | "canopyCover">,
): number {
  const m = LOCAL_CLIMATE_MODEL;
  return clamp(
    m.airPerLst * (surface.lstC - 38) - m.airPerCanopy * (surface.canopyCover - 0.15),
    m.airOffsetRange[0],
    m.airOffsetRange[1],
  );
}

/** Fração sombreada do percurso do pedestre no pico solar. */
export function pedestrianShade(
  surface: Pick<PedestrianSurface, "streetCanopy" | "buildingShade">,
): number {
  return clamp01(
    LOCAL_CLIMATE_MODEL.treeShadeWeight * surface.streetCanopy + surface.buildingShade,
  );
}

export interface HourlyConditions {
  hour: number;
  airTemp: number;
  relativeHumidity: number;
  windSpeed: number;
  solarRadiation: number;
  surfaceTemp: number;
  meanRadiantTemp: number;
  utci: number;
  category: ThermalStressCategory;
}

export interface ConditionsOptions {
  /** Desvio adicional da temperatura do ar (°C), usado pelo simulador. */
  extraAirOffset?: number;
  tmrtModel?: { shortwaveGain: number; shadeEfficacy: number; longwaveGain: number };
}

export function conditionsAt(
  surface: PedestrianSurface,
  weather: DailyWeather,
  hour: number,
  options: ConditionsOptions = {},
): HourlyConditions {
  const offset = localAirTempOffset(surface) + (options.extraAirOffset ?? 0);
  const airTemp = airTemperatureAt(hour, weather.tMin, weather.tMax) + offset;
  const relativeHumidity = relativeHumidityAt(hour, weather, offset);
  const windSpeed = windSpeedAt(hour, weather.windMean) * surface.windExposure;
  const solarRadiation = solarRadiationAt(hour, weather.solarPeak);
  const surfaceTemp = surfaceTemperatureAt(hour, surface.lstC, weather, offset);
  const meanRadiantTemp = estimateMeanRadiantTemp(
    { airTemp, surfaceTemp, solarRadiation, shade: pedestrianShade(surface) },
    options.tmrtModel ?? TMRT_MODEL,
  );
  const { utci, category } = computeUtci({ airTemp, meanRadiantTemp, windSpeed, relativeHumidity });
  return {
    hour,
    airTemp,
    relativeHumidity,
    windSpeed,
    solarRadiation,
    surfaceTemp,
    meanRadiantTemp,
    utci,
    category,
  };
}

/** Curva horária 08h–18h. */
export function hourlyProfile(
  surface: PedestrianSurface,
  weather: DailyWeather,
  options?: ConditionsOptions,
): HourlyConditions[] {
  return DAY_HOURS.map((hour) => conditionsAt(surface, weather, hour, options));
}

/** Condição de maior UTCI dentro da janela de pico solar (11h–15h). */
export function peakConditions(profile: readonly HourlyConditions[]): HourlyConditions {
  const window = profile.filter(
    (c) => c.hour >= SOLAR_PEAK_WINDOW[0] && c.hour <= SOLAR_PEAK_WINDOW[1],
  );
  const candidates = window.length > 0 ? window : profile;
  return candidates.reduce((best, c) => (c.utci > best.utci ? c : best));
}
