import {
  Droplets,
  Gauge,
  ListChecks,
  MapPin,
  PaintRoller,
  Sprout,
  Trees,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { ExecutionLevelBadge } from "@/components/data/badges";
import { Badge } from "@/components/ui/badge";
import {
  INTERVENTION_LABELS,
  POTENTIAL_SITE_LABELS,
  type InterventionType,
  type Recommendation,
} from "@/domain/prescription/engine";
import { SPECIES } from "@/domain/prescription/species";
import { cn } from "@/lib/cn";
import { formatDecimal, formatPercent } from "@/lib/format";
import { messages } from "@/lib/i18n";

export const INTERVENTION_ICONS: Record<InterventionType, LucideIcon> = {
  arborizacao: Trees,
  "pavimento-permeavel": Droplets,
  "telhado-frio": PaintRoller,
};

interface RecommendationCardProps {
  recommendation: Recommendation;
  /** Versão resumida (painel do mapa): título, prazo, confiança e duas justificativas. */
  compact?: boolean;
  className?: string;
}

/** Recomendação do motor prescritivo com o "por quê" sempre visível. */
export function RecommendationCard({
  recommendation: r,
  compact = false,
  className,
}: RecommendationCardProps) {
  const t = messages.prescription.detail;
  const rationale = compact ? r.rationale.slice(0, 2) : r.rationale;
  const Icon = INTERVENTION_ICONS[r.type];
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-control border border-line bg-surface p-4",
        className,
      )}
    >
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-fg-muted uppercase">
          {INTERVENTION_LABELS[r.type]}
        </p>
        <h3 className="flex items-start gap-2 text-base font-semibold text-fg">
          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          {r.title}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <ExecutionLevelBadge level={r.level} />
          <Badge>
            <Gauge aria-hidden />
            {messages.map.panel.confidence(formatPercent(r.confidence))}
          </Badge>
          {!compact && <Badge>{t.priority(formatDecimal(r.priority, 0))}</Badge>}
        </div>
      </header>

      {!compact && r.actions.length > 0 && (
        <Section title={t.actions} icon={ListChecks}>
          <ul className="list-disc space-y-1 pl-5">
            {r.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={compact ? undefined : t.rationale}>
        <ul className="space-y-1.5">
          {rationale.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-amarelo-ipe" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Section>

      {!compact && r.potentialSites.length > 0 && (
        <Section title={t.sites} icon={MapPin}>
          <ul className="flex flex-wrap gap-1.5">
            {r.potentialSites.map((site) => (
              <li key={site}>
                <Badge>{POTENTIAL_SITE_LABELS[site]}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-fg-subtle">{messages.legal.potentialSites}</p>
        </Section>
      )}

      {!compact && r.suggestedSpecies.length > 0 && (
        <Section title={t.species} icon={Sprout}>
          <ul className="flex flex-col gap-1">
            {r.suggestedSpecies.map((id) => (
              <li key={id}>
                <span className="font-medium text-fg">{SPECIES[id].commonName}</span>{" "}
                <span className="text-fg-subtle italic">{SPECIES[id].scientificName}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5 text-sm leading-relaxed text-fg-muted">
      {title && (
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-fg">
          {Icon && <Icon aria-hidden className="size-3.5 text-accent" />}
          {title}
        </h4>
      )}
      {children}
    </section>
  );
}
