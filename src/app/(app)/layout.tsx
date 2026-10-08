import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { getRepositories } from "@/server/repositories";
import { SessionLoader } from "./session-loader";

/**
 * Layout das telas da plataforma.
 * Fluxo de dados: repositório (mock/PostGIS) → Server Component → AppShell (cliente);
 * dentro das telas, TanStack Query → /api/v1. O perfil da sessão chega à parte, em
 * `<Suspense>`, para não tornar as páginas dinâmicas (o proxy já barrou quem não pode).
 */
export default async function PlatformLayout({ children }: LayoutProps<"/">) {
  const municipalities = await getRepositories().municipalities.list();
  return (
    <QueryProvider>
      <Suspense fallback={null}>
        <SessionLoader />
      </Suspense>
      <AppShell municipalities={municipalities}>{children}</AppShell>
    </QueryProvider>
  );
}
