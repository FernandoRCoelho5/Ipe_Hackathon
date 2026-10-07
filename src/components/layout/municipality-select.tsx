"use client";

import { ChevronDown, MapPin } from "lucide-react";
import type { Municipality } from "@/domain/municipality/types";
import { formatInteger } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";

interface MunicipalitySelectProps {
  municipalities: Municipality[];
}

export function MunicipalitySelect({ municipalities }: MunicipalitySelectProps) {
  const selectedId = useAppStore((state) => state.municipalityId) ?? municipalities[0]?.id;
  const setMunicipalityId = useAppStore((state) => state.setMunicipalityId);
  const selected = municipalities.find((m) => m.id === selectedId);

  return (
    <div className="relative flex min-w-0 flex-1 items-center sm:max-w-64 sm:flex-none">
      <MapPin aria-hidden className="pointer-events-none absolute left-3 size-4 text-accent" />
      <select
        aria-label={messages.municipality.selectLabel}
        title={
          selected
            ? messages.municipality.population(formatInteger(selected.population))
            : undefined
        }
        value={selectedId}
        onChange={(event) => setMunicipalityId(event.target.value)}
        className="h-10 w-full min-w-0 cursor-pointer appearance-none truncate rounded-control border border-line bg-surface py-0 pr-9 pl-9 text-sm font-medium text-fg transition-colors hover:border-line-strong"
      >
        {municipalities.map((municipality) => (
          <option key={municipality.id} value={municipality.id}>
            {municipality.name} · {municipality.state}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 size-4 text-fg-muted"
      />
    </div>
  );
}
