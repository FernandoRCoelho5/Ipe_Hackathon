import { reportRequestSchema } from "@/lib/api/contracts";
import { json, parseJson, withApi } from "@/server/http/handler";
import { buildReportDocument } from "@/server/services/reports";

/**
 * POST /api/v1/reports/preview — monta o relatório estruturado para o edital escolhido
 * (base da pré-visualização e das exportações PDF/DOCX).
 */
export const POST = withApi(async (request) => {
  const input = await parseJson(request, reportRequestSchema);
  return json(await buildReportDocument(input));
});
