import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/** Número de destaque com rótulo (KPI), para uso dentro de um `<dl>`. */
export function Stat({ label, value, hint, className }: StatProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <dt className="text-xs font-medium text-fg-muted">{label}</dt>
      <dd className="text-xl font-semibold tracking-tight text-fg tabular">{value}</dd>
      {hint && <dd className="text-xs text-fg-subtle">{hint}</dd>}
    </div>
  );
}
