"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Map as MapIcon, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { IvtuBadge, UtciChip } from "@/components/data/badges";
import { QueryError } from "@/components/data/query-error";
import { useActiveMunicipality } from "@/components/layout/municipality-context";
import { useBlockMunicipalitySync } from "@/components/layout/use-block-municipality-sync";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RangeField } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ZONE_LABELS, type Block } from "@/domain/block/schema";
import type { SavedScenario } from "@/domain/simulation/saved-scenario";
import type { BlockDetailResponse } from "@/lib/api/contracts";
import { queries } from "@/lib/api/queries";
import { formatPercent } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks";
import { messages } from "@/lib/i18n";
import { useUrlState } from "@/lib/use-url-state";
import { BlockPicker } from "./block-picker";
import { EsgCard } from "./esg-card";
import { SavedScenarios } from "./saved-scenarios";
import {
  capacityOf,
  fromScenarioInput,
  isEmptyScenario,
  presetDraft,
  toScenarioInput,
  type PresetId,
  type ScenarioDraft,
} from "./scenario";
import { SimulationResults } from "./simulation-results";
import { TreePlanting } from "./tree-planting";

const PRESETS: PresetId[] = ["recommended", "trees", "full", "clear"];

/**
 * Tela 03 · Simulador what-if. O quarteirão vem de `?bloco=` (ou o 1º do ranking IVTU);
 * cada ajuste dispara POST /simulation/what-if com debounce, mantendo o resultado anterior
 * esmaecido enquanto o novo chega.
 */
export function SimulatorScreen() {
  const municipality = useActiveMunicipality();
  const [params, setParams] = useUrlState();
  const blockId = params.get("bloco");
  const [loaded, setLoaded] = useState<SavedScenario | null>(null);

  const top = useQuery({
    ...queries.ranking({ municipality: municipality?.id ?? "", pageSize: 1 }),
    enabled: !!municipality && !blockId,
  });
  const topId = top.data?.data[0]?.id;
  useEffect(() => {
    if (!blockId && topId) setParams({ bloco: topId });
  }, [blockId, topId, setParams]);

  const detail = useQuery({ ...queries.block(blockId ?? ""), enabled: !!blockId });
  useBlockMunicipalitySync(detail.data?.block, () => setParams({ bloco: null }));

  if (!municipality || (!blockId && !top.error) || detail.isPending) return <SimulatorSkeleton />;
  if (top.error) return <QueryError error={top.error} onRetry={() => void top.refetch()} />;
  if (detail.error)
    return <QueryError error={detail.error} onRetry={() => void detail.refetch()} />;

  const { block, diagnostics } = detail.data;
  const initial =
    loaded?.scenario.blockId === block.id ? fromScenarioInput(loaded.scenario) : undefined;

  return (
    <Workbench
      key={`${block.id}:${loaded?.id ?? ""}`}
      block={block}
      diagnostics={diagnostics}
      municipalityId={municipality.id}
      initialDraft={initial}
      onPickBlock={(id) => {
        setLoaded(null);
        setParams({ bloco: id });
      }}
      onLoadScenario={(scenario) => {
        setLoaded(scenario);
        if (scenario.scenario.blockId !== block.id) setParams({ bloco: scenario.scenario.blockId });
      }}
    />
  );
}

interface WorkbenchProps {
  block: Block;
  diagnostics: BlockDetailResponse["diagnostics"];
  municipalityId: string;
  initialDraft?: ScenarioDraft;
  onPickBlock: (id: string) => void;
  onLoadScenario: (scenario: SavedScenario) => void;
}

function Workbench({
  block,
  diagnostics,
  municipalityId,
  initialDraft,
  onPickBlock,
  onLoadScenario,
}: WorkbenchProps) {
  const t = messages.simulator;
  const [draft, setDraft] = useState<ScenarioDraft>(
    () => initialDraft ?? presetDraft("recommended", block, diagnostics),
  );
  const [picking, setPicking] = useState(false);
  const capacity = capacityOf(block);

  const debounced = useDebouncedValue(draft, 250);
  const input = toScenarioInput(block.id, debounced);
  const empty = isEmptyScenario(input);
  const whatIf = useQuery({ ...queries.whatIf(input), enabled: !empty });
  const result = whatIf.data?.result;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4" data-tour="simulator-controls">
        <Card>
          <CardHeader className="gap-2">
            <p className="text-xs font-medium tracking-[0.14em] text-fg-muted uppercase">
              {t.blockLabel} · {block.code}
            </p>
            <CardTitle className="text-lg">{block.street}</CardTitle>
            <p className="text-sm text-fg-muted">
              {block.neighborhood} · {ZONE_LABELS[block.zone]}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <IvtuBadge score={diagnostics.ivtu.score} level={diagnostics.ivtu.level} />
              <UtciChip utci={diagnostics.utciPeak} />
              <Badge>
                {messages.map.panel.attributes.canopy} {formatPercent(block.canopyCover)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                aria-expanded={picking}
                onClick={() => setPicking((p) => !p)}
              >
                <ArrowLeftRight aria-hidden />
                {t.changeBlock}
              </Button>
              <ButtonLink href={`/mapa?bloco=${block.id}`} size="sm" variant="ghost">
                <MapIcon aria-hidden />
                {messages.prescription.detail.openMap}
              </ButtonLink>
            </div>
            {picking && <BlockPicker municipalityId={municipalityId} onPick={onPickBlock} />}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs font-medium text-fg-muted">{t.presetsLabel}</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant={preset === "recommended" ? "secondary" : "outline"}
                  onClick={() =>
                    setDraft(presetDraft(preset, block, diagnostics, draft.horizonYears))
                  }
                >
                  {preset === "recommended" && <Sparkles aria-hidden />}
                  {t.presets[preset]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.treesTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <TreePlanting
              block={block}
              capacity={capacity}
              trees={draft.trees}
              onChange={(trees) => setDraft((d) => ({ ...d, trees }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.surfacesTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <RangeField
              label={t.permeable}
              min={0}
              max={100}
              step={5}
              value={Math.round(draft.permeable * 100)}
              onValueChange={(v) => setDraft((d) => ({ ...d, permeable: v / 100 }))}
              valueText={formatPercent(draft.permeable)}
              hint={t.permeableHint}
            />
            <RangeField
              label={t.coolRoof}
              min={0}
              max={100}
              step={5}
              value={Math.round(draft.coolRoof * 100)}
              onValueChange={(v) => setDraft((d) => ({ ...d, coolRoof: v / 100 }))}
              valueText={formatPercent(draft.coolRoof)}
              hint={t.coolRoofHint}
            />
            <RangeField
              label={t.horizon}
              min={1}
              max={20}
              value={draft.horizonYears}
              onValueChange={(v) => setDraft((d) => ({ ...d, horizonYears: v }))}
              valueText={t.horizonValue(draft.horizonYears)}
              hint={t.horizonHint}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card data-tour="simulation-result">
          <CardHeader>
            <CardTitle>{t.resultTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {empty ? (
              <p className="py-10 text-center text-sm text-fg-muted">{t.noIntervention}</p>
            ) : whatIf.error ? (
              <QueryError error={whatIf.error} onRetry={() => void whatIf.refetch()} />
            ) : result ? (
              <SimulationResults
                result={result}
                stale={whatIf.isPlaceholderData || draft !== debounced}
              />
            ) : (
              <Skeleton className="h-96" />
            )}
          </CardContent>
        </Card>
        {result && !empty && <EsgCard result={result} />}
        <SavedScenarios
          municipalityId={municipalityId}
          scenario={input}
          canSave={!empty && !!result}
          onLoad={(saved) =>
            saved.scenario.blockId === block.id
              ? setDraft(fromScenarioInput(saved.scenario))
              : onLoadScenario(saved)
          }
        />
        <p className="text-xs text-fg-subtle">
          {messages.legal.seal} {messages.legal.estimates}
        </p>
      </div>
    </div>
  );
}

export function SimulatorSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <span className="sr-only" role="status">
        {messages.common.loading}
      </span>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
      <Skeleton className="h-[36rem] rounded-card" />
    </div>
  );
}
