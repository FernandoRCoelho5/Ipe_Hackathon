import { z } from "zod";
import { saveScenarioRequestSchema } from "@/lib/api/contracts";
import { json, parseJson, parseQuery, withApi } from "@/server/http/handler";
import { getRepositories } from "@/server/repositories";
import { saveScenario } from "@/server/services/simulation";

const querySchema = z.object({ municipality: z.string().optional() });

/** GET /api/v1/simulation/scenarios?municipality= — cenários de projeto salvos. */
export const GET = withApi(async (request) => {
  const { municipality } = parseQuery(request, querySchema);
  return json({ data: await getRepositories().scenarios.list(municipality) });
});

/** POST /api/v1/simulation/scenarios — salva um cenário (aparece nos relatórios). */
export const POST = withApi(
  async (request) => {
    const body = await parseJson(request, saveScenarioRequestSchema);
    return json(await saveScenario(body), { status: 201 });
  },
  { permission: "scenario:save" },
);
