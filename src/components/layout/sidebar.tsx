"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
import { LegalSeal } from "./legal-seal";
import { NavLinks } from "./nav-links";

export function Sidebar() {
  const collapsed = useAppStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const label = collapsed ? messages.common.expandSidebar : messages.common.collapseSidebar;
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={cn(
        "sticky top-18 hidden h-[calc(100dvh-4.5rem)] shrink-0 flex-col border-r border-line bg-surface/60 transition-[width] duration-200 lg:flex",
        collapsed ? "w-19" : "w-64",
      )}
    >
      <nav
        aria-label={messages.nav.primaryLabel}
        className={cn("flex-1 px-3 py-5", collapsed ? "overflow-visible" : "overflow-y-auto")}
      >
        <NavLinks collapsed={collapsed} />
      </nav>
      <div className="flex flex-col gap-3 border-t border-line p-3">
        {!collapsed && <LegalSeal />}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={label}
          aria-expanded={!collapsed}
          title={label}
          className={cn(
            "flex h-9 items-center gap-2 rounded-control px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg",
            collapsed && "justify-center px-0",
          )}
        >
          <ToggleIcon aria-hidden className="size-4" />
          {!collapsed && <span>{messages.common.collapseSidebar}</span>}
        </button>
      </div>
    </aside>
  );
}
