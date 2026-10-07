"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/i18n";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Texto acima do título (código do quarteirão, por exemplo). */
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Gaveta lateral sobre `<dialog>` modal nativo (ADR-005): foco preso, Esc, top layer
 * e devolução de foco ao fechar. Clique no fundo também fecha.
 */
export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  className,
}: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-2xl bg-transparent p-0 text-fg backdrop:bg-verde-ipe-950/45 backdrop:backdrop-blur-[2px] open:animate-fade-in",
        className,
      )}
    >
      <div className="flex h-full flex-col border-l border-line bg-surface shadow-pop">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex min-w-0 flex-col gap-1">
            {eyebrow && (
              <p className="text-xs font-medium tracking-[0.14em] text-fg-muted uppercase">
                {eyebrow}
              </p>
            )}
            <h2 id={titleId} className="text-lg font-semibold text-fg">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={messages.common.close}
            className="-m-1 rounded-md p-1.5 text-fg-muted hover:bg-surface-muted hover:text-fg"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <footer className="border-t border-line px-5 py-4 sm:px-6">{footer}</footer>}
      </div>
    </dialog>
  );
}
