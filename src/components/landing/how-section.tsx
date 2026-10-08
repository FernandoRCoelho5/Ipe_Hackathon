import { ArrowRight, Cpu, Database, Layers, MonitorSmartphone, Wallet } from "lucide-react";
import { messages } from "@/lib/i18n";
import { LandingSection } from "./section";

const t = messages.landing.how;
const BLOCK_ICONS = [Database, Cpu, Layers, MonitorSmartphone] as const;

/** 04 · Como funciona: arquitetura em 4 blocos, cronograma do piloto e investimento. */
export function HowSection() {
  return (
    <LandingSection id="como-funciona" eyebrow={t.eyebrow} title={t.title} lead={t.scale}>
      <ol className="grid reveal gap-3 md:grid-cols-2 xl:grid-cols-4">
        {t.blocks.map((block, i) => {
          const Icon = BLOCK_ICONS[i];
          return (
            <li
              key={block.title}
              className="relative flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-card"
            >
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold text-fg">
                  <Icon aria-hidden className="size-5 text-accent" />
                  {block.title}
                </h3>
                {i < t.blocks.length - 1 && (
                  <ArrowRight aria-hidden className="hidden size-4 text-highlight-ink xl:block" />
                )}
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {block.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-line bg-surface-muted px-2.5 py-1 text-xs text-fg"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_20rem]">
        <section
          aria-labelledby="timeline-title"
          className="flex reveal flex-col gap-5 rounded-card border border-line bg-surface p-6 shadow-card"
        >
          <h3 id="timeline-title" className="text-lg font-semibold text-fg">
            {t.timelineTitle}
          </h3>
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:gap-3">
            {t.timeline.map((item, i) => (
              <li key={item.month} className="relative flex flex-col gap-2 xl:pt-5">
                {i < t.timeline.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-1.5 -right-3 left-5 hidden h-0.5 bg-line xl:block"
                  />
                )}
                <span
                  aria-hidden
                  className="absolute top-0 left-0 hidden size-3.5 rounded-full border-2 border-amarelo-ipe bg-surface xl:block"
                />
                <p className="text-xs font-semibold tracking-[0.12em] text-highlight-ink uppercase">
                  {item.month}
                </p>
                <p className="text-sm font-semibold text-fg">{item.title}</p>
                <p className="text-xs leading-relaxed text-fg-muted">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="relative flex reveal flex-col justify-between gap-6 overflow-hidden rounded-card bg-verde-ipe p-6 text-white shadow-pop">
          <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 brand-gradient" />
          <Wallet aria-hidden className="size-8 text-amarelo-ipe" />
          <div className="flex flex-col gap-2">
            <p className="text-4xl font-bold tracking-tight tabular">{t.investment}</p>
            <p className="text-sm leading-relaxed text-white/80">{t.investmentLabel}</p>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
