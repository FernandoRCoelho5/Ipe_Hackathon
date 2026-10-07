"use client";

import { ErrorPanel } from "@/components/layout/error-panel";

export default function PlatformError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorPanel error={error} retry={retry} />;
}
