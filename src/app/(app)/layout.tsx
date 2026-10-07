import { AppShell } from "@/components/layout/app-shell";
import { getRepositories } from "@/server/repositories";

/**
 * Layout das telas da plataforma.
 * Fluxo de dados: repositório (mock/PostGIS) → Server Component → AppShell (cliente).
 */
export default async function PlatformLayout({ children }: LayoutProps<"/">) {
  const municipalities = await getRepositories().municipalities.list();
  return <AppShell municipalities={municipalities}>{children}</AppShell>;
}
