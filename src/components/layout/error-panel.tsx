"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { messages } from "@/lib/i18n";
import { logger } from "@/lib/logger";

interface ErrorPanelProps {
  error: Error & { digest?: string };
  retry: () => void;
}

/** Conteúdo compartilhado dos arquivos `error.tsx`. */
export function ErrorPanel({ error, retry }: ErrorPanelProps) {
  useEffect(() => {
    logger.error("Falha ao renderizar a rota", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-20 text-center"
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle aria-hidden className="size-7" />
      </span>
      <h1 className="text-xl font-semibold text-fg">{messages.errors.genericTitle}</h1>
      <p className="text-sm leading-relaxed text-fg-muted">{messages.errors.genericDescription}</p>
      {error.digest && <p className="font-mono text-xs text-fg-subtle">ref. {error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>
          <RotateCcw aria-hidden />
          {messages.common.tryAgain}
        </Button>
        <ButtonLink href="/" variant="outline">
          {messages.common.backToStart}
        </ButtonLink>
      </div>
    </div>
  );
}
