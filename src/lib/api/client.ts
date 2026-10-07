import type { ApiError } from "./contracts";

/**
 * Cliente HTTP da API v1 para o navegador.
 * Erros chegam sempre no formato `ApiError` (ver src/server/http/handler.ts) e viram
 * `ApiClientError`, com mensagem em português pronta para a interface.
 */

export const API_BASE = "/api/v1";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ApiError["error"]["code"] | "network";
  readonly requestId?: string;
  readonly details?: ApiError["error"]["details"];

  constructor(
    status: number,
    code: ApiClientError["code"],
    message: string,
    extra: { requestId?: string; details?: ApiError["error"]["details"] } = {},
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.requestId = extra.requestId;
    this.details = extra.details;
  }
}

export type QueryParams = Record<string, string | number | boolean | readonly string[] | undefined>;

/** Monta a query string ignorando vazios; listas viram CSV (`?zones=a,b`). */
export function toSearchParams(params: QueryParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) search.set(key, value.join(","));
    } else {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function isApiError(body: unknown): body is ApiError {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as ApiError).error?.message === "string"
  );
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError(
      0,
      "network",
      "Sem conexão com o servidor. Verifique a rede e tente novamente.",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isApiError(body)) {
      throw new ApiClientError(response.status, body.error.code, body.error.message, {
        requestId: body.error.requestId,
        details: body.error.details,
      });
    }
    throw new ApiClientError(response.status, "internal", "Erro inesperado na API.");
  }
  return body as T;
}

function withJson(method: string, body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    signal,
  };
}

export const apiClient = {
  get<T>(path: string, params?: QueryParams, signal?: AbortSignal) {
    return request<T>(`${path}${toSearchParams(params)}`, { signal });
  },
  post<T>(path: string, body: unknown, signal?: AbortSignal) {
    return request<T>(path, withJson("POST", body, signal));
  },
  put<T>(path: string, body: unknown) {
    return request<T>(path, withJson("PUT", body));
  },
  patch<T>(path: string, body: unknown) {
    return request<T>(path, withJson("PATCH", body));
  },
};
