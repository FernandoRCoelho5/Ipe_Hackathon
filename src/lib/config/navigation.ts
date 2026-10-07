import {
  ClipboardList,
  FileText,
  Map,
  MessagesSquare,
  SlidersHorizontal,
  Trees,
  type LucideIcon,
} from "lucide-react";
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
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

/** Verdadeiro quando `pathname` é a rota do item ou uma sub-rota dela. */
export function isNavItemActive(item: Pick<NavItem, "href">, pathname: string): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
