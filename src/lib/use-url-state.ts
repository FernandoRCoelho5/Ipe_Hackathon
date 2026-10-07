"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type UrlPatch = Record<string, string | number | readonly string[] | null | undefined>;

/** Aplica um patch a uma query string: `null`, `undefined`, "" e [] removem a chave. */
export function patchSearchParams(current: string, patch: UrlPatch): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    const text = Array.isArray(value) ? value.join(",") : value == null ? "" : String(value);
    if (text === "") next.delete(key);
    else next.set(key, text);
  }
  return next.toString();
}

/**
 * Estado de tela na URL (filtros, quarteirão selecionado): links compartilháveis e
 * "voltar" do navegador funcionando. Usa a History API nativa, que o App Router
 * sincroniza com `useSearchParams` sem refazer a renderização no servidor.
 */
export function useUrlState() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (patch: UrlPatch, { push = false }: { push?: boolean } = {}) => {
      const query = patchSearchParams(window.location.search, patch);
      const url = query ? `${pathname}?${query}` : pathname;
      if (push) window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [pathname],
  );

  return [searchParams, setParams] as const;
}
