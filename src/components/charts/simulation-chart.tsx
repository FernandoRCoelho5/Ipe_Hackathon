"use client";

import { CartesianGrid, Line, LineChart, ReferenceArea, Tooltip, XAxis, YAxis } from "recharts";
import { SOLAR_PEAK_WINDOW } from "@/domain/thermal/diurnal";
import { formatSignedTemperature, formatTemperature } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { AXIS_PROPS, ChartTooltipCard } from "./chart-tooltip";

export interface SimulationPoint {
  hour: number;
  current: number;
  simulated: number;
  delta: number;
}

const SERIES = [
  { key: "current", color: "var(--chart-current)", dashed: true },
  { key: "simulated", color: "var(--chart-simulated)", dashed: false },
] as const;

/**
 * UTCI atual × com intervenção, hora a hora. Duas séries: legenda sempre visível e
 * traço diferente (tracejado × contínuo), para não depender só da cor.
 */
export function SimulationChart({
  data,
  height = 260,
}: {
  data: SimulationPoint[];
  height?: number;
}) {
  const labels = messages.simulator.series;
  const values = data.flatMap((d) => [d.current, d.simulated]);
  const domain: [number, number] = [
    Math.floor(Math.min(...values) / 2) * 2 - 2,
    Math.ceil(Math.max(...values) / 2) * 2 + 2,
  ];

  return (
    <figure className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-fg-muted">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <svg aria-hidden width="20" height="4">
              <line
                x1="0"
                x2="20"
                y1="2"
                y2="2"
                stroke={s.color}
                strokeWidth="2"
                strokeDasharray={s.dashed ? "4 3" : undefined}
              />
            </svg>
            {labels[s.key]}
          </li>
        ))}
      </ul>
      <LineChart
        responsive
        data={data}
        style={{ width: "100%", height }}
        margin={{ top: 8, right: 12, bottom: 0, left: -18 }}
      >
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <ReferenceArea
          x1={SOLAR_PEAK_WINDOW[0]}
          x2={SOLAR_PEAK_WINDOW[1]}
          fill="var(--chart-current)"
          fillOpacity={0.05}
          label={{
            value: messages.map.peakWindow,
            position: "insideTop",
            fill: "var(--chart-axis)",
            fontSize: 10,
          }}
        />
        <XAxis
          dataKey="hour"
          type="number"
          domain={[8, 18]}
          ticks={[8, 10, 12, 14, 16, 18]}
          tickFormatter={(h: number) => `${h}h`}
          {...AXIS_PROPS}
        />
        <YAxis domain={domain} tickFormatter={(v: number) => `${v}°`} width={44} {...AXIS_PROPS} />
        <Tooltip
          cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as SimulationPoint | undefined;
            if (!active || !point) return null;
            return (
              <ChartTooltipCard
                hour={point.hour}
                rows={[
                  ...SERIES.map((s) => ({
                    key: s.key,
                    label: labels[s.key],
                    value: formatTemperature(point[s.key]),
                    color: s.color,
                    dashed: s.dashed,
                  })),
                  {
                    key: "delta",
                    label: messages.simulator.delta,
                    value: formatSignedTemperature(point.delta),
                    color: "transparent",
                  },
                ]}
              />
            );
          }}
        />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={labels[s.key]}
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "5 4" : undefined}
            dot={false}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </figure>
  );
}
