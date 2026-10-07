import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Icon aria-hidden className="size-6" />
      </span>
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      {description && <p className="max-w-md text-sm text-fg-muted">{description}</p>}
      {action}
    </div>
  );
}
