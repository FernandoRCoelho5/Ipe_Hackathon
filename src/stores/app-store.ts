"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Estado global de navegação do app (município ativo, navegação recolhida).
 * Persistido no localStorage com `skipHydration`: o AppShell reidrata após a montagem,
 * para que o HTML do servidor e a primeira renderização do cliente coincidam.
 */
interface AppState {
  municipalityId: string | null;
  sidebarCollapsed: boolean;
  setMunicipalityId: (id: string) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      municipalityId: null,
      sidebarCollapsed: false,
      setMunicipalityId: (municipalityId) => set({ municipalityId }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: "ipe-app",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ municipalityId, sidebarCollapsed }) => ({ municipalityId, sidebarCollapsed }),
    },
  ),
);
