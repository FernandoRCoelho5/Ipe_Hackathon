import { NextResponse, type NextRequest } from "next/server";
import { canAccessRoute } from "@/domain/access/access";
import {
  getSessionSecret,
  issueSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/server/auth/session";
import { verifySession } from "@/server/auth/session-token";

/**
 * Proxy das telas da plataforma (RF08): roda antes de cada página do `matcher`.
 *
 * - `?demo=1` (Modo Apresentação): entra como Administrador Municipal, o perfil que
 *   percorre todas as telas do tour, sem passar pela escolha de perfil;
 * - sem sessão válida → `/entrar?proximo=<rota>`;
 * - perfil sem permissão para a rota → `/acesso-restrito?rota=<rota>`.
 *
 * A API não passa por aqui: cada Route Handler verifica a própria permissão (withApi).
 */
export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  if (searchParams.get("demo") === "1") {
    const token = await issueSessionToken("admin-municipal");
    // Vale já para esta renderização (cabeçalho Cookie da requisição) e para as próximas.
    request.cookies.set(SESSION_COOKIE, token);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  }

  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
    getSessionSecret(),
  );
  if (!session) {
    const url = new URL("/entrar", request.url);
    url.searchParams.set("proximo", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (!canAccessRoute(session.role, pathname)) {
    const url = new URL("/acesso-restrito", request.url);
    url.searchParams.set("rota", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

/** Espelha `PLATFORM_ROUTES` (o matcher precisa ser literal para a análise estática). */
export const config = {
  matcher: [
    "/mapa/:path*",
    "/prescricao/:path*",
    "/simulador/:path*",
    "/relatorios/:path*",
    "/ciencia-cidada/:path*",
    "/adote-ilha-verde/:path*",
    "/acessos/:path*",
    "/acesso-restrito/:path*",
  ],
};
