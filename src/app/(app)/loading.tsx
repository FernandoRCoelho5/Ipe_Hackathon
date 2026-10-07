import { PageContainer } from "@/components/layout/page-container";
import { messages } from "@/lib/i18n";

/** Esqueleto exibido enquanto uma tela da plataforma carrega. */
export default function PlatformLoading() {
  return (
    <PageContainer aria-busy="true">
      <span className="sr-only" role="status">
        {messages.common.loading}
      </span>
      <div aria-hidden className="flex animate-pulse flex-col gap-3 border-b border-line pb-6">
        <div className="h-3 w-40 rounded-full bg-surface-sunken" />
        <div className="h-8 w-80 max-w-full rounded-lg bg-surface-sunken" />
        <div className="h-4 w-128 max-w-full rounded-full bg-surface-sunken" />
      </div>
      <div aria-hidden className="grid animate-pulse gap-4 md:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-36 rounded-card bg-surface-sunken" />
        ))}
      </div>
    </PageContainer>
  );
}
