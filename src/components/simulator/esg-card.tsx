"use client";

import { useQuery } from "@tanstack/react-query";
import { Leaf } from "lucide-react";
import { QueryError } from "@/components/data/query-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import type { SimulationResult } from "@/domain/simulation/simulate";
import { queries } from "@/lib/api/queries";
import { formatDecimal, formatInteger } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { esgInputFrom } from "./scenario";

/** Retorno ESG do cenário (POST /esg/impact), sempre com as premissas por extenso. */
export function EsgCard({ result }: { result: SimulationResult }) {
  const t = messages.simulator;
  const { data, error, isPending, isPlaceholderData, refetch } = useQuery(
    queries.esg(esgInputFrom(result)),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf aria-hidden className="size-4 text-accent" />
          {t.esgTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <QueryError error={error} onRetry={() => void refetch()} />}
        {isPending ? (
          <Skeleton className="h-24" />
        ) : (
          data && (
            <div className={isPlaceholderData ? "opacity-60" : undefined}>
              <dl className="grid grid-cols-2 gap-4">
                <Stat
                  label={t.esg.co2(data.horizonYears)}
                  value={`${formatDecimal(data.co2SequesteredKg / 1000)} t`}
                />
                <Stat
                  label={t.esg.co2Year}
                  value={`${formatInteger(data.co2PerYearAtMaturityKg)} kg/ano`}
                />
                <Stat label={t.esg.greenArea} value={`${formatInteger(data.greenAreaM2)} m²`} />
                <Stat
                  label={t.esg.runoff}
                  value={`${formatInteger(data.runoffAvoidedM3PerYear)} m³`}
                />
              </dl>
              <details className="mt-4 text-xs text-fg-muted">
                <summary className="cursor-pointer font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent">
                  {t.esg.premises}
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {data.premises.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </details>
            </div>
          )
        )}
        <p className="text-xs text-fg-subtle">{messages.legal.estimates}</p>
      </CardContent>
    </Card>
  );
}
