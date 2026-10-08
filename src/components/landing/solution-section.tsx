import { BrainCircuit, Check, ChevronRight, ClipboardCheck, Satellite } from "lucide-react";
import { messages } from "@/lib/i18n";
import { LandingSection } from "./section";

const t = messages.landing.solution;
const STEP_ICONS = [Satellite, BrainCircuit, ClipboardCheck] as const;

/** 02 · Solução: Dados → Inteligência → Entregas, e os diferenciais visíveis no produto. */
export function SolutionSection() {
  return (
    <LandingSection id="solucao" eyebrow={t.eyebrow} title={t.title} tone="muted">
      <ol className="grid gap-4 lg:grid-cols-3 lg:gap-8">
        {t.steps.map((step, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <li key={step.title} className="relative flex reveal">
              <article className="flex flex-1 flex-col gap-5 rounded-card border border-line bg-surface p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-verde-ipe text-white dark:bg-accent-soft dark:text-accent">
                    <Icon aria-hidden className="size-6" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-highlight-ink tabular">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-xl font-bold tracking-tight text-fg">{step.title}</h3>
                  </div>
                </div>
                <p className="text-sm font-medium text-fg-muted">{step.subtitle}</p>
                <ul className="flex flex-col gap-2.5 text-sm text-fg">
                  {step.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
              {i < t.steps.length - 1 && (
                <ChevronRight
                  aria-hidden
                  className="absolute top-1/2 -right-7 hidden size-6 -translate-y-1/2 text-highlight-ink lg:block"
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex reveal flex-col gap-4">
        <h3 className="text-sm font-semibold tracking-[0.14em] text-fg-muted uppercase">
          {t.differentiatorsTitle}
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {t.differentiators.map((item, i) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-control border border-line bg-surface px-4 py-3 text-sm font-medium text-fg"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amarelo-ipe text-xs font-bold text-verde-ipe tabular">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </LandingSection>
  );
}
