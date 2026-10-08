import {
  ClipboardList,
  FileText,
  Map,
  MessagesSquare,
  ShieldCheck,
  SlidersHorizontal,
  Trees,
  type LucideIcon,
} from "lucide-react";
import { canAccessRoute, routePermission, type RoleId } from "@/domain/access/access";
import { messages } from "@/lib/i18n";

export type NavItemId = keyof typeof messages.nav.items;

export interface NavItem {
  id: NavItemId;
  href: `/${string}`;
  icon: LucideIcon;
  label: string;
  description: string;
}

export interface NavGroup {
  id: keyof typeof messages.nav.groups;
  label: string;
  items: NavItem[];
}

function item(id: NavItemId, href: `/${string}`, icon: LucideIcon): NavItem {
  return { id, href, icon, ...messages.nav.items[id] };
}

/** Ordem segue o fluxo do pitch: diagnóstico → ação → captação → continuidade. */
export const navGroups: NavGroup[] = [
  {
    id: "diagnosis",
    label: messages.nav.groups.diagnosis,
    items: [
      item("map", "/mapa", Map),
      item("prescription", "/prescricao", ClipboardList),
      item("simulator", "/simulador", SlidersHorizontal),
    ],
  },
  {
    id: "funding",
    label: messages.nav.groups.funding,
    items: [
      item("reports", "/relatorios", FileText),
      item("citizen", "/ciencia-cidada", MessagesSquare),
      item("adopt", "/adote-ilha-verde", Trees),
    ],
  },
  {
    id: "management",
    label: messages.nav.groups.management,
    items: [item("access", "/acessos", ShieldCheck)],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

/** Verdadeiro quando `pathname` é a rota do item ou uma sub-rota dela. */
export function isNavItemActive(item: Pick<NavItem, "href">, pathname: string): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Itens que o perfil pode abrir (RF08). Enquanto a sessão carrega (`role` nulo), mostra
 * as telas de uso geral e esconde só a gestão de acessos, para a navegação não piscar.
 */
export function visibleNavGroups(role: RoleId | null): NavGroup[] {
  const visible = (href: string) =>
    role ? canAccessRoute(role, href) : routePermission(href) !== "access:manage";
  return navGroups
    .map((group) => ({ ...group, items: group.items.filter((i) => visible(i.href)) }))
    .filter((group) => group.items.length > 0);
}
