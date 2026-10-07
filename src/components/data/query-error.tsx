"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ApiClientError } from "@/lib/api/client";
import { messages } from "@/lib/i18n";

/** Falha de carregamento com a mensagem da API e opção de tentar de novo. */
export function QueryError({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const detail = error instanceof ApiClientError ? error.message : undefined;
  return (
    <Callout
      tone="danger"
      role="alert"
      title={messages.data.loadError}
      className={className}
      action={
        onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCcw aria-hidden />
            {messages.data.retry}
          </Button>
        )
      }
    >
      {detail}
    </Callout>
  );
}
