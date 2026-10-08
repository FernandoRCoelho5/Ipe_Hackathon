// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { PLATFORM_ROUTES, type RoleId } from "@/domain/access/access";
import { config, proxy } from "./proxy";
import { getSessionSecret } from "./server/auth/session";
import { SESSION_COOKIE, signSession, verifySession } from "./server/auth/session-token";

async function request(path: string, role?: RoleId, extra: Record<string, string> = {}) {
  const headers = new Headers(extra);
  if (role) {
    const { token } = await signSession(role, getSessionSecret());
    headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  }
  return proxy(new NextRequest(`http://localhost${path}`, { headers }));
}

describe("proxy das telas (RF08)", () => {
  it.each([
    ["next-router-prefetch", "1"],
    ["next-router-segment-prefetch", "/_tree"],
    ["sec-purpose", "prefetch;prerender"],
  ])("prefetch de ?demo=1 não troca o perfil (%s)", async (name, value) => {
    const response = await request("/mapa?demo=1", "leitor-publico", { [name]: value });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("location")).toBeNull();
  });

  it("o matcher cobre exatamente as rotas da plataforma", () => {
    expect(config.matcher).toEqual(PLATFORM_ROUTES.map((route) => `${route}/:path*`));
  });

  it("sem sessão, leva à escolha de perfil preservando o destino", async () => {
    const response = await request("/simulador?bloco=vr-0001");
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/entrar");
    expect(location.searchParams.get("proximo")).toBe("/simulador?bloco=vr-0001");
  });

  it("perfil sem permissão para a rota vai para acesso restrito", async () => {
    const response = await request("/relatorios", "leitor-publico");
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/acesso-restrito");
    expect(location.searchParams.get("rota")).toBe("/relatorios");
  });

  it("perfil com permissão segue para a tela", async () => {
    const response = await request("/relatorios", "cliente-corporativo");
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("?demo=1 entra como Administrador Municipal, mesmo vindo de outro perfil", async () => {
    const response = await request("/mapa?demo=1", "leitor-publico");
    expect(response.headers.get("location")).toBeNull();
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie.toLowerCase()).toContain("httponly");
    const token = /ipe_session=([^;]+)/.exec(cookie)?.[1];
    expect((await verifySession(token, getSessionSecret()))?.role).toBe("admin-municipal");
  });
});
