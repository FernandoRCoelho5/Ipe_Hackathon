"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RangeField } from "@/components/ui/field";
import { DAY_HOURS, SOLAR_PEAK_WINDOW } from "@/domain/thermal/diurnal";
import { cn } from "@/lib/cn";
import { formatHour } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { MAP_LAYER_IDS, MAP_LAYERS, type MapLayerId } from "./scales";

const FIRST_HOUR = DAY_HOURS[0];
const LAST_HOUR = DAY_HOURS[DAY_HOURS.length - 1];

export function LayerSwitcher({
  value,
  onChange,
  className,
}: {
  value: MapLayerId;
  onChange: (layer: MapLayerId) => void;
  className?: string;
}) {
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className="mb-2 text-xs font-medium text-fg-muted">{messages.map.layersLabel}</legend>
      <div className="flex flex-wrap gap-1.5">
        {MAP_LAYER_IDS.map((id) => {
          const layer = MAP_LAYERS[id];
          return (
            <label
              key={id}
              title={layer.description}
              className="cursor-pointer rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-line-strong has-checked:border-primary has-checked:bg-primary has-checked:text-primary-fg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
            >
              <input
                type="radio"
                name="map-layer"
                value={id}
                checked={value === id}
                onChange={() => onChange(id)}
                className="sr-only"
              />
              {layer.shortLabel}
            </label>
          );
        })}
      </div>
      <p className="text-xs leading-snug text-fg-muted">{MAP_LAYERS[value].description}</p>
    </fieldset>
  );
}

/** Slider 08h–18h com animação opcional do dia (avança uma hora por vez). */
export function HourControl({ hour, onChange }: { hour: number; onChange: (h: number) => void }) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      onChange(hour >= LAST_HOUR ? FIRST_HOUR : hour + 1);
    }, 900);
    return () => window.clearInterval(timer);
  }, [playing, hour, onChange]);

  const inPeak = hour >= SOLAR_PEAK_WINDOW[0] && hour <= SOLAR_PEAK_WINDOW[1];

  return (
    <div className="flex items-end gap-3">
      <RangeField
        className="flex-1"
        label={messages.map.hourLabel}
        min={FIRST_HOUR}
        max={LAST_HOUR}
        value={hour}
        onValueChange={(h) => {
          setPlaying(false);
          onChange(h);
        }}
        valueText={formatHour(hour)}
        hint={
          <span className={inPeak ? "font-medium text-highlight-ink" : undefined}>
            {messages.map.peakWindow}
          </span>
        }
      />
      <Button
        variant="outline"
        size="icon"
        onClick={() => setPlaying((p) => !p)}
        aria-pressed={playing}
        aria-label={playing ? messages.map.pause : messages.map.play}
        title={playing ? messages.map.pause : messages.map.play}
        className="mb-6"
      >
        {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
      </Button>
    </div>
  );
}
