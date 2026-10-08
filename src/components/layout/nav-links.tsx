"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isNavItemActive, visibleNavGroups } from "@/lib/config/navigation";
import { useSessionStore } from "@/stores/session-store";

interface NavLinksProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/** Lista de navegação (só o que o perfil pode abrir), na barra lateral e na gaveta mobile. */
export function NavLinks({ collapsed = false, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const role = useSessionStore((state) => state.role);

  return (
    <div className="flex flex-col gap-6">
      {visibleNavGroups(role).map((group) => (
        <div key={group.id} className="flex flex-col gap-1">
          <p
            className={cn(
              "px-3 pb-1 text-[0.6875rem] font-medium tracking-[0.16em] text-fg-subtle uppercase",
              collapsed && "sr-only",
            )}
          >
            {group.label}
          </p>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = isNavItemActive(item, pathname);
              const Icon = item.icon;
              return (
                <li key={item.id} className="group/item relative">
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-11 items-center gap-3 rounded-control px-3 text-sm transition-colors",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-accent-soft font-semibold text-fg"
                        : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-amarelo-ipe"
                      />
                    )}
                    <Icon
                      aria-hidden
                      className={cn("size-5 shrink-0", active ? "text-accent" : "text-current")}
                    />
                    <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
                  </Link>
                  {collapsed && (
                    <span
                      role="presentation"
                      className="pointer-events-none absolute top-1/2 left-full z-30 ml-3 -translate-y-1/2 rounded-lg bg-verde-ipe px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-pop transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100"
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
