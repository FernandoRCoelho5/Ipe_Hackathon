import { Construction } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { messages } from "@/lib/i18n";

/** Estado temporário das telas ainda não entregues no plano de fases. */
export function ScreenInProgress() {
  return (
    <EmptyState
      icon={Construction}
      title={messages.screens.inProgress.title}
      description={messages.screens.inProgress.description}
    />
  );
}
