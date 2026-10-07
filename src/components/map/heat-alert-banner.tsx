"use client";

import { useQuery } from "@tanstack/react-query";
import { ThermometerSun } from "lucide-react";
import { ALERT_LEVELS } from "@/domain/alerts/schema";
import { queries } from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import { formatDateTime, formatTemperature } from "@/lib/format";
import { messages } from "@/lib/i18n";

/** Alerta de calor ativo para o município (Defesa Civil / INMET no piloto). */
export function HeatAlertBanner({
  municipalityId,
  className,
}: {
  municipalityId: string;
  className?: string;
}) {
  const { data } = useQuery(queries.alerts(municipalityId));
  const alert = data?.data[0];
  if (!alert) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-control border border-thermal-5/40 bg-surface/95 px-4 py-3 text-sm shadow-card backdrop-blur-sm",
        className,
      )}
    >
      <ThermometerSun aria-hidden className="mt-0.5 size-5 shrink-0 text-thermal-5" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-semibold text-fg">
          {ALERT_LEVELS[alert.level]} · {alert.title}
        </p>
        <details className="group text-fg-muted">
          <summary className="cursor-pointer text-xs font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent">
            {messages.map.alertMore}
          </summary>
          <p className="mt-1">{alert.message}</p>
        </details>
        <p className="text-xs text-fg-subtle">
          {messages.map.alertMeta(
            formatTemperature(alert.maxTempC),
            formatDateTime(alert.endsAt),
            alert.source,
          )}
        </p>
      </div>
    </div>
  );
}
