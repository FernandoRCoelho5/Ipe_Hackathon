import { checklistUpdateSchema } from "@/lib/api/contracts";
import { json, parseJson, withApi } from "@/server/http/handler";
import { getChecklist, updateChecklist } from "@/server/services/simulation";

type Context = { params: Promise<{ id: string }> };

/** GET /api/v1/blocks/{id}/checklist — checklist de validação de campo do quarteirão. */
export const GET = withApi<Context>(async (_request, { params }) => {
  const { id } = await params;
  return json(await getChecklist(id));
});

/** PUT /api/v1/blocks/{id}/checklist — salva o checklist (persistido por quarteirão). */
export const PUT = withApi<Context>(
  async (request, { params }) => {
    const { id } = await params;
    const body = await parseJson(request, checklistUpdateSchema);
    return json(await updateChecklist(id, body));
  },
  { permission: "checklist:edit" },
);
