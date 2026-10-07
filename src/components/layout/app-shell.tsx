"use client";

import { useEffect, type ReactNode } from "react";
import type { Municipality } from "@/domain/municipality/types";
import { useAppStore } from "@/stores/app-store";
import { AppHeader } from "./app-header";
import { MunicipalitiesProvider } from "./municipality-context";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  municipalities: Municipality[];
  children: ReactNode;
}

/**
 * Moldura das telas autenticadas: cabeçalho, navegação lateral e área de conteúdo.
 * Os municípios chegam do servidor (repositório), nunca fixos na interface.
 */
export function AppShell({ municipalities, children }: AppShellProps) {
  useEffect(() => {
    // Reidrata o estado persistido só no cliente (ver stores/app-store.ts).
    void Promise.resolve(useAppStore.persist.rehydrate()).then(() => {
      const { municipalityId, setMunicipalityId } = useAppStore.getState();
      const valid = municipalities.some((m) => m.id === municipalityId);
      if (!valid && municipalities[0]) setMunicipalityId(municipalities[0].id);
    });
  }, [municipalities]);

  return (
    <MunicipalitiesProvider municipalities={municipalities}>
      <div className="flex min-h-dvh flex-col">
        <AppHeader municipalities={municipalities} />
        <div className="flex flex-1">
          <Sidebar />
          <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
            {children}
          </main>
        </div>
      </div>
    </MunicipalitiesProvider>
  );
}
