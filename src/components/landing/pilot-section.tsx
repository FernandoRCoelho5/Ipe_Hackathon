import { CalendarRange, FileCheck2, MapPinned, ShieldCheck } from "lucide-react";
import { messages } from "@/lib/i18n";
import { PilotRequestForm } from "./pilot-request-form";

const t = messages.landing.pilot;

const HIGHLIGHTS = [
  { icon: MapPinned, text: messages.landing.hero.regionNote },
  {
    icon: CalendarRange,
    text: `${messages.landing.how.timelineTitle} · ${messages.landing.how.investment}`,
  },
  { icon: FileCheck2, text: messages.legal.seal },
  { icon: ShieldCheck, text: messages.legal.pilotPrivacy },
] as const;

/** Chamada final: formulário "Solicitar piloto" (âncora #piloto). */
export function PilotSection() {
  return (
    <section
      id="piloto"
      aria-labelledby="piloto-title"
      className="scroll-mt-20 border-t border-line"
    >
      <div className="mx-auto grid max-w-360 items-start gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <div className="flex reveal flex-col gap-5">
          <p className="text-xs font-medium tracking-[0.2em] text-fg-muted uppercase">
            {t.eyebrow}
          </p>
          <h2
            id="piloto-title"
            className="text-3xl leading-tight font-bold tracking-tight text-balance text-fg md:text-4xl"
          >
            {t.title}
          </h2>
          <span aria-hidden className="h-1.5 w-20 rounded-full bg-amarelo-ipe" />
          <p className="text-lg leading-relaxed text-fg-muted">{t.lead}</p>
          <ul className="flex flex-col gap-3 pt-2">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3 text-sm leading-relaxed text-fg">
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
          <PilotRequestForm />
        </div>
      </div>
    </section>
  );
}
