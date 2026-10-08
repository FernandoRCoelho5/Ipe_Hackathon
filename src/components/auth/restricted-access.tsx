"use client";

import { ArrowLeft, Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import {
  canAccessRoute,
  permissionPhrase,
  ROLE_IDS,
  routePermission,
} from "@/domain/access/access";
import { isNavItemActive, navItems } from "@/lib/config/navigation";
import { messages } from "@/lib/i18n";
import { ProfilePicker } from "./profile-picker";
import { useSession } from "./use-session";

/**
 * Explica por que a tela foi barrada e, na demonstração, oferece os perfis que a acessam
 * (a escolha devolve o usuário direto para a tela pedida).
 */
export function RestrictedAccess({ route }: { route: string }) {
  const t = messages.auth;
  const { role } = useSession();
  const screen = navItems.find((item) => isNavItemActive(item, route));
  const permission = routePermission(route);
  const allowedRoles = ROLE_IDS.filter((id) => canAccessRoute(id, route));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-3xl flex-col gap-3 border-b border-line pb-6">
        <p className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-fg-muted uppercase">
          <Lock aria-hidden className="size-4 text-highlight-ink" />
          {t.restrictedEyebrow}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">
          {screen ? t.restrictedTitle(screen.label) : t.restrictedFallback}
        </h1>
        {role && permission && (
          <p className="text-base leading-relaxed text-fg-muted">
            {t.restrictedLead(role.label, permissionPhrase(permission))}
          </p>
        )}
        <ButtonLink href="/mapa" variant="ghost" size="sm" className="self-start">
          <ArrowLeft aria-hidden />
          {t.backToMap}
        </ButtonLink>
      </header>
      {screen && <ProfilePicker returnTo={screen.href} roles={allowedRoles} />}
    </div>
  );
}
