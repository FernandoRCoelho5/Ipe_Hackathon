"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SOLAR_PEAK_WINDOW } from "@/domain/thermal/diurnal";
import { classifyThermalStress } from "@/domain/thermal/stress";
import { formatTemperature } from "@/lib/format";
import { AXIS_PROPS, ChartTooltipCard } from "./chart-tooltip";

interface HourlyUtciChartProps {
  data: readonly { hour: number; utci: number }[];
  /** Hora destacada (a do slider do mapa). */
  activeHour?: number;
  height?: number;
}

/** Limiares oficiais de estresse ao calor desenhados como referência. */
const STRESS_LINES = [
  { value: 32, label: "forte" },
  { value: 38, label: "muito forte" },
  { value: 46, label: "extremo" },
];

/** UTCI de hora em hora de um quarteirão (série única: o título nomeia a série). */
export function HourlyUtciChart({ data, activeHour, height = 200 }: HourlyUtciChartProps) {
  const values = data.map((d) => d.utci);
  const domain: [number, number] = [
    Math.floor(Math.min(24, ...values) / 2) * 2,
    Math.ceil(Math.max(40, ...values) / 2) * 2 + 2,
  ];

  return (
    <LineChart
      responsive
      data={[...data]}
      style={{ width: "100%", height }}
      margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
    >
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
      <ReferenceArea
        x1={SOLAR_PEAK_WINDOW[0]}
        x2={SOLAR_PEAK_WINDOW[1]}
        fill="var(--chart-current)"
        fillOpacity={0.06}
        ifOverflow="hidden"
      />
      {STRESS_LINES.filter((l) => l.value > domain[0] && l.value < domain[1]).map((line) => (
        <ReferenceLine
          key={line.value}
          y={line.value}
          stroke="var(--chart-axis)"
          strokeDasharray="2 4"
          strokeOpacity={0.6}
          label={{
            value: line.label,
            position: "insideTopRight",
            fill: "var(--chart-axis)",
            fontSize: 10,
          }}
        />
      ))}
      <XAxis
        dataKey="hour"
        type="number"
        domain={[8, 18]}
        ticks={[8, 10, 12, 14, 16, 18]}
        tickFormatter={(h: number) => `${h}h`}
        {...AXIS_PROPS}
      />
      <YAxis domain={domain} tickFormatter={(v: number) => `${v}°`} width={44} {...AXIS_PROPS} />
      {activeHour !== undefined && (
        <ReferenceLine x={activeHour} stroke="var(--fg)" strokeOpacity={0.5} strokeWidth={1} />
      )}
      <Tooltip
        cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
        content={({ active, payload }) => {
          const point = payload?.[0]?.payload as { hour: number; utci: number } | undefined;
          if (!active || !point) return null;
          return (
            <ChartTooltipCard
              hour={point.hour}
              rows={[
                {
                  key: "utci",
                  label: classifyThermalStress(point.utci).label,
                  value: formatTemperature(point.utci),
                  color: "var(--chart-current)",
                },
              ]}
            />
          );
        }}
      />
      <Line
        type="monotone"
        dataKey="utci"
        name="UTCI"
        stroke="var(--chart-current)"
        strokeWidth={2}
        dot={{ r: 2.5, fill: "var(--chart-current)", strokeWidth: 0 }}
        activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
