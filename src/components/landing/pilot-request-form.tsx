"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import {
  newPilotRequestSchema,
  PILOT_INTERESTS,
  PILOT_ORGANIZATION_TYPES,
  type PilotInterest,
  type PilotOrganizationType,
  type PilotRequestReceipt,
} from "@/domain/pilot/schema";
import { ApiClientError } from "@/lib/api/client";
import { mutations } from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/i18n";

type Values = z.input<typeof newPilotRequestSchema>;
type Output = z.output<typeof newPilotRequestSchema>;

const t = messages.landing.pilot;
const input =
  "h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle hover:border-line-strong aria-invalid:border-danger";

/**
 * Pedido de piloto (POST /api/v1/pilot-requests), validado pelo mesmo schema da API.
 * O consentimento LGPD é obrigatório; a resposta traz só o protocolo.
 */
export function PilotRequestForm() {
  const [receipt, setReceipt] = useState<PilotRequestReceipt | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values, unknown, Output>({
    resolver: zodResolver(newPilotRequestSchema),
    defaultValues: {
      organization: "",
      organizationType: "prefeitura",
      municipality: "",
      contactName: "",
      email: "",
      interests: [],
      message: "",
    },
  });

  async function submit(values: Output) {
    setFailure(null);
    try {
      setReceipt(await mutations.requestPilot(values));
      reset();
    } catch (error) {
      if (error instanceof ApiClientError && error.details?.length) {
        for (const detail of error.details) {
          setError(detail.path as keyof Values, { message: detail.message });
        }
      } else {
        setFailure(error instanceof Error ? error.message : messages.data.loadError);
      }
    }
  }

  if (receipt) {
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <CheckCircle2 aria-hidden className="size-10 text-accent" />
        <h3 className="text-xl font-semibold text-fg">{t.successTitle}</h3>
        <p className="text-base text-fg">{t.success(receipt.protocol)}</p>
        <p className="text-sm text-fg-muted">{t.demoNotice}</p>
        <Button variant="outline" onClick={() => setReceipt(null)}>
          {t.another}
        </Button>
      </div>
    );
  }

  const error = (name: keyof Values) =>
    errors[name]?.message ? (
      <p id={`pilot-${name}-error`} className="text-xs text-danger">
        {errors[name]?.message}
      </p>
    ) : null;
  const a11y = (name: keyof Values) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `pilot-${name}-error` : undefined,
  });

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="pilot-organization" className="text-sm font-semibold text-fg">
            {t.organization}
          </label>
          <input
            id="pilot-organization"
            autoComplete="organization"
            placeholder={t.organizationPlaceholder}
            className={input}
            {...register("organization")}
            {...a11y("organization")}
          />
          {error("organization")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pilot-type" className="text-sm font-semibold text-fg">
            {t.organizationType}
          </label>
          <select
            id="pilot-type"
            className={cn(input, "cursor-pointer")}
            {...register("organizationType")}
          >
            {(Object.keys(PILOT_ORGANIZATION_TYPES) as PilotOrganizationType[]).map((type) => (
              <option key={type} value={type}>
                {PILOT_ORGANIZATION_TYPES[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pilot-municipality" className="text-sm font-semibold text-fg">
            {t.municipality}
          </label>
          <input
            id="pilot-municipality"
            autoComplete="address-level2"
            placeholder={t.municipalityPlaceholder}
            className={input}
            {...register("municipality")}
            {...a11y("municipality")}
          />
          {error("municipality")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pilot-name" className="text-sm font-semibold text-fg">
            {t.contactName}
          </label>
          <input
            id="pilot-name"
            autoComplete="name"
            className={input}
            {...register("contactName")}
            {...a11y("contactName")}
          />
          {error("contactName")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pilot-email" className="text-sm font-semibold text-fg">
            {t.email}
          </label>
          <input
            id="pilot-email"
            type="email"
            autoComplete="email"
            className={input}
            {...register("email")}
            {...a11y("email")}
          />
          {error("email")}
        </div>
      </div>

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errors.interests ? "pilot-interests-error" : undefined}
      >
        <legend className="mb-2 text-sm font-semibold text-fg">{t.interests}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(PILOT_INTERESTS) as PilotInterest[]).map((interest) => (
            <label
              key={interest}
              className="flex cursor-pointer items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-fg hover:border-line-strong has-checked:border-primary has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-focus"
            >
              <input
                type="checkbox"
                value={interest}
                className="accent-accent"
                {...register("interests")}
              />
              {PILOT_INTERESTS[interest]}
            </label>
          ))}
        </div>
        {error("interests")}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pilot-message" className="text-sm font-semibold text-fg">
          {t.message}
        </label>
        <textarea
          id="pilot-message"
          rows={3}
          maxLength={1000}
          placeholder={t.messagePlaceholder}
          className="rounded-control border border-line bg-surface p-3 text-sm text-fg placeholder:text-fg-subtle hover:border-line-strong"
          {...register("message")}
          {...a11y("message")}
        />
        {error("message")}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-fg">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-accent"
            {...register("consent")}
            {...a11y("consent")}
          />
          <span>
            {t.consent}{" "}
            <Link
              href="/privacidade"
              className="font-medium text-accent underline underline-offset-2"
            >
              {messages.legal.privacyTitle}
            </Link>
          </span>
        </label>
        {error("consent")}
      </div>

      {failure && (
        <Callout tone="danger" role="alert">
          {failure}
        </Callout>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="self-start">
        <Send aria-hidden />
        {isSubmitting ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
