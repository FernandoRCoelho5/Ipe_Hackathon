"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canAccessRoute, roleIdSchema, safeReturnPath } from "@/domain/access/access";
import { issueSessionToken, SESSION_COOKIE, sessionCookieOptions } from "./session";

/**
 * Server Actions da sessão de demonstração (seletor de perfil).
 * Funcionam também sem JavaScript (formulários com `action`). No piloto, `signInAs`
 * dá lugar ao fluxo OIDC; `signOut` continua igual.
 */

/** Entra (ou troca) de perfil e volta ao destino, se o novo perfil puder abri-lo. */
export async function signInAs(formData: FormData): Promise<void> {
  const role = roleIdSchema.parse(formData.get("role"));
  const destination = safeReturnPath(formData.get("proximo"));
  const { pathname } = new URL(destination, "http://ipe.local");

  (await cookies()).set(SESSION_COOKIE, await issueSessionToken(role), sessionCookieOptions);
  redirect(canAccessRoute(role, pathname) ? destination : "/mapa");
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/entrar");
}
