import "server-only";
import { INTERVENTION_LABELS, INTERVENTION_TYPES } from "@/domain/prescription/engine";
import { checklistFor, checklistProgress } from "@/domain/prescription/checklist";
import { mean, round } from "@/domain/shared/math";
import { formatDecimal, formatInteger, formatPercent } from "@/lib/format";
import {
  LEGAL_SEAL,
  reportRequestSchema,
  type FundingProgramId,
  type ReportDocument,
  type ReportRequest,
} from "@/lib/api/contracts";
import { HttpError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { diagnoseMunicipality } from "./diagnostics";
import { requireMunicipality, toRankingRow } from "./thermal-layers";

/**
 * Relatórios para editais: dados estruturados que alimentam a pré-visualização
 * e a exportação (PDF/DOCX). Números de contexto vêm EXCLUSIVAMENTE dos documentos
 * do projeto, com fonte; impactos levam o selo "estimativas a validar no piloto".
 */

export const FUNDING_PROGRAMS: ReadonlyArray<ReportDocument["program"]> = [
  {
    id: "fundo-clima",
    name: "Fundo Clima",
    sponsor: "BNDES · Fundo Nacional sobre Mudança do Clima",
    audience: "publico",
    description:
      "Financiamento a projetos de adaptação e mitigação da mudança do clima. O relatório organiza o diagnóstico georreferenciado e a priorização técnica das intervenções.",
    emphasis: [
      "Adaptação climática urbana",
      "Justificativa técnica georreferenciada",
      "Metas mensuráveis",
    ],
  },
  {
    id: "ambiente-resiliente-rj",
    name: "Programa Ambiente Resiliente RJ",
    sponsor: "SEAS-RJ · Governo do Estado do Rio de Janeiro",
    audience: "publico",
    description:
      "Programa estadual de resiliência climática. O relatório destaca a população vulnerável, o risco combinado de calor e alagamento e as ações táticas de curto prazo.",
    emphasis: ["População vulnerável", "Calor e drenagem integrados", "Ações táticas (0–6 meses)"],
  },
  {
    id: "fecam",
    name: "FECAM",
    sponsor: "Fundo Estadual de Conservação Ambiental e Desenvolvimento Urbano (RJ)",
    audience: "publico",
    description:
      "Fundo estadual para projetos ambientais e de desenvolvimento urbano. O relatório enfatiza infraestrutura verde, arborização e permeabilidade do solo.",
    emphasis: ["Infraestrutura verde", "Arborização urbana", "Pavimento permeável"],
  },
  {
    id: "esg-corporativo",
    name: "Relatório ESG Corporativo",
    sponsor: "Uso privado (indústrias, construtoras, shoppings, logística)",
    audience: "privado",
    description:
      "Relatório de conforto térmico e de impacto ambiental para empresas que adotam ou financiam intervenções em seus pátios, entornos e empreendimentos.",
    emphasis: ["Conforto térmico", "Indicadores ambientais", "Selo Adote uma Ilha Verde"],
  },
];

export function getFundingProgram(id: FundingProgramId) {
  const program = FUNDING_PROGRAMS.find((p) => p.id === id);
  if (!program) throw new HttpError(400, "bad_request", `Edital desconhecido: ${id}`);
  return program;
}

const EPIDEMIOLOGY: ReportDocument["epidemiology"] = [
  {
    statement:
      "Entre 2000 e 2019, 119.643 mortes no Brasil foram associadas a ondas de calor, cerca de 0,6% dos óbitos por causas naturais do período.",
    source: "Fiocruz e UFBA (2026)",
  },
  {
    statement:
      "Idosos de 65 anos ou mais responderam por cerca de 80% dessas mortes; 33.858 foram por doenças cardiovasculares e 24.225 por doenças respiratórias.",
    source: "Fiocruz e UFBA (2026)",
  },
  {
    statement:
      "Em 93 cidades europeias, as ilhas de calor responderam por cerca de 4,3% das mortes de verão; levar a cobertura arbórea a 30% evitaria 2.644 mortes prematuras.",
    source: "The Lancet (estudo com 93 cidades europeias)",
  },
  {
    statement:
      "O estresse térmico deve causar a perda de 2,2% das horas de trabalho no mundo até 2030, o equivalente a US$ 2,4 trilhões e a 80 milhões de empregos em tempo integral.",
    source: "Organização Internacional do Trabalho (OIT)",
  },
];

const SOCIOECONOMIC: ReportDocument["socioeconomic"] = [
  {
    statement:
      "Redução de 1,5 °C a 3 °C na temperatura do ar no entorno de edifícios públicos sombreados. Como cada 1 °C a menos economiza de 5% a 8% na refrigeração, a economia estimada é de R$ 48 mil a R$ 80 mil por mês por município.",
    basis: "Estimativa do projeto Ipê — a validar no piloto",
  },
  {
    statement:
      "Corredores sombreados reduzem o uso de ar-condicionado veicular: com 40.000 veículos por dia e 0,15 L a menos por veículo, cerca de R$ 900 mil por mês em combustível.",
    basis: "Estimativa do projeto Ipê — a validar no piloto",
  },
  {
    statement:
      "Zonas com conforto térmico: de 15% a 30% mais tempo de permanência do pedestre e até 12% mais vendas no comércio de rua no pico solar (11h–15h).",
    basis: "Estimativa do projeto Ipê — a validar no piloto",
  },
  {
    statement:
      "Até 15% menos internações de emergência de idosos por crises cardiovasculares e respiratórias em períodos de calor extremo.",
    basis: "Estimativa do projeto Ipê — a validar no piloto",
  },
];

export async function buildReportDocument(input: ReportRequest): Promise<ReportDocument> {
  const request = reportRequestSchema.parse(input);
  const municipality = await requireMunicipality(request.municipalityId);
  const program = getFundingProgram(request.programId);
  const repos = getRepositories();

  const all = await diagnoseMunicipality(municipality.id);
  const known = new Set(all.map((d) => d.block.neighborhood));
  const unknown = request.neighborhoods.filter((n) => !known.has(n));
  if (unknown.length > 0) {
    throw new HttpError(400, "bad_request", `Bairro(s) fora do município: ${unknown.join(", ")}`);
  }

  const selected = all.filter((d) => request.neighborhoods.includes(d.block.neighborhood));
  const ranked = [...all].sort((a, b) => b.diagnostics.ivtu.score - a.diagnostics.ivtu.score);
  const rankOf = new Map(ranked.map((d, i) => [d.block.id, i + 1]));

  const levelCounts = { baixo: 0, medio: 0, alto: 0, critico: 0 };
  for (const d of selected) levelCounts[d.diagnostics.ivtu.level] += 1;

  const exposed = selected.filter(
    (d) => d.diagnostics.ivtu.level === "alto" || d.diagnostics.ivtu.level === "critico",
  );
  const populationAffected = exposed.reduce((s, d) => s + d.block.population, 0);
  const elderlyAffected = Math.round(
    exposed.reduce((s, d) => s + d.block.population * d.block.elderlyShare, 0),
  );
  const averageUtciPeak = round(mean(selected.map((d) => d.diagnostics.utciPeak)), 1);
  const averageLst = round(mean(selected.map((d) => d.block.lstC)), 1);
  const averageCanopy = round(mean(selected.map((d) => d.block.canopyCover)), 3);

  const neighborhoods = request.neighborhoods.map((name) => {
    const items = selected.filter((d) => d.block.neighborhood === name);
    return {
      name,
      blocks: items.length,
      averageIvtu: round(mean(items.map((d) => d.diagnostics.ivtu.score)), 1),
      averageUtciPeak: round(mean(items.map((d) => d.diagnostics.utciPeak)), 1),
      criticalBlocks: items.filter((d) => d.diagnostics.ivtu.level === "critico").length,
    };
  });

  const interventions = INTERVENTION_TYPES.map((type) => {
    const withType = selected
      .map((d) => d.diagnostics.prescription.recommendations.find((r) => r.type === type))
      .filter((r) => r !== undefined);
    return {
      type,
      label: INTERVENTION_LABELS[type],
      blocks: withType.length,
      tactical: withType.filter((r) => r.level === "tatico").length,
      structural: withType.filter((r) => r.level === "estruturante").length,
    };
  }).filter((i) => i.blocks > 0);

  const scenarios = (await repos.scenarios.list(municipality.id)).filter((s) =>
    request.scenarioIds.includes(s.id),
  );

  let checklistsStarted = 0;
  let checklistsCompleted = 0;
  for (const d of selected) {
    const checklist = await repos.checklists.get(d.block.id);
    if (!checklist) continue;
    checklistsStarted += 1;
    const applicable = checklistFor(d.diagnostics.prescription.recommendations.map((r) => r.type));
    if (checklistProgress(checklist, applicable) === 1) checklistsCompleted += 1;
  }

  const kpis = [
    { label: "Quarteirões analisados", value: formatInteger(selected.length) },
    {
      label: "Em nível alto ou crítico",
      value: formatInteger(exposed.length),
      hint: formatPercent(selected.length ? exposed.length / selected.length : 0),
    },
    { label: "Sensação térmica média no pico", value: `${formatDecimal(averageUtciPeak)} °C` },
    {
      label: "Moradores expostos",
      value: formatInteger(populationAffected),
      hint: `${formatInteger(elderlyAffected)} idosos 65+`,
    },
    {
      label: "Cobertura arbórea média",
      value: formatPercent(averageCanopy),
      hint: "Referência: 30%",
    },
  ];

  return {
    id: `rel-${crypto.randomUUID().slice(0, 8)}`,
    generatedAt: new Date().toISOString(),
    title: request.projectName,
    program,
    municipality: {
      id: municipality.id,
      name: municipality.name,
      state: municipality.state,
      population: municipality.population,
    },
    request,
    diagnosis: {
      blocksAnalyzed: selected.length,
      levelCounts,
      averageUtciPeak,
      averageLst,
      averageCanopy,
      populationAffected,
      elderlyAffected,
      kpis,
      priorityBlocks: [...selected]
        .sort((a, b) => b.diagnostics.ivtu.score - a.diagnostics.ivtu.score)
        .slice(0, 10)
        .map((d) => toRankingRow(d, rankOf.get(d.block.id) ?? 0)),
      neighborhoods,
    },
    epidemiology: EPIDEMIOLOGY,
    interventions,
    socioeconomic: SOCIOECONOMIC,
    scenarios,
    fieldValidation: { checklistsStarted, checklistsCompleted },
    notices: [
      "Dados demonstrativos: esta versão usa dados sintéticos para ilustrar o funcionamento da plataforma.",
      "Estimativas a validar no piloto.",
      "O sistema indica apenas locais potenciais; toda indicação exige validação em campo.",
      "Confira os requisitos formais no regulamento vigente do edital antes da submissão.",
    ],
    seal: LEGAL_SEAL,
  };
}
