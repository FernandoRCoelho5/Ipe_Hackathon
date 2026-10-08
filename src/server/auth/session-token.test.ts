// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, signSession, verifySession } from "./session-token";

const SECRET = "segredo-de-teste-com-mais-de-32-caracteres";
const NOW = Date.UTC(2026, 9, 8, 12);

describe("token da sessão de demonstração", () => {
  it("assina e verifica o perfil", async () => {
    const { token, payload } = await signSession("tecnico", SECRET, NOW);
    expect(token).toMatch(/^[\w-]+\.[\w-]+$/);
    expect(payload.exp - payload.iat).toBe(SESSION_TTL_SECONDS);
    expect(await verifySession(token, SECRET, NOW + 1000)).toEqual(payload);
  });

  it("recusa token expirado", async () => {
    const { token } = await signSession("tecnico", SECRET, NOW);
    expect(await verifySession(token, SECRET, NOW + SESSION_TTL_SECONDS * 1000)).toBeNull();
  });

  it("recusa assinatura de outro segredo", async () => {
    const { token } = await signSession("leitor-publico", SECRET, NOW);
    expect(await verifySession(token, `${SECRET}-outro`, NOW)).toBeNull();
  });

  it("recusa payload adulterado (troca de perfil sem reassinar)", async () => {
    const { token } = await signSession("leitor-publico", SECRET, NOW);
    const [body, signature] = token.split(".");
    const json = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/"))) as object;
    const forged = btoa(JSON.stringify({ ...json, role: "admin-municipal" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifySession(`${forged}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it.each([undefined, null, "", "abc", "a.b.c", "!!.??", `${"a".repeat(2000)}.b`])(
    "recusa entrada malformada %#",
    async (token) => {
      expect(await verifySession(token, SECRET, NOW)).toBeNull();
    },
  );
});
