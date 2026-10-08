import { Check, KeyRound, Minus, Unlock } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ROLE_ICONS } from "@/components/auth/role-icon";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can, canAccessRoute, PERMISSION_LABELS, PERMISSIONS, ROLES } from "@/domain/access/access";
import { navItems } from "@/lib/config/navigation";
import { messages } from "@/lib/i18n";

const t = messages.access;
const nav = messages.nav.items.access;

export const metadata: Metadata = { title: nav.label, description: nav.description };

function Cell({ allowed }: { allowed: boolean }) {
  return (
    <td className="px-3 py-2.5 text-center">
      {allowed ? (
        <Check aria-hidden className="mx-auto size-4 text-accent" />
      ) : (
        <Minus aria-hidden className="mx-auto size-4 text-fg-subtle" />
      )}
      <span className="sr-only">{allowed ? t.allowed : t.notAllowed}</span>
    </td>
  );
}

function GroupRow({ children }: { children: ReactNode }) {
  return (
    <tr className="bg-surface-muted">
      <th
        scope="colgroup"
        colSpan={ROLES.length + 1}
        className="px-4 py-2 text-left text-xs font-semibold tracking-[0.14em] text-fg-muted uppercase"
      >
        {children}
      </th>
    </tr>
  );
}

/**
 * Gestão de acessos (RF08), só para o Administrador Municipal (o proxy barra os demais).
 * Página estática: a matriz vem do domínio, a mesma que protege rotas, API e interface.
 */
export default function Page() {
  return (
    <PageContainer>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <section aria-labelledby="profiles-title" className="flex flex-col gap-4">
        <h2 id="profiles-title" className="text-lg font-semibold text-fg">
          {t.profilesTitle}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ROLES.map((role) => {
            const Icon = ROLE_ICONS[role.id];
            return (
              <li
                key={role.id}
                className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="text-base font-semibold text-fg">{role.label}</h3>
                <p className="text-sm text-fg-muted">{role.audience}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="matrix-title" className="flex flex-col gap-4">
          <h2 id="matrix-title" className="text-lg font-semibold text-fg">
            {t.matrixTitle}
          </h2>
          <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">{t.matrixCaption}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="w-2/5 px-4 py-3 text-left font-semibold text-fg">
                    <span className="sr-only">{t.matrixCaption}</span>
                  </th>
                  {ROLES.map((role) => (
                    <th
                      key={role.id}
                      scope="col"
                      className="px-3 py-3 text-center text-xs font-semibold text-fg"
                    >
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <GroupRow>{t.screensGroup}</GroupRow>
                {navItems.map((item) => (
                  <tr key={item.href}>
                    <th scope="row" className="px-4 py-2.5 text-left font-medium text-fg">
                      {item.label}
                    </th>
                    {ROLES.map((role) => (
                      <Cell key={role.id} allowed={canAccessRoute(role.id, item.href)} />
                    ))}
                  </tr>
                ))}
                <GroupRow>{t.actionsGroup}</GroupRow>
                {PERMISSIONS.map((permission) => (
                  <tr key={permission}>
                    <th scope="row" className="px-4 py-2.5 text-left font-medium text-fg">
                      {PERMISSION_LABELS[permission]}
                    </th>
                    {ROLES.map((role) => (
                      <Cell key={role.id} allowed={can(role.id, permission)} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="flex flex-col gap-4 xl:pt-11">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Unlock aria-hidden className="size-4 text-accent" />
                {t.publicActionsTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 text-sm leading-relaxed text-fg-muted">
              {t.publicActions}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound aria-hidden className="size-4 text-accent" />
                {t.pilotTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 text-sm leading-relaxed text-fg-muted">
              {t.pilot}
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}
