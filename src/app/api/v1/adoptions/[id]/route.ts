import { json, withApi } from "@/server/http/handler";
import { getAdoption } from "@/server/services/engagement";

type Context = { params: Promise<{ id: string }> };

/** GET /api/v1/adoptions/{id} */
export const GET = withApi<Context>(async (_request, { params }) => {
  const { id } = await params;
  return json(await getAdoption(id));
});
