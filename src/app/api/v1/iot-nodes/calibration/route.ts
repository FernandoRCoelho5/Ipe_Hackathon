import { z } from "zod";
import { json, parseQuery, withApi } from "@/server/http/handler";
import { buildCalibration } from "@/server/services/engagement";

const querySchema = z.object({
  municipality: z.string().optional(),
  hours: z.coerce.number().int().min(1).max(168).default(72),
});

/** GET /api/v1/iot-nodes/calibration — sensor × modelo (viés, RMSE, correlação). */
export const GET = withApi(async (request) => {
  const { municipality, hours } = parseQuery(request, querySchema);
  return json(await buildCalibration(municipality, hours));
});
