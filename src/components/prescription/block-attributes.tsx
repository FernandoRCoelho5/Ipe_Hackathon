import type { Block } from "@/domain/block/schema";
import { formatDecimal, formatInteger, formatPercent, formatTemperature } from "@/lib/format";
import { messages } from "@/lib/i18n";

/** Atributos observados do quarteirão (satélite, OSM e censo) em grade compacta. */
export function BlockAttributes({ block, drainageRisk }: { block: Block; drainageRisk: number }) {
  const a = messages.map.panel.attributes;
  const items: [string, string][] = [
    [a.lst, formatTemperature(block.lstC)],
    [a.canopy, formatPercent(block.canopyCover)],
    [a.impervious, formatPercent(block.imperviousness)],
    [a.pedestrians, messages.map.panel.pedestriansValue(formatInteger(block.pedestrianFlow))],
    [a.elderly, formatPercent(block.elderlyShare)],
    [a.drainage, formatPercent(drainageRisk)],
    [a.sidewalk, `${formatDecimal(block.sidewalkWidthM)} m`],
    [a.population, formatInteger(block.population)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-fg-muted">{label}</dt>
          <dd className="text-sm font-semibold text-fg tabular">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
