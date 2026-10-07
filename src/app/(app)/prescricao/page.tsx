import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import {
  PrescriptionScreen,
  PrescriptionSkeleton,
} from "@/components/prescription/prescription-screen";
import { PageHeader } from "@/components/ui/page-header";
import { messages } from "@/lib/i18n";

const screen = messages.screens.prescription;
const nav = messages.nav.items.prescription;

export const metadata: Metadata = { title: nav.label, description: nav.description };

export default function Page() {
  return (
    <PageContainer>
      <PageHeader eyebrow={screen.eyebrow} title={screen.title} description={nav.description} />
      <Suspense fallback={<PrescriptionSkeleton />}>
        <PrescriptionScreen />
      </Suspense>
    </PageContainer>
  );
}
