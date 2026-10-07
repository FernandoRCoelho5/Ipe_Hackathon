import { iotReadingsQuerySchema } from "@/lib/api/contracts";
import { json, parseQuery, withApi } from "@/server/http/handler";
import { listIotReadings } from "@/server/services/engagement";

type Context = { params: Promise<{ id: string }> };

/** GET /api/v1/iot-nodes/{id}/readings?hours= — série horária do nó (até 7 dias). */
export const GET = withApi<Context>(async (request, { params }) => {
  const { id } = await params;
  const { hours } = parseQuery(request, iotReadingsQuerySchema);
  return json({ data: await listIotReadings(id, hours) });
});
