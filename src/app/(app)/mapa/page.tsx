import type { Metadata } from "next";
import { Suspense } from "react";
import { HeatMapScreen, HeatMapSkeleton } from "@/components/map/heat-map-screen";
import { messages } from "@/lib/i18n";

const nav = messages.nav.items.map;

export const metadata: Metadata = { title: nav.label, description: nav.description };

/** A tela lê a URL (`?bloco=`, `?camada=`) no cliente; o esqueleto sai no HTML estático. */
export default function Page() {
  return (
    <Suspense fallback={<HeatMapSkeleton />}>
      <HeatMapScreen />
    </Suspense>
  );
}
