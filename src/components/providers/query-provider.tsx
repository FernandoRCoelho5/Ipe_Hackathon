"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiClientError } from "@/lib/api/client";

let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // Erros 4xx não melhoram com nova tentativa; falhas de rede e 5xx, uma vez.
        retry: (failureCount, error) =>
          !(error instanceof ApiClientError && error.status >= 400 && error.status < 500) &&
          failureCount < 1,
      },
    },
  });
}

/** Um QueryClient por renderização no servidor; um único, reaproveitado, no navegador. */
function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
