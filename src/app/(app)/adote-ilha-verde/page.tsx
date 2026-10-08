import type { Metadata } from "next";
import { Suspense } from "react";
import { AdoptScreen, AdoptSkeleton } from "@/components/adopt/adopt-screen";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { messages } from "@/lib/i18n";

const screen = messages.screens.adopt;
const nav = messages.nav.items.adopt;

export const metadata: Metadata = { title: nav.label, description: nav.description };

export default function Page() {
  return (
    <PageContainer>
      <PageHeader eyebrow={screen.eyebrow} title={screen.title} description={nav.description} />
      <Suspense fallback={<AdoptSkeleton />}>
        <AdoptScreen />
      </Suspense>
    </PageContainer>
  );
}
