import { ArrowRight, MapPinned } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { ButtonLink } from "@/components/ui/button";
import { messages } from "@/lib/i18n";

/** Landing pública. A versão completa do pitch é construída na Fase 6. */
export default function Home() {
  const { landing } = messages;
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main id="conteudo" className="flex-1">
        <section className="mx-auto grid max-w-360 items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.2fr_1fr] lg:px-10">
          <div className="flex flex-col gap-6">
            <p className="text-xs font-medium tracking-[0.2em] text-fg-muted uppercase">
              {landing.eyebrow}
            </p>
            <h1 className="text-4xl leading-tight font-bold tracking-tight text-fg md:text-5xl">
              {landing.title}
            </h1>
            <span aria-hidden className="h-1.5 w-24 rounded-full bg-amarelo-ipe" />
            <p className="max-w-2xl text-lg leading-relaxed text-fg-muted">{landing.lead}</p>
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/mapa?demo=1" size="lg">
                {landing.ctaDemo}
                <ArrowRight aria-hidden />
              </ButtonLink>
            </div>
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              <MapPinned aria-hidden className="size-4 text-accent" />
              {landing.regionNote}
            </p>
          </div>
          <div className="flex justify-center">
            <div className="grid aspect-square w-full max-w-md place-items-center rounded-4xl border border-line bg-surface p-10 shadow-card">
              <Logo variant="symbol" className="h-auto w-full max-w-xs" />
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
