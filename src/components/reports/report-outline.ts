import { ZONE_LABELS } from "@/domain/block/schema";
import { IVTU_LEVEL_LABELS, IVTU_LEVELS } from "@/domain/ivtu/ivtu";
import { EXECUTION_LEVEL_LABELS } from "@/domain/prescription/engine";
import type { ReportDocument } from "@/lib/api/contracts";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatInteger,
  formatIsoDate,
  formatPercent,
  formatSignedTemperature,
  formatTemperature,
} from "@/lib/format";

/**
 * Roteiro do relatório para editais: a ÚNICA tradução de `ReportDocument` em texto.
 * A pré-visualização (HTML), o PDF e o DOCX apenas desenham este roteiro, então os
 * três formatos dizem sempre a mesma coisa, com os mesmos números e as mesmas fontes.
 */

export interface OutlineTableColumn {
  label: string;
  align?: "left" | "right";
  /** Largura relativa (somam ~1 por tabela). */
  width: number;
}

export type OutlineBlock =
  | { kind: "paragraph"; text: string; muted?: boolean }
  | { kind: "bullets"; items: { text: string; source?: string }[] }
  | { kind: "kpis"; items: { label: string; value: string; hint?: string }[] }
  | { kind: "table"; columns: OutlineTableColumn[]; rows: string[][]; caption?: string };

export interface OutlineSection {
  id: string;
  title: string;
  blocks: OutlineBlock[];
}

export interface ReportOutline {
  title: string;
  fileBaseName: string;
  cover: {
    eyebrow: string;
    title: string;
    program: string;
    sponsor: string;
    facts: { label: string; value: string }[];
  };
  sections: OutlineSection[];
  seal: string;
  footer: string;
}

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function buildReportOutline(doc: ReportDocument): ReportOutline {
  const d = doc.diagnosis;
  const place = `${doc.municipality.name} (${doc.municipality.state})`;
  const exposed = d.levelCounts.alto + d.levelCounts.critico;
  const sections: OutlineSection[] = [];

  sections.push({
    id: "resumo",
    title: "1. Resumo executivo",
    blocks: [
      {
        kind: "paragraph",
        text: `Este relatório apresenta o pré-diagnóstico térmico de ${formatInteger(d.blocksAnalyzed)} quarteirões em ${doc.request.neighborhoods.length} ${doc.request.neighborhoods.length === 1 ? "bairro" : "bairros"} de ${place}, com a priorização técnica de intervenções de infraestrutura verde para o projeto "${doc.request.projectName}". ${formatInteger(exposed)} quarteirões (${formatPercent(d.blocksAnalyzed ? exposed / d.blocksAnalyzed : 0)}) estão em vulnerabilidade térmica alta ou crítica, com sensação térmica média de ${formatTemperature(d.averageUtciPeak)} no pico solar.`,
      },
      { kind: "kpis", items: d.kpis },
      {
        kind: "bullets",
        items: doc.program.emphasis.map((text) => ({ text: `Ênfase do edital: ${text}.` })),
      },
    ],
  });

  sections.push({
    id: "diagnostico",
    title: "2. Diagnóstico térmico por bairro",
    blocks: [
      {
        kind: "paragraph",
        text: `A sensação térmica do pedestre é estimada pelo UTCI (Índice Climático Térmico Universal) a partir de temperatura de superfície por satélite (média de ${formatTemperature(d.averageLst)}), cobertura arbórea (média de ${formatPercent(d.averageCanopy)}, frente à referência de 30%), vento e umidade. O IVTU (0–100) combina estresse térmico, circulação de pedestres e vulnerabilidade social.`,
      },
      {
        kind: "table",
        caption: "Indicadores por bairro selecionado",
        columns: [
          { label: "Bairro", width: 0.34 },
          { label: "Quarteirões", align: "right", width: 0.16 },
          { label: "IVTU médio", align: "right", width: 0.16 },
          { label: "UTCI pico médio", align: "right", width: 0.18 },
          { label: "Críticos", align: "right", width: 0.16 },
        ],
        rows: d.neighborhoods.map((n) => [
          n.name,
          formatInteger(n.blocks),
          formatDecimal(n.averageIvtu),
          formatTemperature(n.averageUtciPeak),
          formatInteger(n.criticalBlocks),
        ]),
      },
      {
        kind: "table",
        caption: "Distribuição dos quarteirões por nível de vulnerabilidade (IVTU)",
        columns: [
          { label: "Nível", width: 0.5 },
          { label: "Quarteirões", align: "right", width: 0.25 },
          { label: "Participação", align: "right", width: 0.25 },
        ],
        rows: [...IVTU_LEVELS]
          .reverse()
          .map((level) => [
            IVTU_LEVEL_LABELS[level],
            formatInteger(d.levelCounts[level]),
            formatPercent(d.blocksAnalyzed ? d.levelCounts[level] / d.blocksAnalyzed : 0),
          ]),
      },
    ],
  });

  sections.push({
    id: "prioritarios",
    title: "3. Quarteirões prioritários",
    blocks: [
      {
        kind: "paragraph",
        text: "Os dez quarteirões de maior IVTU entre os bairros selecionados, com a intervenção recomendada pelo motor prescritivo. A posição se refere ao ranking do município inteiro.",
      },
      {
        kind: "table",
        columns: [
          { label: "Posição", align: "right", width: 0.09 },
          { label: "Quarteirão", width: 0.29 },
          { label: "IVTU", align: "right", width: 0.09 },
          { label: "UTCI pico", align: "right", width: 0.13 },
          { label: "Recomendação", width: 0.4 },
        ],
        rows: d.priorityBlocks.map((row) => [
          `${row.rank}º`,
          `${row.code} · ${row.street} (${row.neighborhood}, ${ZONE_LABELS[row.zone].toLowerCase()})`,
          formatDecimal(row.ivtu),
          formatTemperature(row.utciPeak),
          row.recommendation
            ? `${row.recommendation.title} · ${EXECUTION_LEVEL_LABELS[row.recommendation.level]}`
            : "Sem intervenção prioritária",
        ]),
      },
    ],
  });

  sections.push({
    id: "epidemiologia",
    title: "4. Justificativa epidemiológica",
    blocks: [
      {
        kind: "paragraph",
        text: `Nos quarteirões em nível alto ou crítico vivem ${formatInteger(d.populationAffected)} pessoas, das quais ${formatInteger(d.elderlyAffected)} idosos de 65 anos ou mais, o grupo mais afetado pelo calor extremo.`,
      },
      {
        kind: "bullets",
        items: doc.epidemiology.map((e) => ({ text: e.statement, source: `Fonte: ${e.source}` })),
      },
    ],
  });

  sections.push({
    id: "intervencoes",
    title: "5. Intervenções propostas",
    blocks: doc.interventions.length
      ? [
          {
            kind: "paragraph",
            text: "Intervenções táticas podem ser executadas em até seis meses; as estruturantes dependem de projeto e obra. Cada quarteirão pode receber mais de um tipo de intervenção.",
          },
          {
            kind: "table",
            columns: [
              { label: "Intervenção", width: 0.46 },
              { label: "Quarteirões", align: "right", width: 0.18 },
              { label: "Táticas", align: "right", width: 0.18 },
              { label: "Estruturantes", align: "right", width: 0.18 },
            ],
            rows: doc.interventions.map((i) => [
              i.label,
              formatInteger(i.blocks),
              formatInteger(i.tactical),
              formatInteger(i.structural),
            ]),
          },
        ]
      : [{ kind: "paragraph", text: "Nenhuma intervenção prioritária nos bairros selecionados." }],
  });

  sections.push({
    id: "cenarios",
    title: "6. Cenários simulados",
    blocks: doc.scenarios.length
      ? [
          {
            kind: "paragraph",
            text: "Cenários de projeto elaborados no simulador do Ipê. A variação do UTCI é a média no pico solar (11h–15h), com a faixa entre os casos conservador e otimista.",
          },
          {
            kind: "table",
            columns: [
              { label: "Cenário", width: 0.3 },
              { label: "Quarteirão", width: 0.2 },
              { label: "Δ UTCI pico", align: "right", width: 0.16 },
              { label: "Faixa", width: 0.18 },
              { label: "Árvores", align: "right", width: 0.08 },
              { label: "Escoamento", align: "right", width: 0.08 },
            ],
            rows: doc.scenarios.map((s) => [
              s.name,
              s.summary.blockCode,
              formatSignedTemperature(s.summary.peakUtciDelta),
              `${formatSignedTemperature(s.summary.peakUtciDeltaRange[0])} a ${formatSignedTemperature(s.summary.peakUtciDeltaRange[1])}`,
              formatInteger(s.summary.plantedTrees),
              formatPercent(s.summary.runoffChange, { signed: true }),
            ]),
          },
        ]
      : [
          {
            kind: "paragraph",
            text: "Nenhum cenário simulado foi anexado. Salve cenários no simulador para incluí-los aqui.",
            muted: true,
          },
        ],
  });

  sections.push({
    id: "socioeconomico",
    title: "7. Impacto socioeconômico estimado",
    blocks: [
      {
        kind: "bullets",
        items: doc.socioeconomic.map((s) => ({ text: s.statement, source: `Base: ${s.basis}` })),
      },
    ],
  });

  sections.push({
    id: "campo",
    title: "8. Validação em campo",
    blocks: [
      {
        kind: "paragraph",
        text: `Checklists de vistoria iniciados em ${formatInteger(doc.fieldValidation.checklistsStarted)} quarteirões e concluídos em ${formatInteger(doc.fieldValidation.checklistsCompleted)}. As vistorias confirmam o que o satélite não vê: fiação aérea, redes subterrâneas, acessos e largura real das calçadas.`,
      },
    ],
  });

  sections.push({
    id: "avisos",
    title: "Avisos e responsabilidade técnica",
    blocks: [{ kind: "bullets", items: doc.notices.map((text) => ({ text })) }],
  });

  const date = formatDate(doc.generatedAt, "long");
  return {
    title: doc.title,
    fileBaseName: `ipe-${slug(doc.program.name)}-${doc.municipality.id}-${formatIsoDate(doc.generatedAt)}`,
    cover: {
      eyebrow: "Relatório técnico para captação de recursos",
      title: doc.title,
      program: doc.program.name,
      sponsor: doc.program.sponsor,
      facts: [
        {
          label: "Município",
          value: `${place} · ${formatInteger(doc.municipality.population)} habitantes`,
        },
        { label: "Responsável", value: doc.request.department },
        { label: "Orçamento estimado", value: formatCurrency(doc.request.estimatedBudget) },
        { label: "Bairros", value: doc.request.neighborhoods.join(", ") },
        { label: "Emitido em", value: date },
      ],
    },
    sections,
    seal: doc.seal,
    footer: `Ipê · Inteligência Térmica Urbana · ${doc.id} · ${formatDateTime(doc.generatedAt)}`,
  };
}

/** Texto corrido do roteiro (busca, testes e acessibilidade). */
export function outlineToPlainText(outline: ReportOutline): string {
  const lines = [outline.cover.title, outline.cover.program];
  for (const section of outline.sections) {
    lines.push(section.title);
    for (const block of section.blocks) {
      if (block.kind === "paragraph") lines.push(block.text);
      if (block.kind === "bullets") {
        lines.push(...block.items.map((i) => (i.source ? `${i.text} ${i.source}` : i.text)));
      }
      if (block.kind === "kpis") lines.push(...block.items.map((i) => `${i.label}: ${i.value}`));
      if (block.kind === "table") lines.push(...block.rows.map((r) => r.join(" | ")));
    }
  }
  lines.push(outline.seal);
  return lines.join("\n");
}
