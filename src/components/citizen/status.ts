import type { BadgeTone } from "@/components/ui/badge";
import type { ReportStatus } from "@/domain/citizen/schema";
import type { IotStatus } from "@/domain/iot/schema";

/** Cores dos relatos no mapa por status de moderação (sempre com rótulo na legenda). */
export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  pendente: "#fab20a",
  validado: "#1e842d",
  descartado: "#8a958d",
  spam: "#b42318",
};

export const REPORT_STATUS_TONES: Record<ReportStatus, BadgeTone> = {
  pendente: "warning",
  validado: "accent",
  descartado: "neutral",
  spam: "danger",
};

export const SENSOR_COLOR = "#159ebf";

export const IOT_STATUS_TONES: Record<IotStatus, BadgeTone> = {
  online: "accent",
  "bateria-baixa": "warning",
  "sinal-fraco": "warning",
  offline: "danger",
};
