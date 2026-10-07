import { CACHE, json, withApi } from "@/server/http/handler";
import { buildBlockDetail } from "@/server/services/thermal-layers";

type Context = { params: Promise<{ id: string }> };

/** GET /api/v1/blocks/{id} — diagnóstico completo e curva horária 08h–18h. */
export const GET = withApi<Context>(async (_request, { params }) => {
  const { id } = await params;
  return json(await buildBlockDetail(id), { cache: CACHE.short });
});
