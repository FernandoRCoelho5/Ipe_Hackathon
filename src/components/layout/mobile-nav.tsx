"use client";

import { Menu, X } from "lucide-react";
import { useRef } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";
import { LegalSeal } from "./legal-seal";
import { NavLinks } from "./nav-links";

/**
 * Gaveta de navegação para telas < lg.
 * `<dialog>` modal nativo: prende o foco, fecha com Esc e devolve o foco ao botão.
 */
export function MobileNav() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label={messages.common.openMenu}
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Menu aria-hidden />
      </Button>
      <dialog
        ref={dialogRef}
        aria-label={messages.nav.primaryLabel}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        className="m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none bg-surface p-0 text-fg shadow-pop backdrop:bg-verde-ipe-950/50 backdrop:backdrop-blur-[2px] open:animate-drawer-in"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between border-b border-line px-4">
            <span>
              <Logo variant="horizontal" className="block h-14 dark:hidden" />
              <Logo variant="horizontal" tone="negative" className="hidden h-14 dark:block" />
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={messages.common.closeMenu}
              onClick={close}
            >
              <X aria-hidden />
            </Button>
          </div>
          <nav aria-label={messages.nav.primaryLabel} className="flex-1 overflow-y-auto px-3 py-5">
            <NavLinks onNavigate={close} />
          </nav>
          <div className="border-t border-line p-3">
            <LegalSeal />
          </div>
        </div>
      </dialog>
    </>
  );
}
