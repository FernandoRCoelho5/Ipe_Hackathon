import {
  ArrowRight,
  Building2,
  FileText,
  Landmark,
  Leaf,
  Maximize2,
  PiggyBank,
} from "lucide-react";
import { buttonStyles, ButtonLink } from "@/components/ui/button";
import { messages } from "@/lib/i18n";
import { LandingSection } from "./section";

const t = messages.landing.adoption;
const STEP_ICONS = [Building2, FileText, PiggyBank, Landmark] as const;
const CONTINUITY_ICONS = [Leaf, Maximize2] as const;

/** 06 · Adoção e escala: B2B → relatórios → captação → prefeituras, e as chamadas finais. */
export function AdoptionSection() {
  return (
    <LandingSection id="adocao" eyebrow={t.eyebrow} title={t.title}>
      <ol className="grid reveal gap-3 md:grid-cols-2 xl:grid-cols-4">
        {t.steps.map((step, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <li
              key={step.title}
              className="relative flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="text-xs font-semibold text-highlight-ink tabular">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-base font-semibold text-fg">{step.title}</h3>
              <p className="text-sm leading-relaxed text-fg-muted">{step.body}</p>
            </li>
          );
        })}
      </ol>

      <ul className="grid reveal gap-4 md:grid-cols-2">
        {t.continuity.map((item, i) => {
          const Icon = CONTINUITY_ICONS[i];
          return (
            <li
              key={item.title}
              className="flex gap-4 rounded-card border border-dashed border-line-strong p-5"
            >
              <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-fg">{item.title}</h3>
                <p className="text-sm leading-relaxed text-fg-muted">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="relative reveal overflow-hidden rounded-4xl bg-verde-ipe px-6 py-10 text-white shadow-pop sm:px-10">
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 brand-gradient" />
        <div
          aria-hidden
          className="absolute -top-24 -right-24 size-72 rounded-full bg-amarelo-ipe/15 blur-2xl"
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-xl flex-col gap-2">
            <h3 className="text-2xl font-bold tracking-tight md:text-3xl">{t.ctaTitle}</h3>
            <p className="text-base leading-relaxed text-white/80">{t.ctaBody}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/mapa?demo=1" size="lg" variant="highlight">
              {messages.landing.ctaDemo}
              <ArrowRight aria-hidden />
            </ButtonLink>
            <a
              href="#piloto"
              className={buttonStyles({
                size: "lg",
                variant: "ghost",
                className: "border border-white/40 text-white hover:bg-white/10",
              })}
            >
              {messages.landing.ctaPilot}
            </a>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
