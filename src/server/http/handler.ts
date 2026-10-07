import "server-only";
import { z } from "zod";
import type { ApiError } from "@/lib/api/contracts";
import { logger } from "@/lib/logger";
import { HttpError } from "@/server/errors";
import { clientKey, createRateLimiter, type RateLimiter } from "./rate-limit";

/**
 * Infraestrutura comum dos Route Handlers da API v1:
 * request id, log estruturado, erros padronizados (`ApiError`), rate limit de escrita,
 * leitura segura de JSON e de query string validadas por Zod.
 */

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_BODY_BYTES = 64 * 1024;

/** 30 escritas por minuto por IP e rota. */
const writeLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

/**
 * POSTs de cálculo puro (simulação what-if, ESG) não gravam nada e são disparados
 * pelos controles deslizantes do simulador: limite mais folgado, ainda por IP e rota.
 */
export const computeRateLimiter = createRateLimiter({ limit: 240, windowMs: 60_000 });

export const CACHE = {
  none: "no-store",
  /** Dados demonstrativos mudam no máximo por hora; privado porque a API terá sessão. */
  short: "private, max-age=60, stale-while-revalidate=300",
} as const;

interface HandlerTools {
  requestId: string;
}

type RouteHandler<Ctx> = (request: Request, context: Ctx, tools: HandlerTools) => Promise<Response>;

interface ApiOptions {
  rateLimiter?: RateLimiter;
}

function errorResponse(
  status: number,
  code: ApiError["error"]["code"],
  message: string,
  requestId: string,
  details?: ApiError["error"]["details"],
  headers?: HeadersInit,
): Response {
  const body: ApiError = { error: { code, message, requestId, ...(details ? { details } : {}) } };
  return Response.json(body, { status, headers: { "Cache-Control": CACHE.none, ...headers } });
}

function zodDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "(raiz)",
    message: issue.message,
  }));
}

export function withApi<Ctx = unknown>(handler: RouteHandler<Ctx>, options: ApiOptions = {}) {
  return async (request: Request, context: Ctx): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const started = performance.now();
    const { pathname } = new URL(request.url);
    let response: Response;

    try {
      if (WRITE_METHODS.has(request.method)) {
        const limiter = options.rateLimiter ?? writeLimiter;
        const result = limiter.check(`${clientKey(request)}:${request.method}:${pathname}`);
        if (!result.allowed) {
          response = errorResponse(
            429,
            "rate_limited",
            "Muitas requisições. Aguarde alguns segundos e tente novamente.",
            requestId,
            undefined,
            { "Retry-After": String(result.resetSeconds) },
          );
          return finish(response);
        }
      }
      response = await handler(request, context, { requestId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        response = errorResponse(
          400,
          "bad_request",
          "Parâmetros inválidos",
          requestId,
          zodDetails(error),
        );
      } else if (error instanceof HttpError) {
        response = errorResponse(error.status, error.code, error.message, requestId, error.details);
      } else {
        logger.error("Erro não tratado na API", error, { requestId, path: pathname });
        response = errorResponse(
          500,
          "internal",
          "Erro interno. Tente novamente em instantes.",
          requestId,
        );
      }
    }
    return finish(response);

    function finish(original: Response): Response {
      const res = compress(original, request);
      res.headers.set("X-Request-Id", requestId);
      logger.info("api", {
        requestId,
        method: request.method,
        path: pathname,
        status: res.status,
        durationMs: Math.round(performance.now() - started),
      });
      return res;
    }
  };
}

/**
 * Comprime respostas JSON com gzip quando o cliente aceita.
 * O Next.js comprime páginas, mas não as respostas de Route Handlers; as camadas do
 * mapa (~400 KB) caem para ~15% do tamanho.
 */
function compress(response: Response, request: Request): Response {
  const accepts = request.headers.get("accept-encoding") ?? "";
  const isJson = response.headers.get("content-type")?.includes("application/json");
  if (
    !response.body ||
    !isJson ||
    !/\bgzip\b/.test(accepts) ||
    response.headers.has("content-encoding")
  ) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set("Content-Encoding", "gzip");
  headers.append("Vary", "Accept-Encoding");
  headers.delete("Content-Length");
  return new Response(response.body.pipeThrough(new CompressionStream("gzip")), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Lê e valida a query string. Parâmetros vazios são ignorados. */
export function parseQuery<T extends z.ZodType>(request: Request, schema: T): z.output<T> {
  const params = new URL(request.url).searchParams;
  const raw = Object.fromEntries([...params.entries()].filter(([, value]) => value !== ""));
  return schema.parse(raw);
}

/** Lê o corpo JSON com limite de tamanho e valida pelo schema. */
export async function parseJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.output<T>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "unsupported_media_type", "Envie o corpo como application/json");
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    throw new HttpError(413, "payload_too_large", "Corpo da requisição acima de 64 KB");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "payload_too_large", "Corpo da requisição acima de 64 KB");
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, "bad_request", "JSON malformado");
  }
  return schema.parse(body);
}

export function json<T>(data: T, init: { status?: number; cache?: string } = {}): Response {
  return Response.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": init.cache ?? CACHE.none },
  });
}
