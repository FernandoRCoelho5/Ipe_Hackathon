import { ArrowRight, MapPinned, Sparkles, ThermometerSun } from "lucide-react";
import { IvtuBadge } from "@/components/data/badges";
import { ButtonLink } from "@/components/ui/button";
import { formatTemperature } from "@/lib/format";
import { messages } from "@/lib/i18n";
import type { Showcase } from "@/server/services/showcase";
import { ShowcaseMap } from "./showcase-map";

const t = messages.landing;

/** Abertura do pitch: promessa, chamadas e uma prévia real do mapa de calor. */
export function Hero({ showcase }: { showcase: Showcase | null }) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full bg-amarelo-ipe/10 blur-3xl dark:bg-amarelo-ipe/5"
      />
      <div className="mx-auto grid max-w-360 items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_1fr] lg:px-10">
        <div className="flex animate-slide-up flex-col gap-6">
          <p className="text-xs font-medium tracking-[0.2em] text-fg-muted uppercase">
            {t.hero.eyebrow}
          </p>
          <h1 className="text-4xl leading-[1.1] font-bold tracking-tight text-balance text-fg md:text-5xl xl:text-6xl">
            {t.hero.title}
          </h1>
          <span aria-hidden className="h-1.5 w-24 rounded-full bg-amarelo-ipe" />
          <p className="max-w-2xl text-lg leading-relaxed text-fg-muted">{t.hero.lead}</p>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/mapa?demo=1" size="lg">
              {t.ctaDemo}
              <ArrowRight aria-hidden />
            </ButtonLink>
            <ButtonLink href="#piloto" size="lg" variant="outline">
              {t.ctaPilot}
            </ButtonLink>
          </div>
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <MapPinned aria-hidden className="size-4 text-accent" />
            {t.hero.regionNote}
          </p>
          <dl className="mt-2 grid grid-cols-1 gap-4 border-t border-line pt-6 sm:grid-cols-3">
            {t.hero.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <dt className="order-2 text-sm leading-snug text-fg-muted">{stat.label}</dt>
                <dd className="order-1 text-2xl font-bold tracking-tight text-fg">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {showcase && <HeroPreview showcase={showcase} />}
      </div>
    </section>
  );
}

function HeroPreview({ showcase }: { showcase: Showcase }) {
  const { focus } = showcase;
  return (
    <figure className="relative">
      <div className="overflow-hidden rounded-4xl border border-line bg-surface shadow-pop">
        <div aria-hidden className="h-1 brand-gradient" />
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            <ThermometerSun aria-hidden className="size-4 text-laranja-sol" />
            {messages.nav.items.map.label} · {showcase.municipality}
          </p>
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted">
            UTCI · 08h–18h
          </span>
        </div>
        <ShowcaseMap
          showcase={showcase}
          mode="utci"
          highlight
          label={t.hero.visualLabel(focus.street, showcase.municipality)}
          className="aspect-[780/480]"
        />
      </div>

      <div className="relative -mt-16 ml-4 flex max-w-sm flex-col gap-3 rounded-card border border-line bg-surface/95 p-4 shadow-pop backdrop-blur-md sm:-mt-24 sm:ml-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-medium tracking-[0.14em] text-fg-muted uppercase">
              {focus.code}
            </span>
            <span className="truncate text-sm font-semibold text-fg">{focus.street}</span>
          </div>
          <IvtuBadge score={focus.ivtu} level={focus.ivtuLevel} className="shrink-0" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-fg tabular">
            {formatTemperature(focus.utciPeak)}
          </span>
          <span className="text-xs text-fg-muted">
            {t.hero.peak} · {focus.stressLabel}
          </span>
        </div>
        {focus.recommendation && (
          <p className="flex items-start gap-2 rounded-control bg-accent-soft px-3 py-2 text-xs text-fg">
            <Sparkles aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent" />
            <span>
              <strong className="font-semibold">{t.hero.recommendation}:</strong>{" "}
              {focus.recommendation.title} · {focus.recommendation.level}
            </span>
          </p>
        )}
      </div>
      <figcaption className="mt-3 text-right text-xs text-fg-subtle">
        {t.hero.visualCaption(showcase.municipality)}
      </figcaption>
    </figure>
  );
}
