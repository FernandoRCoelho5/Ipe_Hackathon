import { reportRequestSchema } from "@/lib/api/contracts";
import { json, parseJson, requirePermission, withApi } from "@/server/http/handler";
import { buildReportDocument, getFundingProgram } from "@/server/services/reports";

/**
 * POST /api/v1/reports/preview — monta o relatório estruturado para o edital escolhido
 * (base da pré-visualização e das exportações PDF/DOCX).
 * Editais de recurso público exigem um perfil municipal; o B2B gera o relatório ESG.
 */
export const POST = withApi(
  async (request, _context, { session }) => {
    const input = await parseJson(request, reportRequestSchema);
    if (getFundingProgram(input.programId).audience === "publico") {
      requirePermission(session, "report:public-funding");
    }
    return json(await buildReportDocument(input));
  },
  { permission: "report:generate" },
);
