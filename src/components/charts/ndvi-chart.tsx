"use client";

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import type { NdviObservation } from "@/domain/adoption/schema";
import { formatDate, formatDecimal } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { AXIS_PROPS } from "./chart-tooltip";

interface Point {
  t: number;
  date: string;
  sensor: NdviObservation["sensor"];
  clear: number | null;
  cloudy: number | null;
}

/**
 * Série de NDVI de uma área adotada. Observações válidas formam a linha; as com nuvem
 * aparecem como pontos vazados (fora da tendência), sem depender só da cor.
 */
export function NdviChart({
  series,
  height = 220,
}: {
  series: readonly NdviObservation[];
  height?: number;
}) {
  const t = messages.adopt.detail;
  const data: Point[] = series.map((o) => ({
    t: new Date(o.date).getTime(),
    date: o.date,
    sensor: o.sensor,
    clear: o.cloudy ? null : o.ndvi,
    cloudy: o.cloudy ? o.ndvi : null,
  }));
  const values = series.map((o) => o.ndvi);
  const domain: [number, number] = [
    Math.floor(Math.min(0, ...values) * 10) / 10,
    Math.ceil(Math.max(0.3, ...values) * 10) / 10,
  ];

  return (
    <figure className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-x-4 text-xs text-fg-muted">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full bg-verde-folha" />
          {t.clear}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full border-2 border-fg-subtle" />
          {t.cloudy}
        </li>
      </ul>
      <LineChart
        responsive
        data={data}
        style={{ width: "100%", height }}
        margin={{ top: 8, right: 12, bottom: 0, left: -18 }}
      >
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(v: number) => formatDate(v, "dayMonth")}
          minTickGap={40}
          {...AXIS_PROPS}
        />
        <YAxis
          domain={domain}
          tickFormatter={(v: number) => formatDecimal(v, 1)}
          width={44}
          {...AXIS_PROPS}
        />
        <Tooltip
          cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as Point | undefined;
            if (!active || !p) return null;
            const value = p.clear ?? p.cloudy ?? 0;
            return (
              <div className="rounded-control border border-line bg-surface p-3 text-xs shadow-pop">
                <p className="mb-1 font-semibold text-fg">{formatDate(p.date)}</p>
                <p className="text-fg tabular">
                  NDVI <span className="font-semibold">{formatDecimal(value, 3)}</span>
                </p>
                <p className="text-fg-muted">
                  {p.sensor}
                  {p.cloudy !== null && ` · ${t.cloudy.toLowerCase()}`}
                </p>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="clear"
          stroke="#1e842d"
          strokeWidth={2}
          connectNulls
          dot={{ r: 2.5, fill: "#1e842d", strokeWidth: 0 }}
          activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
        <Line
          dataKey="cloudy"
          stroke="none"
          dot={{ r: 3.5, fill: "var(--surface)", stroke: "var(--fg-subtle)", strokeWidth: 1.5 }}
          activeDot={{ r: 5, fill: "var(--surface)", stroke: "var(--fg-subtle)" }}
          isAnimationActive={false}
        />
      </LineChart>
    </figure>
  );
}
