import { z } from "zod";

export const ALERT_LEVELS = {
  atencao: "Atenção",
  alerta: "Alerta",
  emergencia: "Emergência",
} as const;
export type AlertLevel = keyof typeof ALERT_LEVELS;

export const heatAlertSchema = z.object({
  id: z.string(),
  municipalityIds: z.array(z.string()).min(1),
  level: z.enum(Object.keys(ALERT_LEVELS) as [AlertLevel, ...AlertLevel[]]),
  title: z.string(),
  message: z.string(),
  maxTempC: z.number(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  source: z.string(),
});
export type HeatAlert = z.infer<typeof heatAlertSchema>;

export function isAlertActive(alert: HeatAlert, now: Date): boolean {
  const t = now.getTime();
  return new Date(alert.startsAt).getTime() <= t && t <= new Date(alert.endsAt).getTime();
}
