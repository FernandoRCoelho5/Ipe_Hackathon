import { CACHE, json, withApi } from "@/server/http/handler";
import { FUNDING_PROGRAMS } from "@/server/services/reports";

/** GET /api/v1/reports/programs — editais e relatórios suportados. */
export const GET = withApi(async () => json({ data: FUNDING_PROGRAMS }, { cache: CACHE.short }));
