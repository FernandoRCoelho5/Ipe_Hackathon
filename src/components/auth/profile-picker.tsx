import { ArrowRight, Check, Lock } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import {
  canAccessRoute,
  permissionsOf,
  PERMISSION_LABELS,
  ROLES,
  type RoleId,
} from "@/domain/access/access";
import { navItems } from "@/lib/config/navigation";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/i18n";
import { signInAs } from "@/server/auth/actions";
import { ROLE_ICONS } from "./role-icon";

interface ProfilePickerProps {
  /** Para onde voltar depois de entrar (já validado como caminho interno). */
  returnTo: string;
  /** Restringe os perfis exibidos (ex.: só os que acessam a tela pedida). */
  roles?: readonly RoleId[];
  className?: string;
}

function screensSummary(role: RoleId): string {
  const blocked = navItems.filter((item) => !canAccessRoute(role, item.href));
  if (blocked.length === 0) return messages.auth.allScreens;
  return messages.auth.screensExcept(blocked.map((item) => item.label).join(" e "));
}

/**
 * Cartões de escolha de perfil (RF08). Cada cartão é um formulário com Server Action:
 * funciona sem JavaScript e devolve o usuário à tela de origem.
 */
export function ProfilePicker({ returnTo, roles, className }: ProfilePickerProps) {
  const t = messages.auth;
  const options = roles ? ROLES.filter((role) => roles.includes(role.id)) : ROLES;

  return (
    <ul className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {options.map((role) => {
        const Icon = ROLE_ICONS[role.id];
        const permissions = permissionsOf(role.id);
        return (
          <li key={role.id}>
            <form
              action={signInAs}
              className="flex h-full flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-strong"
            >
              <input type="hidden" name="role" value={role.id} />
              <input type="hidden" name="proximo" value={returnTo} />
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon aria-hidden className="size-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-semibold text-fg">{role.label}</h2>
                  <p className="text-sm text-fg-muted">{role.audience}</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 text-sm">
                <p className="text-xs font-medium text-fg-subtle">{screensSummary(role.id)}</p>
                {permissions.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {permissions.map((permission) => (
                      <li key={permission} className="flex items-start gap-2 text-fg">
                        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                        {PERMISSION_LABELS[permission]}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="flex items-start gap-2 text-fg-muted">
                    <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
                    {t.readOnly}
                  </p>
                )}
              </div>
              <button type="submit" className={buttonStyles()}>
                {t.enterAs(role.label)}
                <ArrowRight aria-hidden />
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
