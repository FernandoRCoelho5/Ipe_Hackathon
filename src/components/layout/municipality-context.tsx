"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Municipality } from "@/domain/municipality/types";
import { useAppStore } from "@/stores/app-store";

const MunicipalitiesContext = createContext<readonly Municipality[]>([]);

/** Municípios atendidos, vindos do repositório no layout (nunca fixos na interface). */
export function MunicipalitiesProvider({
  municipalities,
  children,
}: {
  municipalities: readonly Municipality[];
  children: ReactNode;
}) {
  return (
    <MunicipalitiesContext.Provider value={municipalities}>
      {children}
    </MunicipalitiesContext.Provider>
  );
}

export function useMunicipalities(): readonly Municipality[] {
  return useContext(MunicipalitiesContext);
}

/**
 * Município ativo no cabeçalho. É `null` até o estado persistido ser reidratado,
 * para que nenhuma tela busque dados do município errado no primeiro quadro.
 */
export function useActiveMunicipality(): Municipality | null {
  const municipalities = useMunicipalities();
  const id = useAppStore((state) => state.municipalityId);
  return municipalities.find((m) => m.id === id) ?? null;
}
