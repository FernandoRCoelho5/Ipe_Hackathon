"use client";

import { useEffect } from "react";
import type { RoleId } from "@/domain/access/access";
import { useSessionStore } from "@/stores/session-store";

/** Leva o perfil lido no servidor para o estado do cliente (e o atualiza ao trocar). */
export function SessionBridge({ role }: { role: RoleId | null }) {
  const setRole = useSessionStore((state) => state.setRole);
  useEffect(() => setRole(role), [role, setRole]);
  return null;
}
