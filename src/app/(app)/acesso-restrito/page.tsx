import type { Metadata } from "next";
import { Suspense } from "react";
import { RestrictedAccess } from "@/components/auth/restricted-access";
import { PageContainer } from "@/components/layout/page-container";
import { safeReturnPath } from "@/domain/access/access";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = {
  title: messages.auth.restrictedEyebrow,
  robots: { index: false },
};

/** Destino do proxy quando o perfil não pode abrir a tela pedida (`?rota=`). */
export default function Page({ searchParams }: PageProps<"/acesso-restrito">) {
  return (
    <PageContainer className="max-w-5xl">
      <Suspense fallback={null}>
        <RestrictedForRoute searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function RestrictedForRoute({
  searchParams,
}: Pick<PageProps<"/acesso-restrito">, "searchParams">) {
  const { rota } = await searchParams;
  return <RestrictedAccess route={safeReturnPath(rota)} />;
}
