import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { ReportsScreen } from "@/components/reports/reports-screen";
import { PageHeader } from "@/components/ui/page-header";
import { messages } from "@/lib/i18n";

const screen = messages.screens.reports;
const nav = messages.nav.items.reports;

export const metadata: Metadata = { title: nav.label, description: nav.description };

export default function Page() {
  return (
    <PageContainer>
      <PageHeader eyebrow={screen.eyebrow} title={screen.title} description={nav.description} />
      <ReportsScreen />
    </PageContainer>
  );
}
