"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Handshake } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";
import { QueryError } from "@/components/data/query-error";
import { BlockPicker } from "@/components/simulator/block-picker";
import { Button } from "@/components/ui/button";
import { newAdoptionSchema, PARTNER_TYPES, type PartnerType } from "@/domain/adoption/schema";
import { SPECIES, SPECIES_IDS } from "@/domain/prescription/species";
import type { AdoptionSummary } from "@/lib/api/contracts";
import { mutations, queryKeys, type AdoptionListResponse } from "@/lib/api/queries";
import { messages } from "@/lib/i18n";

type FormValues = z.input<typeof newAdoptionSchema>;
type FormOutput = z.output<typeof newAdoptionSchema>;

const input =
  "h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle hover:border-line-strong aria-invalid:border-danger";
const label = "text-xs font-medium text-fg-muted";

const asNumber = (v: string) => (v === "" ? 0 : Number(v));

interface NewAdoptionFormProps {
  municipalityId: string;
  onCreated: (summary: AdoptionSummary) => void;
  onCancel: () => void;
}

/** Cadastro de parceria validado pelo mesmo schema da API (`newAdoptionSchema`). */
export function NewAdoptionForm({ municipalityId, onCreated, onCancel }: NewAdoptionFormProps) {
  const t = messages.adopt.form;
  const queryClient = useQueryClient();
  const [areaLabel, setAreaLabel] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(newAdoptionSchema),
    defaultValues: {
      municipalityId,
      blockId: "",
      partnerName: "",
      partnerType: "industria",
      trees: [{ speciesId: "ipe-amarelo", count: 20 }],
      permeableAreaM2: 0,
      coolRoofAreaM2: 0,
      maintenanceMonths: 24,
    },
  });
  const trees = useFieldArray({ control, name: "trees" });

  const create = useMutation({
    mutationFn: mutations.createAdoption,
    onSuccess: (summary) => {
      // A nova parceria já aparece selecionada; o refetch confirma em seguida.
      queryClient.setQueryData<AdoptionListResponse>(queryKeys.adoptions(municipalityId), (old) =>
        old ? { data: [...old.data, summary] } : old,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.adoptions(municipalityId) });
      onCreated(summary);
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) => create.mutate(values))}
    >
      <p className="text-sm text-fg-muted">{t.description}</p>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-fg">{t.area}</legend>
        <p className="text-xs text-fg-muted">{t.areaHint}</p>
        <BlockPicker
          municipalityId={municipalityId}
          onPick={(id, row) => {
            setValue("blockId", id, { shouldValidate: true });
            setAreaLabel(`${row.code} · ${row.street} (${row.neighborhood})`);
          }}
        />
        {areaLabel && (
          <p role="status" className="text-sm font-medium text-accent">
            {t.areaSelected(areaLabel)}
          </p>
        )}
        {errors.blockId && <p className="text-xs text-danger">{errors.blockId.message}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="partnerName" className={label}>
            {t.partnerName}
          </label>
          <input
            id="partnerName"
            {...register("partnerName")}
            aria-invalid={errors.partnerName ? true : undefined}
            aria-describedby={errors.partnerName ? "partnerName-error" : undefined}
            className={input}
          />
          {errors.partnerName && (
            <p id="partnerName-error" className="text-xs text-danger">
              {errors.partnerName.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="partnerType" className={label}>
            {t.partnerType}
          </label>
          <select id="partnerType" {...register("partnerType")} className={input}>
            {(Object.keys(PARTNER_TYPES) as PartnerType[]).map((type) => (
              <option key={type} value={type}>
                {PARTNER_TYPES[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-fg">{t.trees}</legend>
        {trees.fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={`species-${index}`} className={label}>
                {t.species}
              </label>
              <select
                id={`species-${index}`}
                {...register(`trees.${index}.speciesId`)}
                className={input}
              >
                {SPECIES_IDS.map((id) => (
                  <option key={id} value={id}>
                    {SPECIES[id].commonName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`count-${index}`} className={label}>
                {t.count}
              </label>
              <input
                id={`count-${index}`}
                type="number"
                min={0}
                max={300}
                {...register(`trees.${index}.count`, { setValueAs: asNumber })}
                className={input}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.removeSpecies}
              onClick={() => trees.remove(index)}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          disabled={trees.fields.length >= 10}
          onClick={() => trees.append({ speciesId: "quaresmeira", count: 10 })}
        >
          <Plus aria-hidden />
          {t.addSpecies}
        </Button>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["permeableAreaM2", t.permeable],
            ["coolRoofAreaM2", t.coolRoof],
            ["maintenanceMonths", t.months],
          ] as const
        ).map(([name, text]) => (
          <div key={name} className="flex flex-col gap-1.5">
            <label htmlFor={name} className={label}>
              {text}
            </label>
            <input
              id={name}
              type="number"
              min={0}
              {...register(name, { setValueAs: asNumber })}
              aria-invalid={errors[name] ? true : undefined}
              className={input}
            />
            {errors[name] && <p className="text-xs text-danger">{errors[name]?.message}</p>}
          </div>
        ))}
      </div>

      {create.error && <QueryError error={create.error} />}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={create.isPending}>
          <Handshake aria-hidden />
          {create.isPending ? t.submitting : t.submit}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
