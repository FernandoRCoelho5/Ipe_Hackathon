import { SessionBridge } from "@/components/auth/session-bridge";
import { getSession } from "@/server/auth/session";

/**
 * Lê a sessão no servidor e entrega só o perfil ao cliente.
 * Fica em `<Suspense>` no layout: a leitura do cookie acontece por requisição, enquanto
 * o restante da tela continua pré-renderizado (ver guia authentication-with-cache-components).
 */
export async function SessionLoader() {
  const session = await getSession();
  return <SessionBridge role={session?.role ?? null} />;
}
