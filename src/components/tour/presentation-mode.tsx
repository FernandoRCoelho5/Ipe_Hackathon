"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useMunicipalities } from "@/components/layout/municipality-context";
import { queries } from "@/lib/api/queries";
import { useAppStore } from "@/stores/app-store";
import { useTourStore } from "@/stores/tour-store";

/** Telas que abrem um quarteirão pela URL (`?bloco=`). */
const BLOCK_SCREENS = new Set(["/mapa", "/prescricao", "/simulador"]);

/** Executa depois que o estado persistido do app foi reidratado (para não ser sobrescrito). */
function afterHydration(callback: () => void): () => void {
  if (useAppStore.persist.hasHydrated()) {
    callback();
    return () => {};
  }
  return useAppStore.persist.onFinishHydration(callback);
}

/**
 * Atalho `?demo=1` do Modo Apresentação. O proxy já entrou como Administrador Municipal;
 * aqui o navegador deixa a tela "pronta para apresentar": primeiro município da lista
 * (Volta Redonda), quarteirão mais crítico selecionado (o simulador abre nele com o
 * cenário recomendado) e o tour aberto na introdução.
 */
export function PresentationMode() {
  const demo = useSearchParams().get("demo") === "1";
  const municipality = useMunicipalities()[0];
  const top = useQuery({
    ...queries.ranking({ municipality: municipality?.id ?? "", pageSize: 1 }),
    enabled: demo && !!municipality,
  });
  const topId = top.data?.data[0]?.id;

  useEffect(() => {
    if (!demo || !municipality || !topId) return;
    return afterHydration(() => {
      useAppStore.getState().setMunicipalityId(municipality.id);
      const url = new URL(window.location.href);
      url.searchParams.delete("demo");
      if (BLOCK_SCREENS.has(url.pathname) && !url.searchParams.has("bloco")) {
        url.searchParams.set("bloco", topId);
      }
      window.history.replaceState(null, "", url);
      useTourStore.getState().start({ fromDemo: true });
    });
  }, [demo, municipality, topId]);

  return null;
}
