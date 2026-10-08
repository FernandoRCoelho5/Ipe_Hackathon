"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Plus, Trees } from "lucide-react";
import { useState } from "react";
import { PermissionNote } from "@/components/auth/permission-note";
import { usePermission } from "@/components/auth/use-session";
import { QueryError } from "@/components/data/query-error";
import { useActiveMunicipality } from "@/components/layout/municipality-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { MAINTENANCE_TYPES, PARTNER_TYPES } from "@/domain/adoption/schema";
import { engagementQueries } from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import { formatDate, formatDecimal, formatInteger, formatIsoDate } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { useUrlState } from "@/lib/use-url-state";
import { AdoptionDetail } from "./adoption-detail";
import { NdviTrendBadge } from "./ndvi-trend";
import { NewAdoptionForm } from "./new-adoption-form";

/**
 * Tela 06 · Adote uma Ilha Verde. Parcerias com NDVI por satélite, zeladoria preditiva
 * e selo ESG; `?parceria=` abre uma parceria específica e `?nova=1` o cadastro.
 */
export function AdoptScreen() {
  const municipality = useActiveMunicipality();
  const [params, setParams] = useUrlState();
  const [announcement, setAnnouncement] = useState("");
  // Data local de hoje, fixada na montagem (tarefas vencidas = atrasadas).
  const [today] = useState(() => formatIsoDate(Date.now()));
  const t = messages.adopt;
  const canCreate = usePermission("adoption:create").allowed;

  const list = useQuery({
    ...engagementQueries.adoptions(municipality?.id ?? ""),
    enabled: !!municipality,
  });

  if (!municipality || list.isPending) return <AdoptSkeleton />;
  if (list.error) return <QueryError error={list.error} onRetry={() => void list.refetch()} />;

  const items = list.data.data;
  const selected = items.find((s) => s.adoption.id === params.get("parceria")) ?? items[0] ?? null;
  const formOpen = params.get("nova") === "1" && canCreate;

  const totals = items.reduce(
    (acc, s) => ({
      trees: acc.trees + s.esg.treesPlanted,
      co2: acc.co2 + s.esg.co2SequesteredKg,
      green: acc.green + s.esg.greenAreaM2,
    }),
    { trees: 0, co2: 0, green: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <dl className="grid flex-1 grid-cols-2 gap-4 rounded-card border border-line bg-surface p-5 shadow-card sm:grid-cols-4">
          <Stat label={t.kpis.partnerships} value={formatInteger(items.length)} />
          <Stat label={t.kpis.trees} value={formatInteger(totals.trees)} />
          <Stat label={t.kpis.co2} value={`${formatDecimal(totals.co2 / 1000)} t`} />
          <Stat label={t.kpis.greenArea} value={`${formatInteger(totals.green)} m²`} />
        </dl>
        <div className="flex flex-col items-end gap-2">
          <Button
            size="lg"
            disabled={!canCreate}
            onClick={() => setParams({ nova: "1" }, { push: true })}
          >
            <Plus aria-hidden />
            {t.form.open}
          </Button>
          <PermissionNote permission="adoption:create" className="max-w-xs text-right" />
        </div>
      </div>

      <p role="status" className="text-sm font-medium text-accent empty:hidden">
        {announcement}
      </p>

      {items.length === 0 ? (
        <EmptyState icon={Trees} title={t.empty} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <section aria-labelledby="adoptions-title" className="flex flex-col gap-3">
            <h2 id="adoptions-title" className="text-sm font-semibold text-fg">
              {t.listTitle}
            </h2>
            <ul className="flex flex-col gap-2">
              {items.map((s) => {
                const active = s.adoption.id === selected?.adoption.id;
                return (
                  <li key={s.adoption.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setParams({ parceria: s.adoption.id })}
                      className={cn(
                        "flex w-full flex-col gap-2 rounded-control border bg-surface p-4 text-left transition-colors hover:border-line-strong",
                        active ? "border-primary ring-2 ring-primary/25" : "border-line",
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="flex min-w-0 flex-col">
                          <span className="text-sm font-semibold text-fg">
                            {s.adoption.partnerName}
                          </span>
                          <span className="text-xs text-fg-muted">
                            {PARTNER_TYPES[s.adoption.partnerType]} · {s.adoption.areaName}
                          </span>
                        </span>
                        <Badge tone={s.adoption.status === "ativa" ? "accent" : "warning"}>
                          {t.status[s.adoption.status]}
                        </Badge>
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        <NdviTrendBadge trend={s.ndviTrend30d} />
                        {s.overdueTasks > 0 && (
                          <Badge tone="danger">
                            <AlertTriangle aria-hidden />
                            {t.overdue(s.overdueTasks)}
                          </Badge>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                        <CalendarClock aria-hidden className="size-3.5" />
                        {s.nextTask
                          ? t.nextTask(
                              MAINTENANCE_TYPES[s.nextTask.type].toLowerCase(),
                              formatDate(s.nextTask.dueDate),
                            )
                          : t.noTask}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          {selected && (
            <div data-tour="adoption-detail">
              <AdoptionDetail key={selected.adoption.id} summary={selected} today={today} />
            </div>
          )}
        </div>
      )}

      <Drawer
        open={formOpen}
        onClose={() => setParams({ nova: null })}
        title={t.form.title}
        eyebrow={`${municipality.name} · ${municipality.state}`}
      >
        {formOpen && (
          <NewAdoptionForm
            municipalityId={municipality.id}
            onCancel={() => setParams({ nova: null })}
            onCreated={(summary) => {
              setAnnouncement(t.form.created(summary.adoption.partnerName));
              setParams({ nova: null, parceria: summary.adoption.id });
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

export function AdoptSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        {messages.common.loading}
      </span>
      <Skeleton className="h-24 rounded-card" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Skeleton className="h-[30rem] rounded-card" />
        <Skeleton className="h-[30rem] rounded-card" />
      </div>
    </div>
  );
}
