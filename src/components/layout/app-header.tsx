"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import type { Municipality } from "@/domain/municipality/types";
import { messages } from "@/lib/i18n";
import { DemoDataBadge } from "./demo-data-badge";
import { MobileNav } from "./mobile-nav";
import { MunicipalitySelect } from "./municipality-select";
import { ThemeToggle } from "./theme-toggle";

interface AppHeaderProps {
  municipalities: Municipality[];
}

export function AppHeader({ municipalities }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md supports-[backdrop-filter]:bg-surface/80">
      <div aria-hidden className="h-1 brand-gradient" />
      <div className="flex h-17 items-center gap-2 px-3 sm:gap-3 sm:px-5">
        <MobileNav />
        <Link
          href="/"
          aria-label={`${messages.brand.logoLabel} — ${messages.common.backToStart}`}
          className="flex shrink-0 items-center rounded-lg"
        >
          {/* Duas versões no DOM: o CSS escolhe a do tema sem "piscar" na hidratação. */}
          <span className="sm:hidden">
            <Logo variant="symbol" decorative className="block h-11 dark:hidden" />
            <Logo variant="symbol" tone="negative" decorative className="hidden h-11 dark:block" />
          </span>
          <span className="hidden sm:block">
            <Logo variant="horizontal" decorative className="block h-14 dark:hidden" />
            <Logo
              variant="horizontal"
              tone="negative"
              decorative
              className="hidden h-14 dark:block"
            />
          </span>
        </Link>

        <div className="mx-1 hidden h-8 w-px bg-line md:block" aria-hidden />

        <MunicipalitySelect municipalities={municipalities} />

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <DemoDataBadge />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
