import { whatIfRequestSchema } from "@/lib/api/contracts";
import { computePolicy, json, parseJson, withApi } from "@/server/http/handler";
import { runWhatIf } from "@/server/services/simulation";

/** POST /api/v1/simulation/what-if — simula intervenções num quarteirão. */
export const POST = withApi(
  async (request) => {
    const scenario = await parseJson(request, whatIfRequestSchema);
    return json(await runWhatIf(scenario));
  },
  { rateLimit: computePolicy },
);
