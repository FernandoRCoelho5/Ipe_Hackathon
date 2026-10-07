/**
 * Logger estruturado e leve.
 * No servidor emite uma linha JSON por evento (pronta para agregadores de log);
 * no navegador só escreve em desenvolvimento, para não poluir o console em produção.
 */

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const isServer = typeof window === "undefined";
const isProduction = process.env.NODE_ENV === "production";

function serializeError(error: unknown): Fields {
  if (error instanceof Error) {
    const digest = (error as Error & { digest?: string }).digest;
    return { name: error.name, message: error.message, ...(digest ? { digest } : {}) };
  }
  return { message: String(error) };
}

const isTest = process.env.NODE_ENV === "test";

function emit(level: Level, message: string, fields: Fields = {}) {
  if (level === "debug" && isProduction) return;
  // Nos testes, só avisos e erros (o log de cada requisição poluiria a saída).
  if (isTest && (level === "debug" || level === "info")) return;
  const payload = { level, message, time: new Date().toISOString(), ...fields };

  if (isServer) {
    const line = JSON.stringify(payload);
    if (level === "error" || level === "warn") process.stderr.write(`${line}\n`);
    else process.stdout.write(`${line}\n`);
    return;
  }

  if (!isProduction) {
    const method = level === "debug" ? "debug" : level;
    console[method](`[ipê] ${message}`, fields);
  }
}

export const logger = {
  debug: (message: string, fields?: Fields) => emit("debug", message, fields),
  info: (message: string, fields?: Fields) => emit("info", message, fields),
  warn: (message: string, fields?: Fields) => emit("warn", message, fields),
  error: (message: string, error?: unknown, fields?: Fields) =>
    emit("error", message, {
      ...fields,
      ...(error !== undefined ? { error: serializeError(error) } : {}),
    }),
};
