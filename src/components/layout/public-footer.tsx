import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { messages } from "@/lib/i18n";

const LINKS = [
  { href: "/mapa?demo=1", label: messages.landing.ctaDemo },
  { href: "/#piloto", label: messages.landing.ctaPilot },
  { href: "/entrar", label: messages.landing.signIn },
  { href: "/privacidade", label: messages.legal.privacyTitle },
] as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-verde-ipe text-white">
      <div className="mx-auto flex max-w-360 flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-10">
        <div className="flex max-w-md flex-col gap-4">
          <Logo variant="horizontal" tone="negative" className="h-14 self-start" />
          <p className="text-sm leading-relaxed text-white/80">{messages.legal.seal}</p>
          <p className="text-xs leading-relaxed text-white/60">{messages.demoData.description}</p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/90 underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div aria-hidden className="h-1.5 brand-gradient" />
    </footer>
  );
}
