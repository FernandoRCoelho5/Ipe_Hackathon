import { CACHE, json, withApi } from "@/server/http/handler";
import { getRepositories } from "@/server/repositories";

/** GET /api/v1/municipalities — municípios atendidos (centro, bbox, zoom). */
export const GET = withApi(async () => {
  const data = await getRepositories().municipalities.list();
  return json({ data }, { cache: CACHE.short });
});
