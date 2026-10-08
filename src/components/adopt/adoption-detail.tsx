import { CalendarClock, Leaf, Map as MapIcon, Sparkles } from "lucide-react";
import { NdviChart } from "@/components/charts/ndvi-chart";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { MAINTENANCE_TYPES, PARTNER_TYPES, type MaintenanceTask } from "@/domain/adoption/schema";
import { SPECIES } from "@/domain/prescription/species";
import type { AdoptionSummary } from "@/lib/api/contracts";
import { formatDate, formatDecimal, formatInteger } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { NdviTrendBadge } from "./ndvi-trend";

const TASK_TONES: Record<MaintenanceTask["status"], BadgeTone> = {
  concluida: "accent",
  pendente: "neutral",
  atrasada: "danger",
};

/** Painel de uma parceria: NDVI por satélite, zeladoria preditiva, compromissos e selo ESG. */
/** Mesmo critério do serviço: pendente com prazo vencido conta como atrasada. */
export function effectiveTaskStatus(
  task: MaintenanceTask,
  today: string,
): MaintenanceTask["status"] {
  return task.status === "pendente" && task.dueDate < today ? "atrasada" : task.status;
}

export function AdoptionDetail({ summary, today }: { summary: AdoptionSummary; today: string }) {
  const t = messages.adopt;
  const d = t.detail;
  const { adoption, esg } = summary;
  const trees = adoption.commitments.trees.reduce((sum, tr) => sum + tr.count, 0);
  const tasks = [...adoption.maintenance].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <article aria-labelledby="adoption-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-[0.14em] text-fg-muted uppercase">
          {PARTNER_TYPES[adoption.partnerType]} · {t.since(formatDate(adoption.adoptedAt))}
        </p>
        <h2 id="adoption-title" className="text-xl font-bold tracking-tight text-fg">
          {adoption.partnerName}
        </h2>
        <p className="text-sm text-fg-muted">{adoption.areaName}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={adoption.status === "ativa" ? "accent" : "warning"}>
            {t.status[adoption.status]}
          </Badge>
          <NdviTrendBadge trend={summary.ndviTrend30d} />
          <ButtonLink href={`/mapa?bloco=${adoption.blockId}`} size="sm" variant="ghost">
            <MapIcon aria-hidden />
            {d.openMap}
          </ButtonLink>
        </div>
      </header>

      <section
        aria-labelledby="seal-title"
        className="relative overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card"
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 brand-gradient" />
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Leaf aria-hidden className="size-6" />
          </span>
          <div className="flex flex-col">
            <h3 id="seal-title" className="text-base font-semibold text-fg">
              {d.sealTitle}
            </h3>
            <p className="text-xs text-fg-muted">{d.sealDescription}</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label={t.kpis.co2} value={`${formatDecimal(esg.co2SequesteredKg / 1000)} t`} />
          <Stat label={t.kpis.greenArea} value={`${formatInteger(esg.greenAreaM2)} m²`} />
          <Stat
            label={messages.simulator.esg.runoff}
            value={`${formatInteger(esg.runoffAvoidedM3PerYear)} m³`}
          />
          <Stat
            label={messages.simulator.metrics.trees}
            value={formatInteger(esg.survivingTrees)}
            hint={d.survivingOf(formatInteger(esg.treesPlanted))}
          />
        </dl>
        <details className="mt-4 text-xs text-fg-muted">
          <summary className="cursor-pointer font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent">
            {messages.simulator.esg.premises}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {esg.premises.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </details>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{d.ndviTitle}</CardTitle>
          <CardDescription>{d.ndviDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <NdviChart series={adoption.ndviSeries} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{d.maintenanceTitle}</CardTitle>
            <CardDescription>{d.maintenanceDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3 border-l-2 border-line pl-4">
              {tasks.map((task) => (
                <li key={task.id} className="relative flex flex-col gap-1">
                  <span
                    aria-hidden
                    className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full border-2 border-surface bg-line-strong"
                  />
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-fg">
                    {MAINTENANCE_TYPES[task.type]}
                    <Badge tone={TASK_TONES[effectiveTaskStatus(task, today)]}>
                      {d.taskStatus[effectiveTaskStatus(task, today)]}
                    </Badge>
                    {task.predicted ? (
                      <Badge tone="info">
                        <Sparkles aria-hidden />
                        {d.predicted}
                      </Badge>
                    ) : (
                      <Badge>
                        <CalendarClock aria-hidden />
                        {d.scheduled}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-fg-muted">
                    <time dateTime={task.dueDate}>{formatDate(task.dueDate)}</time> · {task.reason}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{d.commitmentsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm text-fg">
              <li className="font-medium">{d.trees(formatInteger(trees))}</li>
              {adoption.commitments.trees.map((tr) => (
                <li key={tr.speciesId} className="ml-4 text-fg-muted">
                  {formatInteger(tr.count)} × {SPECIES[tr.speciesId].commonName}
                </li>
              ))}
              {adoption.commitments.permeableAreaM2 > 0 && (
                <li>{d.permeable(formatInteger(adoption.commitments.permeableAreaM2))}</li>
              )}
              {adoption.commitments.coolRoofAreaM2 > 0 && (
                <li>{d.coolRoof(formatInteger(adoption.commitments.coolRoofAreaM2))}</li>
              )}
              <li>{d.months(adoption.commitments.maintenanceMonths)}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </article>
  );
}
