import { cn } from "@/lib/cn";

interface SparklineProps {
  values: readonly number[];
  /** Descrição para leitores de tela (o gráfico em si é decorativo). */
  label: string;
  className?: string;
  width?: number;
  height?: number;
}

/** Minigráfico de linha em SVG puro (sem eixo): só a forma da série recente. */
export function Sparkline({ values, label, className, width = 120, height = 32 }: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const points = values
    .map(
      (v, i) =>
        `${(i * step).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`,
    )
    .join(" ");
  const last = points.split(" ").at(-1)!.split(",");
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--chart-current)"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--chart-current)" />
    </svg>
  );
}
