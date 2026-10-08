import { computeEsgImpact } from "@/domain/esg/esg";
import { esgRequestSchema } from "@/lib/api/contracts";
import { computePolicy, json, parseJson, withApi } from "@/server/http/handler";

/** POST /api/v1/esg/impact — retorno ESG (área verde, CO₂, água retida) com premissas. */
export const POST = withApi(
  async (request) => {
    const input = await parseJson(request, esgRequestSchema);
    return json(computeEsgImpact(input));
  },
  { rateLimit: computePolicy },
);
