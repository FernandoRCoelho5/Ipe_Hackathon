import type { SavedScenario } from "@/domain/simulation/saved-scenario";
import type { RankingRow } from "@/lib/api/contracts";
import type { ReportFormValues } from "./report-form";

interface ReportExampleInput {
  municipalityId: string;
  /** Linhas do topo do ranking IVTU (mais vulneráveis primeiro). */
  topRows: readonly Pick<RankingRow, "neighborhood">[];
  scenarios: readonly Pick<SavedScenario, "id">[];
  /** Se o perfil pode gerar relatórios de editais públicos (senão, o ESG corporativo). */
  publicFunding: boolean;
}

/**
 * Exemplo pronto para a demonstração (botão "Preencher com exemplo" e tour):
 * os três bairros mais vulneráveis e até três cenários salvos do município.
 */
export function buildReportExample({
  municipalityId,
  topRows,
  scenarios,
  publicFunding,
}: ReportExampleInput): ReportFormValues {
  const neighborhoods = [...new Set(topRows.map((row) => row.neighborhood))].slice(0, 3);
  const scenarioIds = scenarios.slice(0, 3).map((s) => s.id);
  return publicFunding
    ? {
        programId: "fundo-clima",
        municipalityId,
        projectName: "Corredores de sombra nos bairros mais vulneráveis",
        department: "Secretaria Municipal de Meio Ambiente",
        estimatedBudget: 1_250_000,
        neighborhoods,
        scenarioIds,
      }
    : {
        programId: "esg-corporativo",
        municipalityId,
        projectName: "Conforto térmico no entorno da unidade",
        department: "Diretoria de Sustentabilidade",
        estimatedBudget: 480_000,
        neighborhoods,
        scenarioIds,
      };
}
