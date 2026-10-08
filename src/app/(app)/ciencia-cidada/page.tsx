import type { Metadata } from "next";
import { Suspense } from "react";
import { CitizenScreen, CitizenSkeleton } from "@/components/citizen/citizen-screen";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { messages } from "@/lib/i18n";

const screen = messages.screens.citizen;
const nav = messages.nav.items.citizen;

export const metadata: Metadata = { title: nav.label, description: nav.description };

export default function Page() {
  return (
    <PageContainer>
      <PageHeader eyebrow={screen.eyebrow} title={screen.title} description={nav.description} />
      <Suspense fallback={<CitizenSkeleton />}>
        <CitizenScreen />
      </Suspense>
    </PageContainer>
  );
}
