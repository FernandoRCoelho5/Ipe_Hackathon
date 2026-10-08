"use client";

import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDateTime, formatSignedTemperature, formatTemperature } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { AXIS_PROPS } from "./chart-tooltip";

interface CalibrationPoint {
  nodeCode: string;
  timestamp: string;
  sensorTempC: number;
  modelAirTempC: number;
}

/**
 * Dispersão sensor × modelo. Pontos sobre a diagonal = concordância perfeita;
 * acima dela, o sensor mediu mais calor que o modelo previu.
 */
export function CalibrationChart({
  points,
  height = 280,
}: {
  points: readonly CalibrationPoint[];
  height?: number;
}) {
  const t = messages.citizen.sensors;
  const values = points.flatMap((p) => [p.sensorTempC, p.modelAirTempC]);
  const min = Math.floor(Math.min(...values)) - 1;
  const max = Math.ceil(Math.max(...values)) + 1;
  return (
    <ScatterChart
      responsive
      style={{ width: "100%", height }}
      margin={{ top: 8, right: 16, bottom: 16, left: -8 }}
    >
      <CartesianGrid stroke="var(--chart-grid)" />
      <XAxis
        type="number"
        dataKey="modelAirTempC"
        name={t.modelAxis}
        domain={[min, max]}
        tickFormatter={(v: number) => `${v}°`}
        label={{
          value: t.modelAxis,
          position: "insideBottom",
          offset: -8,
          fill: "var(--chart-axis)",
          fontSize: 11,
        }}
        {...AXIS_PROPS}
      />
      <YAxis
        type="number"
        dataKey="sensorTempC"
        name={t.sensorAxis}
        domain={[min, max]}
        tickFormatter={(v: number) => `${v}°`}
        width={52}
        label={{
          value: t.sensorAxis,
          angle: -90,
          position: "insideLeft",
          offset: 16,
          fill: "var(--chart-axis)",
          fontSize: 11,
        }}
        {...AXIS_PROPS}
      />
      <ReferenceLine
        segment={[
          { x: min, y: min },
          { x: max, y: max },
        ]}
        stroke="var(--chart-axis)"
        strokeDasharray="4 4"
        ifOverflow="hidden"
        label={{
          value: t.identity,
          position: "insideTopLeft",
          fill: "var(--chart-axis)",
          fontSize: 10,
        }}
      />
      <Tooltip
        cursor={false}
        content={({ active, payload }) => {
          const p = payload?.[0]?.payload as CalibrationPoint | undefined;
          if (!active || !p) return null;
          return (
            <div className="rounded-control border border-line bg-surface p-3 text-xs shadow-pop">
              <p className="mb-1 font-semibold text-fg">
                {p.nodeCode} · {formatDateTime(p.timestamp)}
              </p>
              <p className="text-fg tabular">
                {formatTemperature(p.sensorTempC)} <span className="text-fg-muted">sensor</span>
              </p>
              <p className="text-fg tabular">
                {formatTemperature(p.modelAirTempC)} <span className="text-fg-muted">modelo</span>
              </p>
              <p className="text-fg-muted tabular">
                {formatSignedTemperature(p.sensorTempC - p.modelAirTempC)} de diferença
              </p>
            </div>
          );
        }}
      />
      <Scatter
        data={[...points]}
        fill="var(--chart-simulated)"
        fillOpacity={0.55}
        shape="circle"
        isAnimationActive={false}
      />
    </ScatterChart>
  );
}
