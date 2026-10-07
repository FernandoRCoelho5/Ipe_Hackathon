import { municipalityQuerySchema } from "@/lib/api/contracts";
import { json, parseQuery, withApi } from "@/server/http/handler";
import { getRepositories } from "@/server/repositories";
import { requireMunicipality } from "@/server/services/thermal-layers";

/** GET /api/v1/alerts?municipality= — alertas de calor ativos. */
export const GET = withApi(async (request) => {
  const { municipality } = parseQuery(request, municipalityQuerySchema);
  await requireMunicipality(municipality);
  const data = await getRepositories().alerts.listActive(municipality);
  return json({ data });
});
