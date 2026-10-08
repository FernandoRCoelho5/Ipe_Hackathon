import { CloudOff, Grid3x3, Satellite, ThermometerSun, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { MAP_LAYERS, type ContinuousLayer } from "@/components/map/scales";
import { messages } from "@/lib/i18n";
import type { Showcase } from "@/server/services/showcase";
import { LandingSection } from "./section";
import { ShowcaseMap } from "./showcase-map";

const t = messages.landing.problem;
const GAP_ICONS = [Grid3x3, ThermometerSun, CloudOff] as const;

/** 01 · Problema: o número de mortes e a diferença entre pixel de satélite e quarteirão. */
export function ProblemSection({ showcase }: { showcase: Showcase | null }) {
  return (
    <LandingSection id="problema" eyebrow={t.eyebrow} title={t.title}>
      <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex reveal flex-col gap-8">
          <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6 shadow-card">
            <p className="text-6xl leading-none font-bold tracking-tight text-danger tabular md:text-7xl">
              {t.deaths}
            </p>
            <p className="text-lg leading-relaxed text-fg">{t.deathsLabel}</p>
            <p className="text-xs text-fg-subtle">Fonte: {t.deathsSource}</p>
          </div>
          <ul className="flex flex-col gap-5">
            {t.gaps.map((gap, i) => {
              const Icon = GAP_ICONS[i];
              return (
                <li key={gap.title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-semibold text-fg">{gap.title}</h3>
                    <p className="text-sm leading-relaxed text-fg-muted">{gap.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {showcase && (
          <figure className="flex reveal flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ComparisonPanel
                icon={Satellite}
                title={t.satelliteTitle}
                body={t.satelliteBody}
                legend={
                  <ScaleBar layer={MAP_LAYERS.lst as ContinuousLayer} label={t.surfaceScale} />
                }
              >
                <ShowcaseMap showcase={showcase} mode="pixels" label={t.satelliteBody} />
              </ComparisonPanel>
              <ComparisonPanel
                icon={ThermometerSun}
                title={t.ipeTitle}
                body={t.ipeBody}
                legend={<ScaleBar layer={MAP_LAYERS.utci as ContinuousLayer} label={t.utciScale} />}
              >
                <ShowcaseMap showcase={showcase} mode="utci" label={t.ipeBody} />
              </ComparisonPanel>
            </div>
            <figcaption className="text-xs text-fg-subtle">
              {t.comparisonCaption(showcase.neighborhood, showcase.municipality)}
            </figcaption>
          </figure>
        )}
      </div>
    </LandingSection>
  );
}

function ComparisonPanel({
  icon: Icon,
  title,
  body,
  legend,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  legend: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="flex flex-col gap-1 px-4 pt-4 pb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Icon aria-hidden className="size-4 text-accent" />
          {title}
        </h3>
        <p className="text-xs leading-relaxed text-fg-muted">{body}</p>
      </div>
      <div className="aspect-[780/480] border-y border-line">{children}</div>
      <div className="px-4 py-3">{legend}</div>
    </div>
  );
}

/** Escala de cor com mínimo e máximo (legenda compacta dos painéis estáticos). */
function ScaleBar({ layer, label }: { layer: ContinuousLayer; label: string }) {
  const min = layer.stops[0][0];
  const max = layer.stops[layer.stops.length - 1][0];
  const gradient = layer.stops
    .map(([value, color]) => `${color} ${((value - min) / (max - min)) * 100}%`)
    .join(", ");
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-medium text-fg-muted">{label}</p>
      <div
        aria-hidden
        className="h-2 rounded-full ring-1 ring-black/5"
        style={{ backgroundImage: `linear-gradient(90deg, ${gradient})` }}
      />
      <p className="flex justify-between text-[11px] text-fg-subtle tabular">
        <span>{layer.format(min)}</span>
        <span>{layer.format(max)}</span>
      </p>
    </div>
  );
}
