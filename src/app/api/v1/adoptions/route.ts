import { z } from "zod";
import { newAdoptionRequestSchema } from "@/lib/api/contracts";
import { json, parseJson, parseQuery, withApi } from "@/server/http/handler";
import { createAdoption, listAdoptions } from "@/server/services/engagement";

const querySchema = z.object({ municipality: z.string().optional() });

/** GET /api/v1/adoptions — parcerias "Adote uma Ilha Verde" com NDVI, ESG e manutenção. */
export const GET = withApi(async (request) => {
  const { municipality } = parseQuery(request, querySchema);
  return json({ data: await listAdoptions(municipality) });
});

/** POST /api/v1/adoptions — cadastro de nova parceria. */
export const POST = withApi(
  async (request) => {
    const input = await parseJson(request, newAdoptionRequestSchema);
    return json(await createAdoption(input), { status: 201 });
  },
  { permission: "adoption:create" },
);
