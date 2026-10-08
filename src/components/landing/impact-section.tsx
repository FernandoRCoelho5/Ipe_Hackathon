import { BriefcaseBusiness, FlaskConical, HeartPulse, MapPinned } from "lucide-react";
import { messages } from "@/lib/i18n";
import { LandingSection } from "./section";

const t = messages.landing.impact;
const ICONS = [HeartPulse, BriefcaseBusiness, MapPinned] as const;

/** 05 · Impacto esperado: só números das fontes do projeto, com o selo de estimativa. */
export function ImpactSection() {
  return (
    <LandingSection
      id="impacto"
      eyebrow={t.eyebrow}
      title={t.title}
      tone="muted"
      aside={
        <p className="inline-flex items-center gap-2 self-start rounded-full border border-amarelo-ipe/60 bg-warning-soft px-3 py-1.5 text-xs font-semibold text-warning-fg md:self-auto">
          <FlaskConical aria-hidden className="size-4" />
          {t.seal}
        </p>
      }
    >
      <ul className="grid gap-4 md:grid-cols-3">
        {t.columns.map((column, i) => {
          const Icon = ICONS[i];
          return (
            <li
              key={column.title}
              className="flex reveal flex-col gap-4 rounded-card border border-line bg-surface p-6 shadow-card"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold tracking-[0.12em] text-fg-muted uppercase">
                <Icon aria-hidden className="size-5 text-accent" />
                {column.title}
              </h3>
              <p className="text-5xl font-bold tracking-tight text-fg tabular">{column.value}</p>
              <p className="text-base leading-relaxed text-fg">{column.statement}</p>
              <p className="text-xs text-fg-subtle">Fonte: {column.source}</p>
              <p className="mt-auto border-t border-line pt-4 text-sm leading-relaxed text-fg-muted">
                <span className="font-semibold text-accent">Ipê: </span>
                {column.ipe}
              </p>
            </li>
          );
        })}
      </ul>
    </LandingSection>
  );
}
