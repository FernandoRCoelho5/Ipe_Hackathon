"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { IvtuBadge } from "@/components/data/badges";
import { SearchField } from "@/components/ui/field";
import { queries } from "@/lib/api/queries";
import { useDebouncedValue } from "@/lib/hooks";
import { messages } from "@/lib/i18n";

interface BlockPickerProps {
  municipalityId: string;
  onPick: (blockId: string) => void;
}

/** Busca de quarteirão por código, rua ou bairro (usa o ranking da API). */
export function BlockPicker({ municipalityId, onPick }: BlockPickerProps) {
  const t = messages.simulator;
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 250);
  const listId = useId();
  const { data, isFetching } = useQuery({
    ...queries.ranking({ municipality: municipalityId, search: debounced, pageSize: 8 }),
    enabled: debounced.length >= 2,
  });
  const rows = debounced.length >= 2 ? (data?.data ?? []) : [];

  return (
    <div className="flex flex-col gap-2">
      <SearchField
        label={t.blockSearch}
        placeholder={t.blockSearchPlaceholder}
        value={search}
        onValueChange={setSearch}
        aria-controls={listId}
        autoComplete="off"
      />
      <div id={listId} aria-live="polite">
        {debounced.length >= 2 && !isFetching && rows.length === 0 && (
          <p className="px-1 text-sm text-fg-muted">{t.blockSearchEmpty}</p>
        )}
        {rows.length > 0 && (
          <ul className="flex max-h-72 flex-col divide-y divide-line overflow-y-auto rounded-control border border-line">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    onPick(row.id);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-muted"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-fg">{row.street}</span>
                    <span className="truncate text-xs text-fg-muted">
                      {row.code} · {row.neighborhood}
                    </span>
                  </span>
                  <IvtuBadge score={row.ivtu} level={row.ivtuLevel} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
