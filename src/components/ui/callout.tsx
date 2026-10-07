import { AlertTriangle, Info, OctagonAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CalloutTone = "info" | "warning" | "danger";

const tones: Record<CalloutTone, { className: string; icon: LucideIcon }> = {
  info: { className: "border-line bg-surface-muted text-fg", icon: Info },
  warning: {
    className: "border-amarelo-ipe/50 bg-warning-soft text-warning-fg",
    icon: AlertTriangle,
  },
  danger: { className: "border-danger/30 bg-danger-soft text-danger", icon: OctagonAlert },
};

interface CalloutProps {
  tone?: CalloutTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** `alert` para erros que surgem após uma ação; o padrão é conteúdo estático. */
  role?: "alert" | "status";
}

/** Aviso em linha com ícone e texto (a cor nunca é o único sinal). */
export function Callout({ tone = "info", title, children, action, className, role }: CalloutProps) {
  const { className: toneClass, icon: Icon } = tones[tone];
  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-3 rounded-control border px-4 py-3 text-sm",
        toneClass,
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
      {action}
    </div>
  );
}
