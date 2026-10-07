"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Save } from "lucide-react";
import { useState } from "react";
import { QueryError } from "@/components/data/query-error";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Meter } from "@/components/ui/meter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CHECKLIST_STATUSES,
  type ChecklistItemId,
  type ChecklistStatus,
} from "@/domain/prescription/checklist";
import { mutations, queries, queryKeys, type ChecklistResponse } from "@/lib/api/queries";
import { formatDateTime } from "@/lib/format";
import { messages } from "@/lib/i18n";

/** Checklist de validação em campo do quarteirão (GET/PUT /blocks/{id}/checklist). */
export function FieldChecklist({ blockId }: { blockId: string }) {
  const { data, error, isPending, refetch } = useQuery(queries.checklist(blockId));
  if (isPending) return <Skeleton className="h-64" />;
  if (error) return <QueryError error={error} onRetry={() => void refetch()} />;
  return <ChecklistForm key={blockId} blockId={blockId} data={data} />;
}

function ChecklistForm({ blockId, data }: { blockId: string; data: ChecklistResponse }) {
  const t = messages.prescription.detail;
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Partial<Record<ChecklistItemId, ChecklistStatus>>>(
    data.checklist.items,
  );
  const [notes, setNotes] = useState(data.checklist.notes ?? "");
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => mutations.updateChecklist(blockId, { items, notes }),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.checklist(blockId), response);
      setSaved(true);
    },
  });

  const done = data.applicable.filter((item) => {
    const status = items[item.id];
    return status !== undefined && status !== "pendente";
  }).length;
  const total = data.applicable.length;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(false);
        save.mutate();
      }}
    >
      <Meter
        value={total ? done / total : 1}
        label={t.checklistProgress(done, total)}
        valueText={`${Math.round((total ? done / total : 1) * 100)}%`}
      />
      <ul className="flex flex-col divide-y divide-line rounded-control border border-line">
        {data.applicable.map((item) => {
          const id = `checklist-${item.id}`;
          const status = items[item.id] ?? "pendente";
          return (
            <li
              key={item.id}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <label htmlFor={id} className="flex items-start gap-2 text-sm text-fg">
                <Check
                  aria-hidden
                  className={
                    status === "conforme"
                      ? "mt-0.5 size-4 shrink-0 text-accent"
                      : "mt-0.5 size-4 shrink-0 text-fg-subtle opacity-40"
                  }
                />
                {item.label}
              </label>
              <select
                id={id}
                value={status}
                onChange={(event) => {
                  setSaved(false);
                  setItems((current) => ({
                    ...current,
                    [item.id]: event.target.value as ChecklistStatus,
                  }));
                }}
                className="h-9 shrink-0 cursor-pointer rounded-control border border-line bg-surface px-2 text-sm text-fg hover:border-line-strong sm:w-40"
              >
                {CHECKLIST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t.statuses[s]}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`notes-${blockId}`} className="text-xs font-medium text-fg-muted">
          {t.checklistNotes}
        </label>
        <textarea
          id={`notes-${blockId}`}
          value={notes}
          maxLength={2000}
          rows={3}
          onChange={(event) => {
            setSaved(false);
            setNotes(event.target.value);
          }}
          className="rounded-control border border-line bg-surface p-3 text-sm text-fg hover:border-line-strong"
        />
      </div>
      {save.error && <QueryError error={save.error} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={save.isPending}>
          <Save aria-hidden />
          {save.isPending ? t.checklistSaving : t.checklistSave}
        </Button>
        <p role="status" className="text-xs text-fg-muted">
          {saved
            ? t.checklistSaved
            : data.checklist.updatedAt
              ? t.checklistUpdated(formatDateTime(data.checklist.updatedAt))
              : null}
        </p>
      </div>
      <Callout tone="info">{messages.legal.potentialSites}</Callout>
    </form>
  );
}
