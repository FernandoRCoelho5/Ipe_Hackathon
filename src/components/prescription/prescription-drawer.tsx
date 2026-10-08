"use client";

import { useQuery } from "@tanstack/react-query";
import { Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { UtciChip } from "@/components/data/badges";
import { QueryError } from "@/components/data/query-error";
import { LegalSeal } from "@/components/layout/legal-seal";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { ZONE_LABELS } from "@/domain/block/schema";
import { queries } from "@/lib/api/queries";
import { formatHour } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { BlockAttributes } from "./block-attributes";
import { FieldChecklist } from "./field-checklist";
import { IvtuBreakdown } from "./ivtu-breakdown";
import { RecommendationCard } from "./recommendation-card";

interface PrescriptionDrawerProps {
  blockId: string | null;
  /** Posição no ranking IVTU do município, quando conhecida pela tabela. */
  rank?: number;
  onClose: () => void;
}

/** Prescrição completa de um quarteirão: por quê, o que fazer e validação de campo. */
export function PrescriptionDrawer({ blockId, rank, onClose }: PrescriptionDrawerProps) {
  const t = messages.prescription.detail;
  const { data, error, isPending, refetch } = useQuery({
    ...queries.block(blockId ?? ""),
    enabled: !!blockId,
  });

  const title = data?.block.street ?? (isPending ? messages.common.loading : "");
  const eyebrow = data
    ? rank
      ? t.eyebrow(data.block.code, String(rank))
      : `${data.block.code} · ${data.block.neighborhood}`
    : undefined;

  return (
    <Drawer
      open={!!blockId}
      onClose={onClose}
      title={title}
      eyebrow={eyebrow}
      footer={
        data && (
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/simulador?bloco=${data.block.id}`} size="sm">
              <SlidersHorizontal aria-hidden />
              {t.simulate}
            </ButtonLink>
            <ButtonLink href={`/mapa?bloco=${data.block.id}`} size="sm" variant="outline">
              <MapIcon aria-hidden />
              {t.openMap}
            </ButtonLink>
          </div>
        )
      }
    >
      {error && <QueryError error={error} onRetry={() => void refetch()} />}
      {isPending && blockId && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      )}
      {data && (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="why-title" className="flex flex-col gap-4">
            <h3 id="why-title" className="text-sm font-semibold text-fg">
              {t.whyTitle}
            </h3>
            <p className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              {messages.map.panel.peakTitle}
              <UtciChip utci={data.diagnostics.utciPeak} showCategory />
              {messages.map.panel.peakAt(formatHour(data.diagnostics.utciPeakHour))}
              <span aria-hidden>·</span>
              {data.block.neighborhood} · {ZONE_LABELS[data.block.zone]}
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <IvtuBreakdown ivtu={data.diagnostics.ivtu} />
              <BlockAttributes block={data.block} drainageRisk={data.diagnostics.drainageRisk} />
            </div>
          </section>

          <section
            aria-labelledby="recs-title"
            data-tour="prescription-detail"
            className="flex flex-col gap-3"
          >
            <h3 id="recs-title" className="text-sm font-semibold text-fg">
              {t.recommendationsTitle}
            </h3>
            {data.diagnostics.prescription.recommendations.length > 0 ? (
              data.diagnostics.prescription.recommendations.map((r) => (
                <RecommendationCard key={r.id} recommendation={r} />
              ))
            ) : (
              <p className="text-sm text-fg-muted">{messages.map.panel.noRecommendation}</p>
            )}
          </section>

          <section aria-labelledby="checklist-title" className="flex flex-col gap-3">
            <div>
              <h3 id="checklist-title" className="text-sm font-semibold text-fg">
                {t.checklistTitle}
              </h3>
              <p className="text-xs text-fg-muted">{t.checklistDescription}</p>
            </div>
            <FieldChecklist blockId={data.block.id} />
          </section>

          <LegalSeal compact />
        </div>
      )}
    </Drawer>
  );
}
