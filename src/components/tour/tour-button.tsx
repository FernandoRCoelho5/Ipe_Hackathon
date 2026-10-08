"use client";

import { Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";
import { useTourStore } from "@/stores/tour-store";

/** Botão do cabeçalho que abre o tour guiado da demonstração. */
export function TourButton() {
  const start = useTourStore((state) => state.start);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => start()}
      aria-label={messages.tour.start}
      title={messages.tour.start}
      className="h-9 rounded-full px-2.5 sm:px-3"
    >
      <Presentation aria-hidden className="text-highlight-ink" />
      <span className="hidden xl:inline">{messages.tour.start}</span>
      <span className="hidden sm:inline xl:hidden">{messages.tour.startShort}</span>
    </Button>
  );
}
