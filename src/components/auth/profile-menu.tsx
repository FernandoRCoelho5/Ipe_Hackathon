"use client";

import { Check, ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, type FormEvent } from "react";
import { can, permissionsOf, PERMISSION_LABELS, ROLES } from "@/domain/access/access";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/i18n";
import { signInAs, signOut } from "@/server/auth/actions";
import { ROLE_ICONS } from "./role-icon";
import { useSession } from "./use-session";

/**
 * Menu do perfil no cabeçalho (RF08): mostra o perfil ativo e o que ele pode fazer, e
 * troca de perfil na demonstração. Popover API nativa (Esc, clique fora, top layer).
 * Trocar de perfil é uma Server Action: o cookie muda e a tela volta já com o novo perfil.
 */
export function ProfileMenu() {
  const t = messages.auth;
  const { ready, role } = useSession();
  const pathname = usePathname();
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = `profile-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  if (!ready || !role) {
    return (
      <span
        role="status"
        aria-label={t.loading}
        className="hidden h-9 w-40 animate-pulse rounded-full bg-surface-sunken md:block"
      />
    );
  }

  const Icon = ROLE_ICONS[role.id];
  const permissions = permissionsOf(role.id);

  /** Volta para a tela atual (com a query string) depois de trocar de perfil. */
  function rememberLocation(event: FormEvent<HTMLFormElement>) {
    const field = event.currentTarget.elements.namedItem("proximo");
    if (field instanceof HTMLInputElement) {
      field.value = `${window.location.pathname}${window.location.search}`;
    }
    popoverRef.current?.hidePopover();
  }

  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        aria-label={t.menuLabel(role.label)}
        data-tour="profile-menu"
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface p-1 text-sm font-medium text-fg transition-colors hover:border-line-strong hover:bg-surface-muted sm:pr-2.5"
      >
        <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-accent">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="hidden max-w-44 truncate lg:inline">{role.shortLabel}</span>
        <ChevronDown aria-hidden className="hidden size-4 text-fg-muted sm:block" />
      </button>

      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        role="dialog"
        aria-labelledby={`${popoverId}-title`}
        className="fixed inset-auto top-20 right-4 m-0 max-h-[calc(100dvh-6rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-card border border-line bg-surface p-0 text-fg shadow-pop"
      >
        <section className="flex flex-col gap-3 p-5">
          <p
            id={`${popoverId}-title`}
            className="text-xs font-medium tracking-[0.16em] text-fg-muted uppercase"
          >
            {t.menuTitle}
          </p>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <Icon aria-hidden className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="font-semibold">{role.label}</p>
              <p className="text-sm text-fg-muted">{role.audience}</p>
            </div>
          </div>
          {permissions.length > 0 ? (
            <ul className="flex flex-col gap-1.5 text-sm">
              {permissions.map((permission) => (
                <li key={permission} className="flex items-start gap-2">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                  {PERMISSION_LABELS[permission]}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-control bg-surface-muted px-3 py-2 text-sm text-fg-muted">
              {t.readOnly}
            </p>
          )}
          {can(role.id, "access:manage") && (
            <Link
              href="/acessos"
              onClick={() => popoverRef.current?.hidePopover()}
              className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              <ShieldCheck aria-hidden className="size-4" />
              {t.manage}
            </Link>
          )}
        </section>

        <section className="flex flex-col gap-2 border-t border-line p-5">
          <p className="text-xs font-medium tracking-[0.16em] text-fg-muted uppercase">
            {t.switchTitle}
          </p>
          <ul className="flex flex-col gap-1">
            {ROLES.map((option) => {
              const OptionIcon = ROLE_ICONS[option.id];
              const current = option.id === role.id;
              return (
                <li key={option.id}>
                  <form action={signInAs} onSubmit={rememberLocation}>
                    <input type="hidden" name="role" value={option.id} />
                    <input type="hidden" name="proximo" defaultValue={pathname} />
                    <button
                      type="submit"
                      disabled={current}
                      aria-current={current ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-sm transition-colors",
                        current
                          ? "bg-accent-soft font-semibold text-fg"
                          : "text-fg hover:bg-surface-muted",
                      )}
                    >
                      <OptionIcon aria-hidden className="size-4 shrink-0 text-accent" />
                      <span className="flex-1">{option.label}</span>
                      {current && (
                        <span className="text-xs font-medium text-fg-muted">{t.current}</span>
                      )}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>

        <form action={signOut} className="border-t border-line p-3">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <LogOut aria-hidden className="size-4" />
            {t.signOut}
          </button>
        </form>
      </div>
    </>
  );
}
