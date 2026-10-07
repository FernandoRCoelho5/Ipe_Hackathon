"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Save } from "lucide-react";
import { useState } from "react";
import { QueryError } from "@/components/data/query-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SavedScenario } from "@/domain/simulation/saved-scenario";
import type { SimulationScenarioInput } from "@/domain/simulation/simulate";
import { ApiClientError } from "@/lib/api/client";
import { mutations, queries, queryKeys } from "@/lib/api/queries";
import { formatDate, formatSignedTemperature } from "@/lib/format";
import { messages } from "@/lib/i18n";

interface SavedScenariosProps {
  municipalityId: string;
  scenario: SimulationScenarioInput;
  canSave: boolean;
  onLoad: (scenario: SavedScenario) => void;
}

/** Salvar o cenário atual (vai para os relatórios de editais) e reabrir os salvos. */
export function SavedScenarios({ municipalityId, scenario, canSave, onLoad }: SavedScenariosProps) {
  const t = messages.simulator.save;
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);
  const list = useQuery(queries.scenarios(municipalityId));

  const save = useMutation({
    mutationFn: () => mutations.saveScenario({ name, municipalityId, scenario }),
    onSuccess: (saved) => {
      setSavedName(saved.name);
      setName("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.scenarios(municipalityId) });
    },
  });

  const fieldError =
    save.error instanceof ApiClientError
      ? save.error.details?.find((d) => d.path === "name")?.message
      : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setSavedName(null);
            save.mutate();
          }}
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="scenario-name" className="text-xs font-medium text-fg-muted">
              {t.name}
            </label>
            <input
              id="scenario-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.namePlaceholder}
              minLength={3}
              maxLength={80}
              required
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? "scenario-name-error" : undefined}
              className="h-10 rounded-control border border-line bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle hover:border-line-strong"
            />
          </div>
          <Button type="submit" disabled={!canSave || save.isPending}>
            <Save aria-hidden />
            {save.isPending ? t.saving : t.submit}
          </Button>
        </form>
        {fieldError && (
          <p id="scenario-name-error" className="-mt-3 text-xs text-danger">
            {fieldError}
          </p>
        )}
        {save.error && !fieldError && <QueryError error={save.error} />}
        <p role="status" className="-mt-2 text-xs text-accent empty:hidden">
          {savedName ? t.saved(savedName) : ""}
        </p>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-fg">{t.listTitle}</h3>
          {list.isPending ? (
            <Skeleton className="h-16" />
          ) : list.error ? (
            <QueryError error={list.error} onRetry={() => void list.refetch()} />
          ) : list.data.data.length === 0 ? (
            <p className="text-sm text-fg-muted">{t.empty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-control border border-line">
              {[...list.data.data].reverse().map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-fg">{s.name}</span>
                    <span className="truncate text-xs text-fg-muted">
                      {s.summary.blockCode} · {s.summary.blockLabel} · {formatDate(s.createdAt)}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-azul-rio tabular dark:text-azul-cidade">
                    {formatSignedTemperature(s.summary.peakUtciDelta)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onLoad(s)}
                    aria-label={t.loadAria(s.name)}
                  >
                    <FolderOpen aria-hidden />
                    {t.load}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
