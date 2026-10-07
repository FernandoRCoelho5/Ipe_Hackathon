import { municipalityQuerySchema } from "@/lib/api/contracts";
import { CACHE, json, parseQuery, withApi } from "@/server/http/handler";
import { buildUtciByHour } from "@/server/services/thermal-layers";

/**
 * GET /api/v1/thermals/utci-by-hour?municipality=
 * UTCI de todos os quarteirões de 08h a 18h: o slider de horário funciona sem novas requisições.
 */
export const GET = withApi(async (request) => {
  const { municipality } = parseQuery(request, municipalityQuerySchema);
  return json(await buildUtciByHour(municipality), { cache: CACHE.short });
});
