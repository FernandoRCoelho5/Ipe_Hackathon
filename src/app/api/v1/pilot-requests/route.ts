import { newPilotRequestRequestSchema } from "@/lib/api/contracts";
import { json, parseJson, withApi } from "@/server/http/handler";
import { createRateLimitPolicy } from "@/server/http/rate-limit";
import { getRepositories } from "@/server/repositories";

/** Formulário público: 5 pedidos por minuto por IP e no máximo 60 por minuto no total. */
const pilotRequestPolicy = createRateLimitPolicy({ perClient: 5, perRoute: 60 });

/**
 * POST /api/v1/pilot-requests — pedido de piloto feito na landing (público, sem login).
 * Devolve só o protocolo; o contato informado não é ecoado na resposta.
 */
export const POST = withApi(
  async (request) => {
    const input = await parseJson(request, newPilotRequestRequestSchema);
    return json(await getRepositories().pilotRequests.create(input), { status: 201 });
  },
  { rateLimit: pilotRequestPolicy },
);
