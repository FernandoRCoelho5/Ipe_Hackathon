"use client";

import { Lock } from "lucide-react";
import { permissionPhrase, type Permission } from "@/domain/access/access";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/i18n";
import { usePermission } from "./use-session";

interface PermissionNoteProps {
  permission: Permission;
  className?: string;
}

/**
 * Aviso discreto ao lado de uma ação bloqueada pelo perfil (o botão fica desabilitado,
 * e não escondido, para a banca ver o controle de acesso funcionando). Nada é exibido
 * enquanto a sessão carrega ou quando o perfil pode.
 */
export function PermissionNote({ permission, className }: PermissionNoteProps) {
  const { denied, role } = usePermission(permission);
  if (!denied || !role) return null;
  return (
    <p className={cn("flex items-start gap-2 text-xs text-fg-muted", className)}>
      <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {messages.auth.denied(role.label, permissionPhrase(permission))} {messages.auth.deniedHint}
      </span>
    </p>
  );
}
