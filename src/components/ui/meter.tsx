import { cn } from "@/lib/cn";

interface MeterProps {
  /** Fração preenchida (0–1). */
  value: number;
  label: string;
  valueText: string;
  color?: string;
  className?: string;
}

/** Barra horizontal de proporção com rótulo e valor visíveis. */
export function Meter({ value, label, valueText, color, className }: MeterProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 1000) / 10;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-fg-muted">{label}</span>
        <span className="font-semibold text-fg tabular">{valueText}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={valueText}
        className="h-2 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${pct}%`, ...(color ? { backgroundColor: color } : {}) }}
        />
      </div>
    </div>
  );
}
