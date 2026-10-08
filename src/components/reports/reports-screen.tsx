"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { FileDown, FileText, FileType2 } from "lucide-react";
import { useState } from "react";
import { QueryError } from "@/components/data/query-error";
import { useActiveMunicipality } from "@/components/layout/municipality-context";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportDocument } from "@/lib/api/contracts";
import { engagementQueries, mutations, queries } from "@/lib/api/queries";
import { downloadBlob } from "@/lib/download";
import { messages } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { ReportForm } from "./report-form";
import { buildReportOutline } from "./report-outline";
import { ReportPreview } from "./report-preview";

type ExportFormat = "pdf" | "docx";

/**
 * Tela 04 · Relatórios para editais. O formulário usa o mesmo schema da API; a
 * pré-visualização, o PDF e o DOCX desenham o mesmo roteiro (`report-outline.ts`).
 * Os geradores de arquivo só são carregados no clique (não pesam a tela).
 */
export function ReportsScreen() {
  const municipality = useActiveMunicipality();
  if (!municipality) return <ReportsSkeleton />;
  // Trocar de município reinicia formulário e pré-visualização.
  return <ReportsWorkspace key={municipality.id} municipalityId={municipality.id} />;
}

function ReportsWorkspace({ municipalityId }: { municipalityId: string }) {
  const t = messages.reports;
  const programs = useQuery(engagementQueries.programs());
  const ranking = useQuery(queries.ranking({ municipality: municipalityId, pageSize: 1 }));
  const scenarios = useQuery(queries.scenarios(municipalityId));

  const [report, setReport] = useState<ReportDocument | null>(null);
  const [submittedSnapshot, setSubmittedSnapshot] = useState<string | null>(null);
  const [currentSnapshot, setCurrentSnapshot] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportFailed, setExportFailed] = useState(false);

  const preview = useMutation({
    mutationFn: mutations.reportPreview,
    onSuccess: (doc) => setReport(doc),
  });

  const outline = report ? buildReportOutline(report) : null;
  const outdated = !!report && !!submittedSnapshot && currentSnapshot !== submittedSnapshot;

  async function exportAs(format: ExportFormat) {
    if (!outline) return;
    setExporting(format);
    setExportFailed(false);
    try {
      if (format === "pdf") {
        const { reportPdfBlob } = await import("./report-pdf");
        downloadBlob(
          await reportPdfBlob(outline, window.location.origin),
          `${outline.fileBaseName}.pdf`,
        );
      } else {
        const { reportDocxBlob } = await import("./report-docx");
        downloadBlob(await reportDocxBlob(outline), `${outline.fileBaseName}.docx`);
      }
    } catch (error) {
      logger.error("Falha ao exportar relatório", error, { format });
      setExportFailed(true);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{t.formTitle}</CardTitle>
          <CardDescription>{t.formDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {programs.error && (
            <QueryError error={programs.error} onRetry={() => void programs.refetch()} />
          )}
          <ReportForm
            municipalityId={municipalityId}
            programs={programs.data?.data}
            neighborhoods={ranking.data?.meta.neighborhoods}
            scenarios={scenarios.data?.data}
            submitting={preview.isPending}
            onSnapshotChange={setCurrentSnapshot}
            onSubmit={(values, snapshot) => {
              setSubmittedSnapshot(snapshot);
              preview.mutate(values);
            }}
          />
          {preview.error && <QueryError error={preview.error} className="mt-4" />}
        </CardContent>
      </Card>

      <section aria-labelledby="preview-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="preview-title" className="text-lg font-semibold text-fg">
            {t.previewTitle}
          </h2>
          {outline && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void exportAs("pdf")} disabled={exporting !== null}>
                <FileDown aria-hidden />
                {exporting === "pdf" ? t.generatingPdf : t.downloadPdf}
              </Button>
              <Button
                variant="outline"
                onClick={() => void exportAs("docx")}
                disabled={exporting !== null}
              >
                <FileType2 aria-hidden />
                {exporting === "docx" ? t.generatingDocx : t.downloadDocx}
              </Button>
            </div>
          )}
        </div>
        <div role="status" className="empty:hidden">
          {exportFailed && <Callout tone="danger">{t.exportError}</Callout>}
          {outdated && <Callout tone="warning">{t.outdated}</Callout>}
        </div>
        {preview.isPending && !outline ? (
          <Skeleton className="h-[40rem] rounded-card" />
        ) : outline ? (
          <div className={preview.isPending ? "opacity-60 transition-opacity" : undefined}>
            <ReportPreview outline={outline} />
          </div>
        ) : (
          <EmptyState icon={FileText} title={t.previewTitle} description={t.previewEmpty} />
        )}
      </section>
    </div>
  );
}

export function ReportsSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-6 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      <span className="sr-only" role="status">
        {messages.common.loading}
      </span>
      <Skeleton className="h-[40rem] rounded-card" />
      <Skeleton className="h-[40rem] rounded-card" />
    </div>
  );
}
