import { z } from "zod";
import { lngLatSchema } from "../shared/geo";

/** Nó de calibração IoT (ESP32 + SHT31) instalado em corredor viário. */
export const iotNodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  municipalityId: z.string(),
  blockId: z.string(),
  label: z.string(),
  location: lngLatSchema,
  hardware: z.string(),
  connectivity: z.enum(["wifi", "4g"]),
  installedAt: z.iso.datetime({ offset: true }),
});
export type IotNode = z.infer<typeof iotNodeSchema>;

export const iotReadingSchema = z.object({
  nodeId: z.string(),
  timestamp: z.iso.datetime({ offset: true }),
  temperatureC: z.number().min(-10).max(60),
  humidity: z.number().min(0).max(1),
  batteryPct: z.number().min(0).max(100),
  /** RSSI em dBm (Wi-Fi ou 4G). */
  signalDbm: z.number().min(-120).max(0),
});
export type IotReading = z.infer<typeof iotReadingSchema>;

export const IOT_STATUSES = ["online", "bateria-baixa", "sinal-fraco", "offline"] as const;
export type IotStatus = (typeof IOT_STATUSES)[number];

export const IOT_STATUS_LABELS: Record<IotStatus, string> = {
  online: "Online",
  "bateria-baixa": "Bateria baixa",
  "sinal-fraco": "Sinal fraco",
  offline: "Offline",
};

export const IOT_THRESHOLDS = {
  /** Sem leitura há mais que isso ⇒ offline. */
  offlineAfterMinutes: 120,
  lowBatteryPct: 20,
  weakSignalDbm: -95,
} as const;

/** Status operacional a partir da última leitura e do instante atual. */
export function iotStatus(last: IotReading | undefined, now: Date): IotStatus {
  if (!last) return "offline";
  const ageMinutes = (now.getTime() - new Date(last.timestamp).getTime()) / 60_000;
  if (ageMinutes > IOT_THRESHOLDS.offlineAfterMinutes) return "offline";
  if (last.batteryPct < IOT_THRESHOLDS.lowBatteryPct) return "bateria-baixa";
  if (last.signalDbm < IOT_THRESHOLDS.weakSignalDbm) return "sinal-fraco";
  return "online";
}

/** Qualidade do sinal em 0–4 barras. */
export function signalBars(signalDbm: number): 0 | 1 | 2 | 3 | 4 {
  if (signalDbm >= -60) return 4;
  if (signalDbm >= -70) return 3;
  if (signalDbm >= -82) return 2;
  if (signalDbm >= -95) return 1;
  return 0;
}
