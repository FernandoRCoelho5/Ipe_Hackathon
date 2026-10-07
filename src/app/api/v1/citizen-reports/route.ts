import { citizenReportQuerySchema, newCitizenReportRequestSchema } from "@/lib/api/contracts";
import { json, parseJson, parseQuery, withApi } from "@/server/http/handler";
import { createCitizenReport, listCitizenReports } from "@/server/services/engagement";

/** GET /api/v1/citizen-reports — relatos anônimos com filtros e contagem por status. */
export const GET = withApi(async (request) => {
  const q = parseQuery(request, citizenReportQuerySchema);
  return json(
    await listCitizenReports({
      municipalityId: q.municipality,
      statuses: q.statuses,
      categories: q.categories,
      since: q.since,
      page: q.page,
      pageSize: q.pageSize,
    }),
  );
});

/** POST /api/v1/citizen-reports — novo relato (apenas texto, coordenadas e categoria). */
export const POST = withApi(async (request) => {
  const input = await parseJson(request, newCitizenReportRequestSchema);
  return json(await createCitizenReport(input), { status: 201 });
});
