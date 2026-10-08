"use client";

import { create } from "zustand";
import type { RoleId } from "@/domain/access/access";

/**
 * Perfil da sessão no navegador, só para a interface (mostrar o perfil, habilitar botões).
 * Quem garante a permissão é o servidor (proxy e API). O valor chega do layout por um
 * Server Component em `<Suspense>` (ver `SessionLoader`), sem tornar as páginas dinâmicas.
 */
interface SessionState {
  /** `false` até o servidor informar a sessão. */
  ready: boolean;
  role: RoleId | null;
  setRole: (role: RoleId | null) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  ready: false,
  role: null,
  setRole: (role) => set({ role, ready: true }),
}));
