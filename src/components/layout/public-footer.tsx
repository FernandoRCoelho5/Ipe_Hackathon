import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { messages } from "@/lib/i18n";

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-verde-ipe text-white">
      <div className="mx-auto flex max-w-360 flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-10">
        <div className="flex max-w-md flex-col gap-4">
          <Logo variant="horizontal" tone="negative" className="h-14 self-start" />
          <p className="text-sm leading-relaxed text-white/80">{messages.legal.seal}</p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm">
          <Link href="/mapa" className="text-white/90 underline-offset-4 hover:underline">
            {messages.landing.ctaDemo}
          </Link>
          <Link href="/privacidade" className="text-white/90 underline-offset-4 hover:underline">
            {messages.legal.privacyTitle}
          </Link>
        </nav>
      </div>
      <div aria-hidden className="h-1.5 brand-gradient" />
    </footer>
  );
}
