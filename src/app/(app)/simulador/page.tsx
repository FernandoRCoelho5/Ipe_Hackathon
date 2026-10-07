import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { SimulatorScreen, SimulatorSkeleton } from "@/components/simulator/simulator-screen";
import { PageHeader } from "@/components/ui/page-header";
import { messages } from "@/lib/i18n";

const screen = messages.screens.simulator;
const nav = messages.nav.items.simulator;

export const metadata: Metadata = { title: nav.label, description: nav.description };

export default function Page() {
  return (
    <PageContainer>
      <PageHeader eyebrow={screen.eyebrow} title={screen.title} description={nav.description} />
      <Suspense fallback={<SimulatorSkeleton />}>
        <SimulatorScreen />
      </Suspense>
    </PageContainer>
  );
}
