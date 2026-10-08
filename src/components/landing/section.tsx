import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface LandingSectionProps {
  id: string;
  /** "01 · O problema": número em Amarelo Ipê, como no manual. */
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  /** Conteúdo à direita do título (selo, ação). */
  aside?: ReactNode;
  tone?: "plain" | "muted";
  children: ReactNode;
  className?: string;
}

/** Seção da landing com âncora (menu do cabeçalho), título e revelação sutil ao rolar. */
export function LandingSection({
  id,
  eyebrow,
  title,
  lead,
  aside,
  tone = "plain",
  children,
  className,
}: LandingSectionProps) {
  const [number, ...rest] = eyebrow.split(" · ");
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-20", tone === "muted" && "border-y border-line bg-surface-muted/60")}
    >
      <div
        className={cn(
          "mx-auto flex max-w-360 flex-col gap-10 px-4 py-16 sm:px-6 md:py-24 lg:px-10",
          className,
        )}
      >
        <header className="flex reveal flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-3xl flex-col gap-3">
            <p className="text-xs font-medium tracking-[0.2em] text-fg-muted uppercase">
              <span className="mr-2 font-semibold text-highlight-ink">{number}</span>
              {rest.join(" · ")}
            </p>
            <h2
              id={`${id}-title`}
              className="text-3xl leading-tight font-bold tracking-tight text-balance text-fg md:text-4xl"
            >
              {title}
            </h2>
            {lead && <p className="text-lg leading-relaxed text-fg-muted">{lead}</p>}
          </div>
          {aside}
        </header>
        {children}
      </div>
    </section>
  );
}
