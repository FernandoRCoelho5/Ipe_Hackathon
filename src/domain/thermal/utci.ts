import { clamp } from "../shared/math";
import { saturationVaporPressure, vaporPressure } from "./humidity";
import { classifyThermalStress, type ThermalStressCategory } from "./stress";

/**
 * Sensação térmica do pedestre — modelo SIMPLIFICADO equivalente ao UTCI.
 *
 * Por que simplificado: o UTCI operacional é um polinômio de 6ª ordem com mais de
 * 200 coeficientes (Bröde et al., 2012). No MVP usamos um modelo aditivo transparente,
 * ancorado na DEFINIÇÃO de referência do UTCI:
 *
 *   UTCI = Ta  quando  Tmrt = Ta, vento a 10 m = 0,5 m/s e UR = 50%
 *   (pressão de vapor de referência limitada a 20 hPa)
 *
 * e com sensibilidades na ordem de grandeza descritas para o UTCI em clima quente:
 *
 *   UTCI ≈ Ta + R(Tmrt − Ta, va) + W(va, Ta) + H(pa, Ta)
 *
 * Os coeficientes estão em `UTCI_MODEL` e são calibrados no piloto contra a
 * implementação oficial (pythermalcomfort) e os nós IoT. Ver docs/METHODOLOGY.md.
 */
export const UTCI_MODEL = {
  /** °C de UTCI por °C de (Tmrt − Ta), com vento de referência. */
  radiantGain: 0.29,
  /** Atenuação do ganho radiante por m/s de vento acima da referência. */
  radiantWindDamping: 0.12,
  /** Resfriamento convectivo (°C por unidade de ln(va / 0,5)) com Ta ≤ 30 °C. */
  windCooling: 1.4,
  /** Temperatura do ar a partir da qual o vento deixa de resfriar. */
  windNeutralTempC: 40,
  /** °C de UTCI por hPa de pressão de vapor acima da referência. */
  humidityGain: 0.12,
  /** Faixa de vento válida do UTCI (m/s a 10 m). */
  windRange: [0.5, 17] as const,
  /** Pressão de vapor de referência máxima (hPa), conforme a definição do UTCI. */
  referenceVaporPressureCap: 20,
} as const;

export interface PedestrianClimate {
  /** Temperatura do ar (°C). */
  airTemp: number;
  /** Temperatura radiante média (°C). */
  meanRadiantTemp: number;
  /** Vento a 10 m (m/s). */
  windSpeed: number;
  /** Umidade relativa (0–1). */
  relativeHumidity: number;
}

export interface UtciResult {
  utci: number;
  category: ThermalStressCategory;
  /** Parcelas do modelo, para explicar o resultado ("por quê"). */
  components: { radiant: number; wind: number; humidity: number };
}

export function computeUtci(input: PedestrianClimate): UtciResult {
  const { airTemp, meanRadiantTemp, relativeHumidity } = input;
  const model = UTCI_MODEL;
  const va = clamp(input.windSpeed, model.windRange[0], model.windRange[1]);

  const radiant =
    (model.radiantGain * (meanRadiantTemp - airTemp)) /
    (1 + model.radiantWindDamping * (va - model.windRange[0]));

  const windWeight = clamp((model.windNeutralTempC - airTemp) / 10, 0, 1);
  const wind = -model.windCooling * windWeight * Math.log(va / model.windRange[0]);

  const pa = vaporPressure(airTemp, clamp(relativeHumidity, 0, 1));
  const paRef = Math.min(saturationVaporPressure(airTemp) * 0.5, model.referenceVaporPressureCap);
  const humidityWeight = clamp((airTemp - 20) / 10, 0, 1.5);
  const humidity = model.humidityGain * (pa - paRef) * humidityWeight;

  const utci = airTemp + radiant + wind + humidity;
  return { utci, category: classifyThermalStress(utci), components: { radiant, wind, humidity } };
}
