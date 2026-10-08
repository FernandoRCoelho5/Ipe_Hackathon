import { Building2, ClipboardCheck, Eye, ShieldCheck, type LucideIcon } from "lucide-react";
import type { RoleId } from "@/domain/access/access";

/** Ícone de cada perfil (cabeçalho, escolha de perfil e matriz de acessos). */
export const ROLE_ICONS: Readonly<Record<RoleId, LucideIcon>> = {
  "admin-municipal": ShieldCheck,
  tecnico: ClipboardCheck,
  "cliente-corporativo": Building2,
  "leitor-publico": Eye,
};
