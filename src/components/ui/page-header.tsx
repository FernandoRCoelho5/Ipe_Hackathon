import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageHeaderProps {
  /** Rótulo no estilo do manual: "01 · Diagnóstico" (número em Amarelo Ipê). */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  const [number, ...rest] = eyebrow?.split(" · ") ?? [];
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="flex max-w-3xl flex-col gap-2">
        {eyebrow && (
          <p className="text-xs font-medium tracking-[0.18em] text-fg-muted uppercase">
            {rest.length > 0 ? (
              <>
                <span className="mr-2 font-semibold text-highlight-ink">{number}</span>
                {rest.join(" · ")}
              </>
            ) : (
              eyebrow
            )}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">{title}</h1>
        {description && (
          <p className="text-sm leading-relaxed text-fg-muted md:text-base">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
