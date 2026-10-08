"use client";

import { can, ROLE_BY_ID, type Permission, type RoleDefinition } from "@/domain/access/access";
import { useSessionStore } from "@/stores/session-store";

export interface ClientSession {
  ready: boolean;
  role: RoleDefinition | null;
}

export function useSession(): ClientSession {
  const ready = useSessionStore((state) => state.ready);
  const role = useSessionStore((state) => state.role);
  return { ready, role: role ? ROLE_BY_ID[role] : null };
}

export interface PermissionState {
  /** Verdadeiro só quando a sessão já chegou e o perfil tem a permissão. */
  allowed: boolean;
  /** Verdadeiro quando já se sabe que o perfil NÃO pode (para mostrar o aviso). */
  denied: boolean;
  role: RoleDefinition | null;
}

/**
 * Permissão de uma ação para a interface. Enquanto a sessão carrega, o botão fica
 * desabilitado sem aviso; o aviso só aparece quando o perfil de fato não pode.
 */
export function usePermission(permission: Permission): PermissionState {
  const { ready, role } = useSession();
  const allowed = ready && role !== null && can(role.id, permission);
  return { allowed, denied: ready && !allowed, role };
}
