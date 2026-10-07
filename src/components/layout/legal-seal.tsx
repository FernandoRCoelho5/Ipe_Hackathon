import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/i18n";

/** Selo jurídico obrigatório: o sistema é suporte à decisão, não decisor. */
export function LegalSeal({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-control border border-line bg-surface-muted/70 p-3 text-xs leading-relaxed text-fg-muted",
        className,
      )}
    >
      <p className="flex gap-2">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        <span>{messages.legal.seal}</span>
      </p>
      {!compact && (
        <Link
          href="/privacidade"
          className="mt-2 ml-6 inline-block font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent"
        >
          {messages.legal.privacyTitle}
        </Link>
      )}
    </div>
  );
}
