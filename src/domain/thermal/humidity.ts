/**
 * Psicrometria básica.
 * Pressão de saturação pela fórmula de Magnus (coeficientes de Alduchov & Eskridge),
 * válida com erro < 0,4% entre −40 °C e 50 °C.
 */

/** Pressão de vapor de saturação (hPa) para temperatura do ar em °C. */
export function saturationVaporPressure(airTempC: number): number {
  return 6.1094 * Math.exp((17.625 * airTempC) / (airTempC + 243.04));
}

/** Pressão de vapor (hPa) a partir da umidade relativa (0–1). */
export function vaporPressure(airTempC: number, relativeHumidity: number): number {
  return saturationVaporPressure(airTempC) * relativeHumidity;
}

/** Umidade relativa (0–1) para uma pressão de vapor e temperatura. Satura em 1. */
export function relativeHumidityFrom(airTempC: number, vaporPressureHPa: number): number {
  return Math.min(1, vaporPressureHPa / saturationVaporPressure(airTempC));
}
