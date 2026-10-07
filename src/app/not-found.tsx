import { Compass } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/button";
import { messages } from "@/lib/i18n";

export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-dvh flex-col">
      <div aria-hidden className="h-1 brand-gradient" />
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <Logo variant="symbol" decorative className="h-16" />
        <p className="text-sm font-semibold tracking-[0.2em] text-highlight-ink">404</p>
        <h1 className="text-2xl font-bold text-fg">{messages.errors.notFoundTitle}</h1>
        <p className="text-sm text-fg-muted">{messages.errors.notFoundDescription}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink href="/mapa">
            <Compass aria-hidden />
            {messages.nav.items.map.label}
          </ButtonLink>
          <ButtonLink href="/" variant="outline">
            {messages.common.backToStart}
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
