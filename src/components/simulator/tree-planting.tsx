"use client";

import { AlertTriangle, Minus, Plus } from "lucide-react";
import { Meter } from "@/components/ui/meter";
import type { Block } from "@/domain/block/schema";
import { SPECIES, TREE_SIZE_LABELS, type SpeciesId } from "@/domain/prescription/species";
import { cn } from "@/lib/cn";
import { formatDecimal, formatInteger } from "@/lib/format";
import { messages } from "@/lib/i18n";
import {
  isUnsuitable,
  MAX_TREES_PER_SPECIES,
  orderedSpecies,
  type ScenarioDraft,
} from "./scenario";

interface TreePlantingProps {
  block: Block;
  capacity: number;
  trees: ScenarioDraft["trees"];
  onChange: (trees: ScenarioDraft["trees"]) => void;
}

const STEP = 5;

/** Quantidade por espécie, com a capacidade do quarteirão sempre visível. */
export function TreePlanting({ block, capacity, trees, onChange }: TreePlantingProps) {
  const t = messages.simulator;
  const total = Object.values(trees).reduce((sum, n) => sum + (n ?? 0), 0);
  const set = (id: SpeciesId, value: number) => {
    const count = Math.max(0, Math.min(MAX_TREES_PER_SPECIES, Math.round(value) || 0));
    onChange({ ...trees, [id]: count });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-fg-muted">{t.treesHint(formatInteger(capacity))}</p>
      <Meter
        value={capacity > 0 ? total / capacity : total > 0 ? 1 : 0}
        label={messages.simulator.metrics.trees}
        valueText={t.treesUsed(formatInteger(total), formatInteger(capacity))}
        color={total > capacity ? "var(--chart-current)" : undefined}
      />
      <ul className="flex flex-col divide-y divide-line rounded-control border border-line">
        {orderedSpecies(block).map((id) => {
          const species = SPECIES[id];
          const count = trees[id] ?? 0;
          const unsuitable = isUnsuitable(id, block);
          const inputId = `trees-${id}`;
          return (
            <li
              key={id}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5",
                unsuitable && "bg-surface-muted/50",
              )}
            >
              <label htmlFor={inputId} className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-fg">{species.commonName}</span>
                <span className="text-xs text-fg-muted">
                  {t.speciesMeta(
                    TREE_SIZE_LABELS[species.size],
                    `${formatDecimal(species.crownDiameterM, 0)} m`,
                    `${formatDecimal(species.minSidewalkM)} m`,
                  )}
                </span>
                {unsuitable && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-warning-fg">
                    <AlertTriangle aria-hidden className="size-3" />
                    {t.unsuitable}
                  </span>
                )}
              </label>
              <div className="flex shrink-0 items-center rounded-control border border-line">
                <button
                  type="button"
                  onClick={() => set(id, count - STEP)}
                  disabled={count === 0}
                  aria-label={t.decrease(species.commonName)}
                  className="grid size-8 place-items-center text-fg-muted hover:text-fg disabled:opacity-40"
                >
                  <Minus aria-hidden className="size-4" />
                </button>
                <input
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_TREES_PER_SPECIES}
                  value={count}
                  onChange={(event) => set(id, Number(event.target.value))}
                  aria-label={t.speciesCount(species.commonName)}
                  className="h-8 w-14 [appearance:textfield] border-x border-line bg-surface text-center text-sm font-semibold text-fg tabular [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => set(id, count + STEP)}
                  disabled={count >= MAX_TREES_PER_SPECIES}
                  aria-label={t.increase(species.commonName)}
                  className="grid size-8 place-items-center text-fg-muted hover:text-fg disabled:opacity-40"
                >
                  <Plus aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
