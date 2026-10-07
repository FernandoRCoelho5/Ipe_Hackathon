import { formatHour } from "@/lib/format";

export interface TooltipRow {
  key: string;
  label: string;
  value: string;
  color: string;
  dashed?: boolean;
}

/** Conteúdo do tooltip dos gráficos: valor em destaque, série em segundo plano, chave em linha. */
export function ChartTooltipCard({ hour, rows }: { hour: number; rows: TooltipRow[] }) {
  return (
    <div className="min-w-44 rounded-control border border-line bg-surface p-3 text-xs shadow-pop">
      <p className="mb-2 font-semibold text-fg tabular">{formatHour(hour)}</p>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <svg aria-hidden width="16" height="4" className="shrink-0">
              <line
                x1="0"
                x2="16"
                y1="2"
                y2="2"
                stroke={row.color}
                strokeWidth="2"
                strokeDasharray={row.dashed ? "4 3" : undefined}
              />
            </svg>
            <span className="font-semibold text-fg tabular">{row.value}</span>
            <span className="text-fg-muted">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Eixos e grade discretos, iguais em todos os gráficos. */
export const AXIS_PROPS = {
  stroke: "var(--chart-axis)",
  tick: { fill: "var(--chart-axis)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;
