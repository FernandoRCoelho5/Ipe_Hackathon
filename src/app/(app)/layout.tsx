import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { getRepositories } from "@/server/repositories";

/**
 * Layout das telas da plataforma.
 * Fluxo de dados: repositório (mock/PostGIS) → Server Component → AppShell (cliente);
 * dentro das telas, TanStack Query → /api/v1.
 */
export default async function PlatformLayout({ children }: LayoutProps<"/">) {
  const municipalities = await getRepositories().municipalities.list();
  return (
    <QueryProvider>
      <AppShell municipalities={municipalities}>{children}</AppShell>
    </QueryProvider>
  );
}
