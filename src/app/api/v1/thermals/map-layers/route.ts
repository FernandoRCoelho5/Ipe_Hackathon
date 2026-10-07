import { mapLayersQuerySchema } from "@/lib/api/contracts";
import { CACHE, json, parseQuery, withApi } from "@/server/http/handler";
import { buildMapLayers } from "@/server/services/thermal-layers";

/**
 * GET /api/v1/thermals/map-layers?municipality=&hour=
 * GeoJSON dos quarteirões com LST, UTCI na hora pedida, IVTU e ação recomendada.
 */
export const GET = withApi(async (request) => {
  const { municipality, hour } = parseQuery(request, mapLayersQuerySchema);
  return json(await buildMapLayers(municipality, hour), { cache: CACHE.short });
});
