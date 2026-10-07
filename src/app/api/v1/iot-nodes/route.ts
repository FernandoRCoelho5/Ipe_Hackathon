import { z } from "zod";
import { json, parseQuery, withApi } from "@/server/http/handler";
import { listIotNodes } from "@/server/services/engagement";

const querySchema = z.object({ municipality: z.string().optional() });

/** GET /api/v1/iot-nodes — nós de calibração com status, última leitura e sparkline 24 h. */
export const GET = withApi(async (request) => {
  const { municipality } = parseQuery(request, querySchema);
  return json({ data: await listIotNodes(municipality) });
});
