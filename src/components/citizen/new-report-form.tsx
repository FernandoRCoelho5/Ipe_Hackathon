"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPinned, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { QueryError } from "@/components/data/query-error";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import {
  REPORT_CATEGORIES,
  reportCategorySchema,
  type ReportCategory,
} from "@/domain/citizen/schema";
import type { LngLat } from "@/domain/municipality/types";
import { mutations, queryKeys } from "@/lib/api/queries";
import { formatDecimal } from "@/lib/format";
import { messages } from "@/lib/i18n";

/** Campos digitados; o local vem do clique no mapa e o município do cabeçalho. */
const formSchema = z.object({
  category: reportCategorySchema,
  text: z.string().trim().min(5, "Descreva o problema em ao menos 5 caracteres").max(500),
});
type FormValues = z.infer<typeof formSchema>;

interface NewReportFormProps {
  municipalityId: string;
  picked: LngLat | null;
  onSent: () => void;
}

export function NewReportForm({ municipalityId, picked, onSent }: NewReportFormProps) {
  const t = messages.citizen;
  const queryClient = useQueryClient();
  const [missingLocation, setMissingLocation] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { category: "ponto-onibus-sem-sombra", text: "" },
  });

  const create = useMutation({
    mutationFn: mutations.createCitizenReport,
    onSuccess: () => {
      setSent(true);
      reset({ category: "ponto-onibus-sem-sombra", text: "" });
      onSent();
      void queryClient.invalidateQueries({ queryKey: queryKeys.citizenReports(municipalityId) });
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) => {
        setSent(false);
        if (!picked) {
          setMissingLocation(true);
          return;
        }
        setMissingLocation(false);
        create.mutate({ municipalityId, location: picked, ...values });
      })}
    >
      <p
        className={
          missingLocation && !picked
            ? "flex items-center gap-2 text-sm font-medium text-danger"
            : "flex items-center gap-2 text-sm text-fg-muted"
        }
      >
        <MapPinned aria-hidden className="size-4 shrink-0" />
        {picked
          ? t.pickedAt(`${formatDecimal(picked[1], 5)}, ${formatDecimal(picked[0], 5)}`)
          : t.pickHint}
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-category" className="text-xs font-medium text-fg-muted">
          {t.category}
        </label>
        <select
          id="report-category"
          {...register("category")}
          className="h-10 rounded-control border border-line bg-surface px-3 text-sm text-fg hover:border-line-strong"
        >
          {(Object.keys(REPORT_CATEGORIES) as ReportCategory[]).map((c) => (
            <option key={c} value={c}>
              {REPORT_CATEGORIES[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-text" className="text-xs font-medium text-fg-muted">
          {t.textLabel}
        </label>
        <textarea
          id="report-text"
          rows={3}
          maxLength={500}
          {...register("text")}
          placeholder={t.textPlaceholder}
          aria-invalid={errors.text ? true : undefined}
          aria-describedby={errors.text ? "report-text-error" : undefined}
          className="rounded-control border border-line bg-surface p-3 text-sm text-fg placeholder:text-fg-subtle hover:border-line-strong aria-invalid:border-danger"
        />
        {errors.text && (
          <p id="report-text-error" className="text-xs text-danger">
            {errors.text.message}
          </p>
        )}
      </div>

      {create.error && <QueryError error={create.error} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={create.isPending}>
          <Send aria-hidden />
          {create.isPending ? t.sending : t.send}
        </Button>
        <p role="status" className="text-xs text-accent empty:hidden">
          {sent ? t.sent : ""}
        </p>
      </div>
      <Callout tone="info">
        {t.privacy} {t.whatsapp}
      </Callout>
    </form>
  );
}
