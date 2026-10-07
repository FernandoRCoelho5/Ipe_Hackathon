"use client";

import { FlaskConical, X } from "lucide-react";
import { useId } from "react";
import { messages } from "@/lib/i18n";

/**
 * Selo persistente "Dados demonstrativos" (princípio de honestidade dos dados).
 * Usa a Popover API nativa: fecha com Esc e clique fora, e fica na top layer.
 */
export function DemoDataBadge() {
  const popoverId = `demo-data-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { badge, title, description } = messages.demoData;

  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amarelo-ipe/60 bg-warning-soft px-3 text-xs font-medium text-warning-fg transition-colors hover:border-amarelo-ipe"
      >
        <FlaskConical aria-hidden className="size-3.5" />
        <span className="hidden sm:inline">{badge}</span>
        <span className="sr-only sm:hidden">{badge}</span>
      </button>
      <div
        id={popoverId}
        popover="auto"
        role="dialog"
        aria-labelledby={`${popoverId}-title`}
        className="fixed inset-auto top-20 right-4 m-0 w-[min(22rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-5 text-fg shadow-pop"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${popoverId}-title`} className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConical aria-hidden className="size-4 text-highlight-ink" />
            {title}
          </h2>
          <button
            type="button"
            popoverTarget={popoverId}
            popoverTargetAction="hide"
            aria-label={messages.common.close}
            className="-m-1 rounded-md p-1 text-fg-muted hover:bg-surface-muted hover:text-fg"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{description}</p>
        <p className="mt-3 border-t border-line pt-3 text-xs text-fg-muted">
          {messages.legal.seal}
        </p>
      </div>
    </>
  );
}
