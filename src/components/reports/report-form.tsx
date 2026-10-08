"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText } from "lucide-react";
import { Lock } from "lucide-react";
import { useEffect, useEffectEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SavedScenario } from "@/domain/simulation/saved-scenario";
import { reportRequestSchema, type FundingProgramId } from "@/lib/api/contracts";
import type { FundingProgramListResponse } from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import { formatSignedTemperature } from "@/lib/format";
import { messages } from "@/lib/i18n";

export type ReportFormValues = z.input<typeof reportRequestSchema>;
export type ReportFormOutput = z.output<typeof reportRequestSchema>;

interface ReportFormProps {
  municipalityId: string;
  programs: FundingProgramListResponse["data"] | undefined;
  neighborhoods: string[] | undefined;
  scenarios: SavedScenario[] | undefined;
  submitting: boolean;
  /** `snapshot` serializa o formulário enviado (para detectar pré-visualização defasada). */
  onSubmit: (values: ReportFormOutput, snapshot: string) => void;
  /** Snapshot atual a cada mudança do formulário. */
  onSnapshotChange?: (snapshot: string) => void;
  /** Perfil pode usar editais de recurso público (senão, só o relatório ESG). */
  canUsePublicFunding: boolean;
  /** Exemplo a aplicar e enviar (cada novo objeto preenche e gera o relatório). */
  example?: ReportFormValues | null;
  onExampleApplied?: () => void;
}

const input =
  "h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle hover:border-line-strong aria-invalid:border-danger";

/** Formulário do relatório validado pelo MESMO schema Zod da API (`reportRequestSchema`). */
export function ReportForm({
  municipalityId,
  programs,
  neighborhoods,
  scenarios,
  submitting,
  onSubmit,
  onSnapshotChange,
  canUsePublicFunding,
  example,
  onExampleApplied,
}: ReportFormProps) {
  const t = messages.reports;
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors },
  } = useForm<ReportFormValues, unknown, ReportFormOutput>({
    resolver: zodResolver(reportRequestSchema),
    defaultValues: {
      programId: "fundo-clima" satisfies FundingProgramId,
      municipalityId,
      projectName: "",
      department: "",
      neighborhoods: [],
      scenarioIds: [],
    },
  });
  const snapshot = JSON.stringify(useWatch({ control }));
  useEffect(() => onSnapshotChange?.(snapshot), [snapshot, onSnapshotChange]);

  // Perfil sem editais públicos (B2B): o formulário parte do relatório ESG.
  const programId = useWatch({ control, name: "programId" });
  const isPublic = (id: string | undefined) =>
    programs?.find((p) => p.id === id)?.audience === "publico";
  const lockedProgram = !canUsePublicFunding && isPublic(programId);
  useEffect(() => {
    if (lockedProgram) setValue("programId", "esg-corporativo");
  }, [lockedProgram, setValue]);

  const submit = handleSubmit((values) => onSubmit(values, JSON.stringify(getValues())));
  const applyExample = useEffectEvent((values: ReportFormValues) => {
    reset(values);
    void submit();
    onExampleApplied?.();
  });
  useEffect(() => {
    if (example) applyExample(example);
  }, [example]);

  const error = (name: keyof ReportFormValues) => {
    const message = errors[name]?.message;
    return message ? (
      <p id={`${name}-error`} className="text-xs text-danger">
        {message}
      </p>
    ) : null;
  };
  const describedBy = (name: keyof ReportFormValues) =>
    errors[name] ? `${name}-error` : undefined;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6" data-tour="report-form">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-fg">{t.program}</legend>
        {programs ? (
          <div className="grid gap-2">
            {programs.map((program) => (
              <label
                key={program.id}
                className="flex cursor-pointer gap-3 rounded-control border border-line bg-surface p-3 transition-colors hover:border-line-strong has-checked:border-primary has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-focus has-disabled:cursor-not-allowed has-disabled:opacity-60"
              >
                <input
                  type="radio"
                  value={program.id}
                  disabled={!canUsePublicFunding && program.audience === "publico"}
                  {...register("programId")}
                  className="mt-1 accent-accent"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-fg">{program.name}</span>
                  <span className="text-xs text-fg-muted">
                    {t.audience[program.audience]} · {program.sponsor}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <Skeleton className="h-48" />
        )}
        {!canUsePublicFunding && (
          <p className="flex items-start gap-2 text-xs text-fg-muted">
            <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {t.publicFundingLocked}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="projectName" className="text-sm font-semibold text-fg">
          {t.projectName}
        </label>
        <input
          id="projectName"
          {...register("projectName")}
          placeholder={t.projectNamePlaceholder}
          aria-invalid={errors.projectName ? true : undefined}
          aria-describedby={describedBy("projectName")}
          className={input}
        />
        {error("projectName")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="department" className="text-sm font-semibold text-fg">
            {t.department}
          </label>
          <input
            id="department"
            {...register("department")}
            placeholder={t.departmentPlaceholder}
            aria-invalid={errors.department ? true : undefined}
            aria-describedby={describedBy("department")}
            className={input}
          />
          {error("department")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="estimatedBudget" className="text-sm font-semibold text-fg">
            {t.budget}
          </label>
          <input
            id="estimatedBudget"
            type="number"
            inputMode="decimal"
            min={0}
            step={1000}
            {...register("estimatedBudget", {
              setValueAs: (v: string) => (v === "" ? 0 : Number(v)),
            })}
            placeholder={t.budgetPlaceholder}
            aria-invalid={errors.estimatedBudget ? true : undefined}
            aria-describedby={describedBy("estimatedBudget")}
            className={cn(input, "tabular")}
          />
          {error("estimatedBudget")}
        </div>
      </div>

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errors.neighborhoods ? "neighborhoods-error" : "neighborhoods-hint"}
      >
        <legend className="text-sm font-semibold text-fg">{t.neighborhoods}</legend>
        <div className="flex items-center justify-between gap-2">
          <p id="neighborhoods-hint" className="text-xs text-fg-muted">
            {t.neighborhoodsHint}
          </p>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={!neighborhoods}
              onClick={() =>
                setValue("neighborhoods", neighborhoods ?? [], { shouldValidate: true })
              }
            >
              {t.selectAll}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setValue("neighborhoods", [], { shouldValidate: true })}
            >
              {t.clearAll}
            </Button>
          </div>
        </div>
        {neighborhoods ? (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {neighborhoods.map((name) => (
              <label
                key={name}
                className="flex cursor-pointer items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-fg hover:border-line-strong has-checked:border-primary has-checked:bg-accent-soft"
              >
                <input
                  type="checkbox"
                  value={name}
                  {...register("neighborhoods")}
                  className="accent-accent"
                />
                {name}
              </label>
            ))}
          </div>
        ) : (
          <Skeleton className="h-32" />
        )}
        {error("neighborhoods")}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-fg">{t.scenarios}</legend>
        {!scenarios ? (
          <Skeleton className="h-16" />
        ) : scenarios.length === 0 ? (
          <p className="text-xs text-fg-muted">{t.scenariosEmpty}</p>
        ) : (
          scenarios.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-fg hover:border-line-strong has-checked:border-primary has-checked:bg-accent-soft"
            >
              <input
                type="checkbox"
                value={s.id}
                {...register("scenarioIds")}
                className="accent-accent"
              />
              {t.scenarioLabel(s.name, formatSignedTemperature(s.summary.peakUtciDelta))}
            </label>
          ))
        )}
      </fieldset>

      <Button type="submit" size="lg" disabled={submitting}>
        <FileText aria-hidden />
        {submitting ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
