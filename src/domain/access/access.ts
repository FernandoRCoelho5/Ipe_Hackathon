import { z } from "zod";

/**
 * Gestão de acessos (RF08): perfis, permissões por ação e por rota.
 *
 * Matriz pura e testada. A sessão (cookie assinado hoje, OIDC no piloto) só informa o
 * perfil; quem decide o que cada perfil pode fazer é este módulo, usado pelo proxy
 * (rotas), pela API (ações) e pela interface (botões e navegação).
 */

export const ROLE_IDS = [
  "admin-municipal",
  "tecnico",
  "cliente-corporativo",
  "leitor-publico",
] as const;
export const roleIdSchema = z.enum(ROLE_IDS);
export type RoleId = z.infer<typeof roleIdSchema>;

export const PERMISSIONS = [
  "scenario:save",
  "checklist:edit",
  "citizen-report:moderate",
  "adoption:create",
  "report:generate",
  "report:public-funding",
  "access:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface RoleDefinition {
  id: RoleId;
  label: string;
  /** Rótulo curto (cabeçalho). */
  shortLabel: string;
  /** Quem usa o perfil, em uma frase. */
  audience: string;
}

/** Ordem de exibição: do mais amplo ao mais restrito. Rótulos iguais aos de `ipe.roles`. */
export const ROLES: readonly RoleDefinition[] = [
  {
    id: "admin-municipal",
    label: "Administrador Municipal",
    shortLabel: "Administrador",
    audience: "Gestão da Secretaria: acessos, prioridades e todos os módulos.",
  },
  {
    id: "tecnico",
    label: "Técnico/Analista",
    shortLabel: "Técnico/Analista",
    audience: "Equipe técnica: validação de campo, moderação, cenários e relatórios.",
  },
  {
    id: "cliente-corporativo",
    label: "Cliente Corporativo (B2B)",
    shortLabel: "Cliente B2B",
    audience: "Empresas parceiras: cenários, relatório ESG e áreas adotadas.",
  },
  {
    id: "leitor-publico",
    label: "Leitor Público",
    shortLabel: "Leitor Público",
    audience: "Transparência: consulta ao diagnóstico, sem salvar nem exportar.",
  },
];

export const ROLE_BY_ID: Readonly<Record<RoleId, RoleDefinition>> = Object.fromEntries(
  ROLES.map((role) => [role.id, role]),
) as Record<RoleId, RoleDefinition>;

export const PERMISSION_LABELS: Readonly<Record<Permission, string>> = {
  "scenario:save": "Salvar cenários do simulador",
  "checklist:edit": "Registrar checklist de validação em campo",
  "citizen-report:moderate": "Moderar relatos cidadãos",
  "adoption:create": "Cadastrar parcerias Adote uma Ilha Verde",
  "report:generate": "Gerar e exportar relatórios (PDF e DOCX)",
  "report:public-funding": "Relatórios para editais de recurso público",
  "access:manage": "Consultar e gerenciar perfis de acesso",
};

const ROLE_PERMISSIONS: Readonly<Record<RoleId, ReadonlySet<Permission>>> = {
  "admin-municipal": new Set(PERMISSIONS),
  tecnico: new Set([
    "scenario:save",
    "checklist:edit",
    "citizen-report:moderate",
    "adoption:create",
    "report:generate",
    "report:public-funding",
  ]),
  "cliente-corporativo": new Set(["scenario:save", "adoption:create", "report:generate"]),
  "leitor-publico": new Set(),
};

/** Rótulo da permissão para o meio de uma frase ("não permite salvar…"), mantendo siglas. */
export function permissionPhrase(permission: Permission): string {
  const label = PERMISSION_LABELS[permission];
  return label.charAt(0).toLowerCase() + label.slice(1);
}

export function can(role: RoleId, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function permissionsOf(role: RoleId): Permission[] {
  return PERMISSIONS.filter((permission) => can(role, permission));
}

// ─────────────────────────── Rotas ───────────────────────────

/** Telas que exigem sessão (qualquer perfil). A landing e a privacidade são públicas. */
export const PLATFORM_ROUTES = [
  "/mapa",
  "/prescricao",
  "/simulador",
  "/relatorios",
  "/ciencia-cidada",
  "/adote-ilha-verde",
  "/acessos",
  "/acesso-restrito",
] as const;

/** Rotas que, além da sessão, exigem uma permissão. As demais telas valem para todos. */
export const ROUTE_PERMISSIONS: Readonly<Partial<Record<string, Permission>>> = {
  "/relatorios": "report:generate",
  "/acessos": "access:manage",
};

function matches(route: string, pathname: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isPlatformRoute(pathname: string): boolean {
  return PLATFORM_ROUTES.some((route) => matches(route, pathname));
}

/** Permissão exigida pela rota (ou pela rota-mãe), se houver. */
export function routePermission(pathname: string): Permission | undefined {
  const route = Object.keys(ROUTE_PERMISSIONS).find((r) => matches(r, pathname));
  return route ? ROUTE_PERMISSIONS[route] : undefined;
}

export function canAccessRoute(role: RoleId, pathname: string): boolean {
  const permission = routePermission(pathname);
  return permission === undefined || can(role, permission);
}

/**
 * Caminho interno seguro para redirecionar após o login (evita open redirect:
 * só aceita caminhos absolutos do próprio site, nunca `//host` nem esquemas).
 */
export function safeReturnPath(value: unknown, fallback = "/mapa"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  const hasControlChars = [...value].some((char) => char.charCodeAt(0) < 0x20);
  if (value.includes("\\") || hasControlChars) return fallback;
  return value;
}
