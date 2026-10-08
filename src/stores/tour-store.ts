"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Estado do tour da demonstração (Modo Apresentação).
 * Guardado no sessionStorage: sobrevive às trocas de tela e a um recarregamento, mas
 * some ao fechar a aba. `skipHydration`: o TourOverlay reidrata após montar.
 */
interface TourState {
  open: boolean;
  step: number;
  /** Aberto pelo atalho `?demo=1` (mostra o resumo do estado pré-carregado). */
  fromDemo: boolean;
  start: (options?: { fromDemo?: boolean }) => void;
  goTo: (step: number) => void;
  close: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      open: false,
      step: 0,
      fromDemo: false,
      start: ({ fromDemo = false } = {}) => set({ open: true, step: 0, fromDemo }),
      goTo: (step) => set({ step }),
      close: () => set({ open: false, step: 0, fromDemo: false }),
    }),
    {
      name: "ipe-tour",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: ({ open, step, fromDemo }) => ({ open, step, fromDemo }),
    },
  ),
);
