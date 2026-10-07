import { rankingQuerySchema } from "@/lib/api/contracts";
import { CACHE, json, parseQuery, withApi } from "@/server/http/handler";
import { buildRanking } from "@/server/services/thermal-layers";

/**
 * GET /api/v1/prescriptions/ivtu-ranking
 * Ranking IVTU paginado, com filtros por bairro, zona, nível, intervenção e busca.
 */
export const GET = withApi(async (request) => {
  const query = parseQuery(request, rankingQuerySchema);
  return json(await buildRanking(query), { cache: CACHE.short });
});
