import { newPilotRequestRequestSchema } from "@/lib/api/contracts";
import { json, parseJson, withApi } from "@/server/http/handler";
import { createRateLimiter } from "@/server/http/rate-limit";
import { getRepositories } from "@/server/repositories";

/** Formulário público: limite baixo por IP para conter spam. */
const pilotRequestLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

/**
 * POST /api/v1/pilot-requests — pedido de piloto feito na landing (público, sem login).
 * Devolve só o protocolo; o contato informado não é ecoado na resposta.
 */
export const POST = withApi(
  async (request) => {
    const input = await parseJson(request, newPilotRequestRequestSchema);
    return json(await getRepositories().pilotRequests.create(input), { status: 201 });
  },
  { rateLimiter: pilotRequestLimiter },
);
