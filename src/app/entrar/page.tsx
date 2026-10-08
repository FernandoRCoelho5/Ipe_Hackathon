import { Info } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfilePicker } from "@/components/auth/profile-picker";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { safeReturnPath } from "@/domain/access/access";
import { messages } from "@/lib/i18n";

const t = messages.auth;

export const metadata: Metadata = {
  title: t.signInTitle,
  description: t.signInLead,
  robots: { index: false },
};

/** Escolha de perfil (autenticação simulada do MVP, RF08). */
export default function SignInPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main
        id="conteudo"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6"
      >
        <header className="flex max-w-3xl flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.18em] text-fg-muted uppercase">
            {t.signInEyebrow}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-fg">{t.signInTitle}</h1>
          <p className="text-base leading-relaxed text-fg-muted">{t.signInLead}</p>
        </header>
        {/* O destino (`?proximo=`) é lido por requisição; o resto da página é estático. */}
        <Suspense fallback={<ProfilePicker returnTo="/mapa" />}>
          <PickerForDestination searchParams={searchParams} />
        </Suspense>
        <p className="flex max-w-3xl items-start gap-2 text-sm text-fg-muted">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          {t.signInPilot}
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}

async function PickerForDestination({ searchParams }: Pick<PageProps<"/entrar">, "searchParams">) {
  const { proximo } = await searchParams;
  return <ProfilePicker returnTo={safeReturnPath(proximo)} />;
}
