import { IVTU_LEVEL_COLORS, readableTextOn, utciColor } from "@/components/map/scales";
import { IVTU_LEVEL_LABELS, type IvtuLevel } from "@/domain/ivtu/ivtu";
import { EXECUTION_LEVEL_LABELS, type ExecutionLevel } from "@/domain/prescription/engine";
import { classifyThermalStress } from "@/domain/thermal/stress";
import { cn } from "@/lib/cn";
import { formatDecimal, formatTemperature } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

/**
 * Selos de dado: a cor vem da escala térmica e SEMPRE acompanha número e rótulo,
 * para que a leitura não dependa só da cor (daltonismo).
 */

const chip =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap tabular";

export function IvtuBadge({
  score,
  level,
  className,
  showScore = true,
}: {
  score?: number;
  level: IvtuLevel;
  className?: string;
  showScore?: boolean;
}) {
  const background = IVTU_LEVEL_COLORS[level];
  return (
    <span
      className={cn(chip, className)}
      style={{ backgroundColor: background, color: readableTextOn(background) }}
    >
      {showScore && score !== undefined && <span>{formatDecimal(score)}</span>}
      <span className={showScore && score !== undefined ? "font-medium" : undefined}>
        {IVTU_LEVEL_LABELS[level]}
      </span>
    </span>
  );
}

/** UTCI com a cor da escala e a categoria oficial de estresse (no título ou visível). */
export function UtciChip({
  utci,
  showCategory = false,
  className,
}: {
  utci: number;
  showCategory?: boolean;
  className?: string;
}) {
  const background = utciColor(utci);
  const category = classifyThermalStress(utci).label;
  return (
    <span
      title={category}
      className={cn(chip, className)}
      style={{ backgroundColor: background, color: readableTextOn(background) }}
    >
      {formatTemperature(utci)}
      {showCategory ? (
        <span className="font-medium">· {category}</span>
      ) : (
        <span className="sr-only">({category})</span>
      )}
    </span>
  );
}

export function ExecutionLevelBadge({ level }: { level: ExecutionLevel }) {
  return (
    <Badge tone={level === "tatico" ? "accent" : "info"}>{EXECUTION_LEVEL_LABELS[level]}</Badge>
  );
}
