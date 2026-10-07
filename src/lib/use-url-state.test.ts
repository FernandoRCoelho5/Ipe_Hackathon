import { describe, expect, it } from "vitest";
import { patchSearchParams } from "./use-url-state";

describe("patchSearchParams", () => {
  it("define, substitui e remove chaves preservando as demais", () => {
    expect(patchSearchParams("?bloco=vr-1&pagina=2", { pagina: 3, q: "centro" })).toBe(
      "bloco=vr-1&pagina=3&q=centro",
    );
    expect(patchSearchParams("bloco=vr-1&q=x", { q: "", bloco: null })).toBe("");
    expect(patchSearchParams("", { nivel: ["critico", "alto"] })).toBe("nivel=critico%2Calto");
    expect(patchSearchParams("nivel=alto", { nivel: [] })).toBe("");
  });
});
