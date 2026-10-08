/**
 * Rate limit de janela fixa, em memória, por chave (IP + rota).
 * Suficiente para a demo e para uma instância; em produção com várias instâncias,
 * trocar por Redis ou pelo limitador do gateway mantendo esta interface.
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Segundos até a janela reiniciar. */
  resetSeconds: number;
}

export interface RateLimiter {
  check(key: string, now?: number): RateLimitResult;
}

export function createRateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}): RateLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key, now = Date.now()) {
      let window = windows.get(key);
      if (!window || window.resetAt <= now) {
        window = { count: 0, resetAt: now + windowMs };
        windows.set(key, window);
        // Limpeza oportunista para o mapa não crescer sem limite.
        if (windows.size > 10_000) {
          for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
        }
      }
      window.count += 1;
      return {
        allowed: window.count <= limit,
        limit,
        remaining: Math.max(0, limit - window.count),
        resetSeconds: Math.ceil((window.resetAt - now) / 1000),
      };
    },
  };
}

/** IP do cliente a partir dos cabeçalhos do proxy reverso. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

/**
 * Política de limite de uma rota: um balde por cliente e um teto global da rota.
 * O IP vem de cabeçalhos que o cliente pode forjar quando não há proxy confiável;
 * o teto global garante que forjar `X-Forwarded-For` não multiplica o volume aceito.
 */
export interface RateLimitPolicy {
  perClient: RateLimiter;
  perRoute: RateLimiter;
}

export function createRateLimitPolicy({
  perClient,
  perRoute,
  windowMs = 60_000,
}: {
  perClient: number;
  perRoute: number;
  windowMs?: number;
}): RateLimitPolicy {
  return {
    perClient: createRateLimiter({ limit: perClient, windowMs }),
    perRoute: createRateLimiter({ limit: perRoute, windowMs }),
  };
}

/**
 * Confere o balde do cliente e, só se ele aceitar, o teto da rota: requisições já
 * recusadas por IP não consomem o teto, então um cliente sozinho não o esgota.
 * O teto é uma proteção de capacidade; atrás de um proxy reverso que reescreve
 * `X-Forwarded-For`, o limite por IP é confiável (ver ADR-025).
 */
export function checkRateLimit(
  policy: RateLimitPolicy,
  client: string,
  route: string,
  now?: number,
): RateLimitResult {
  const clientResult = policy.perClient.check(`${client}:${route}`, now);
  if (!clientResult.allowed) return clientResult;
  return policy.perRoute.check(route, now);
}
