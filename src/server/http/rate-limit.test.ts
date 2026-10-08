import { describe, expect, it } from "vitest";
import { checkRateLimit, createRateLimitPolicy } from "./rate-limit";

describe("política de rate limit", () => {
  it("recusas por IP não consomem o teto da rota", () => {
    const policy = createRateLimitPolicy({ perClient: 2, perRoute: 3 });
    const results = Array.from({ length: 5 }, () =>
      checkRateLimit(policy, "10.0.0.1", "POST:/x", 0),
    );
    expect(results.map((r) => r.allowed)).toEqual([true, true, false, false, false]);
    // Outro cliente ainda tem o teto da rota disponível (só 2 dos 3 foram usados).
    expect(checkRateLimit(policy, "10.0.0.2", "POST:/x", 0).allowed).toBe(true);
    expect(checkRateLimit(policy, "10.0.0.3", "POST:/x", 0).allowed).toBe(false);
  });

  it("o teto vale por rota, não para a API inteira", () => {
    const policy = createRateLimitPolicy({ perClient: 5, perRoute: 1 });
    expect(checkRateLimit(policy, "a", "POST:/x", 0).allowed).toBe(true);
    expect(checkRateLimit(policy, "b", "POST:/x", 0).allowed).toBe(false);
    expect(checkRateLimit(policy, "b", "POST:/y", 0).allowed).toBe(true);
  });
});
