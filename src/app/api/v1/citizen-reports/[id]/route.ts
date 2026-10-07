import { citizenReportStatusUpdateSchema } from "@/lib/api/contracts";
import { json, parseJson, withApi } from "@/server/http/handler";
import { moderateCitizenReport } from "@/server/services/engagement";

type Context = { params: Promise<{ id: string }> };

/** PATCH /api/v1/citizen-reports/{id} — moderação (pendente, validado, descartado, spam). */
export const PATCH = withApi<Context>(async (request, { params }) => {
  const { id } = await params;
  const { status } = await parseJson(request, citizenReportStatusUpdateSchema);
  return json(await moderateCitizenReport(id, status));
});
