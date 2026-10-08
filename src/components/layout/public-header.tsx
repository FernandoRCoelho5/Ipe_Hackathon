import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/button";
import { messages } from "@/lib/i18n";
import { ThemeToggle } from "./theme-toggle";

const t = messages.landing;

/** Âncoras das seções da landing (funcionam também a partir de outras páginas públicas). */
const SECTIONS = [
  { href: "/#problema", label: t.nav.problem },
  { href: "/#solucao", label: t.nav.solution },
  { href: "/#diferenciais", label: t.nav.comparison },
  { href: "/#como-funciona", label: t.nav.how },
  { href: "/#impacto", label: t.nav.impact },
  { href: "/#piloto", label: t.nav.pilot },
] as const;

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div aria-hidden className="h-1 brand-gradient" />
      <div className="mx-auto flex h-17 max-w-360 items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link href="/" aria-label={messages.brand.logoLabel} className="shrink-0 rounded-lg">
          <Logo variant="horizontal" decorative className="block h-14 dark:hidden" />
          <Logo
            variant="horizontal"
            tone="negative"
            decorative
            className="hidden h-14 dark:block"
          />
        </Link>
        <nav aria-label={t.nav.label} className="ml-6 hidden xl:block">
          <ul className="flex items-center gap-1">
            {SECTIONS.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="rounded-control px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                >
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <span className="hidden sm:block">
            <ButtonLink href="/entrar" variant="ghost" size="md">
              {t.signIn}
            </ButtonLink>
          </span>
          <ButtonLink href="/mapa?demo=1" size="md">
            <span className="sm:hidden">{t.ctaDemoShort}</span>
            <span className="hidden sm:inline">{t.ctaDemo}</span>
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
