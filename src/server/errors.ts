import type { API_ERROR_CODES } from "@/lib/api/contracts";

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Erro com status HTTP e código estável, convertido em resposta padronizada pela API. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class NotFoundError extends HttpError {
  constructor(what: string) {
    super(404, "not_found", `${what} não encontrado`);
    this.name = "NotFoundError";
  }
}
