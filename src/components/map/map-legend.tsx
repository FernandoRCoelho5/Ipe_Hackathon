import { cn } from "@/lib/cn";
import { messages } from "@/lib/i18n";
import type { MapLayerConfig } from "./scales";

interface MapLegendProps {
  layer: MapLayerConfig;
  /** Contagem por classe (IVTU) para mostrar ao lado de cada cor. */
  counts?: Partial<Record<string, number>>;
  className?: string;
}

/** Legenda com valores numéricos e rótulos: a leitura nunca depende só da cor. */
export function MapLegend({ layer, counts, className }: MapLegendProps) {
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <figcaption className="text-xs font-semibold text-fg">{layer.label}</figcaption>
      {layer.kind === "categorical" ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {layer.classes.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-sm ring-1 ring-black/10"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-fg">{c.label}</span>
              <span className="text-fg-subtle tabular">{c.range}</span>
              {counts?.[c.id] !== undefined && (
                <span className="ml-auto font-semibold text-fg tabular">{counts[c.id]}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div>
          <div
            aria-hidden
            className="h-2.5 rounded-full ring-1 ring-black/5"
            style={{
              backgroundImage: `linear-gradient(90deg, ${gradientStops(layer.stops)})`,
            }}
          />
          <ol className="relative mt-1 h-4 text-[11px] text-fg-muted tabular">
            {layer.ticks.map((tick) => (
              <li
                key={tick}
                className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
                style={{ left: `${tickPosition(layer.stops, tick)}%` }}
              >
                {layer.format(tick)}
              </li>
            ))}
          </ol>
          <p className="sr-only">
            {layer.ticks.map((tick) => `${layer.format(tick)}: ${layer.describe(tick)}`).join("; ")}
          </p>
        </div>
      )}
      <p className="text-[11px] leading-snug text-fg-subtle">{messages.map.legendNoColorOnly}</p>
    </figure>
  );
}

function gradientStops(stops: readonly (readonly [number, string])[]): string {
  return stops.map(([value, color]) => `${color} ${tickPosition(stops, value)}%`).join(", ");
}

function tickPosition(stops: readonly (readonly [number, string])[], value: number): number {
  const min = stops[0][0];
  const max = stops[stops.length - 1][0];
  return ((value - min) / (max - min)) * 100;
}
