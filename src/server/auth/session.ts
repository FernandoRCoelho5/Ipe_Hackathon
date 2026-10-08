import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { RoleId } from "@/domain/access/access";
import { logger } from "@/lib/logger";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  type SessionPayload,
} from "./session-token";

export { SESSION_COOKIE };

/**
 * Sessão de demonstração no servidor: segredo, leitura do cookie e emissão.
 * O que a interface recebe é só o perfil (`Session`), nunca o token.
 */

export interface Session {
  role: RoleId;
}

/**
 * Segredo usado só fora de produção. A demo já permite escolher qualquer perfil, então
 * forjar o cookie não daria acesso extra; mesmo assim, produção deve definir SESSION_SECRET
 * (o docker-compose define), e o piloto troca este mecanismo por OIDC.
 */
const DEVELOPMENT_SECRET = "ipe-sessao-de-demonstracao-somente-desenvolvimento";
let warned = false;

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production" && !warned) {
    warned = true;
    logger.warn(
      "SESSION_SECRET ausente ou com menos de 32 caracteres; usando segredo de demonstração",
    );
  }
  return DEVELOPMENT_SECRET;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
} as const;

/** Lê o cookie de um `Request` cru (Route Handlers e testes). */
function cookieFromHeader(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

export async function getSessionFromRequest(request: Request): Promise<SessionPayload | null> {
  const token = cookieFromHeader(request.headers.get("cookie"), SESSION_COOKIE);
  return verifySession(token, getSessionSecret());
}

/** Sessão da requisição atual (Server Components e Server Actions). */
export async function getSession(): Promise<Session | null> {
  // A validade depende do relógio (expiração): leitura sempre por requisição.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token, getSessionSecret());
  return payload ? { role: payload.role } : null;
}

export async function issueSessionToken(role: RoleId): Promise<string> {
  return (await signSession(role, getSessionSecret())).token;
}
