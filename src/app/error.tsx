"use client";

import { ErrorPanel } from "@/components/layout/error-panel";

export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main id="conteudo" className="min-h-dvh">
      <ErrorPanel error={error} retry={retry} />
    </main>
  );
}
