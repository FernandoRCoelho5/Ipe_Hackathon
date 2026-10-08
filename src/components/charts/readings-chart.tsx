"use client";

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { formatClock, formatDateTime, formatPercent, formatTemperature } from "@/lib/format";
import { AXIS_PROPS } from "./chart-tooltip";

interface Reading {
  timestamp: string;
  temperatureC: number;
  humidity: number;
}

/** Temperatura medida por um nó IoT ao longo do tempo (série única; umidade no tooltip). */
export function ReadingsChart({
  readings,
  height = 220,
}: {
  readings: readonly Reading[];
  height?: number;
}) {
  const data = readings.map((r) => ({ ...r, t: new Date(r.timestamp).getTime() }));
  const temps = data.map((d) => d.temperatureC);
  const domain: [number, number] = [
    Math.floor(Math.min(...temps)) - 1,
    Math.ceil(Math.max(...temps)) + 1,
  ];
  return (
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
        tickFormatter={(t: number) => formatClock(t)}
        minTickGap={32}
        {...AXIS_PROPS}
      />
      <YAxis domain={domain} tickFormatter={(v: number) => `${v}°`} width={44} {...AXIS_PROPS} />
      <Tooltip
        cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
        content={({ active, payload }) => {
          const point = payload?.[0]?.payload as (Reading & { t: number }) | undefined;
          if (!active || !point) return null;
          return (
            <div className="rounded-control border border-line bg-surface p-3 text-xs shadow-pop">
              <p className="mb-1 font-semibold text-fg tabular">{formatDateTime(point.t)}</p>
              <p className="text-fg tabular">
                <span className="font-semibold">{formatTemperature(point.temperatureC)}</span>{" "}
                <span className="text-fg-muted">temperatura</span>
              </p>
              <p className="text-fg tabular">
                <span className="font-semibold">{formatPercent(point.humidity)}</span>{" "}
                <span className="text-fg-muted">umidade</span>
              </p>
            </div>
          );
        }}
      />
      <Line
        type="monotone"
        dataKey="temperatureC"
        stroke="var(--chart-current)"
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
