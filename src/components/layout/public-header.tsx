import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/button";
import { messages } from "@/lib/i18n";
import { ThemeToggle } from "./theme-toggle";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div aria-hidden className="h-1 brand-gradient" />
      <div className="mx-auto flex h-17 max-w-360 items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link href="/" aria-label={messages.brand.logoLabel} className="rounded-lg">
          <Logo variant="horizontal" decorative className="block h-14 dark:hidden" />
          <Logo
            variant="horizontal"
            tone="negative"
            decorative
            className="hidden h-14 dark:block"
          />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <ButtonLink href="/mapa?demo=1" size="md">
            {messages.landing.ctaDemo}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
