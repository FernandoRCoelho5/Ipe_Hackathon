import { json, withApi } from "@/server/http/handler";

/** GET /api/health — verificação de saúde para orquestradores (Docker, Kubernetes, balanceadores). */
export const GET = withApi(async () =>
  json({
    status: "ok",
    dataSource: process.env.DATA_SOURCE ?? "mock",
    version: process.env.npm_package_version ?? "0.1.0",
  }),
);
