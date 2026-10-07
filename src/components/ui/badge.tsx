import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "highlight" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-muted text-fg-muted",
  accent: "border-transparent bg-accent-soft text-fg",
  highlight: "border-transparent bg-highlight text-highlight-fg",
  warning: "border-transparent bg-warning-soft text-warning-fg",
  danger: "border-transparent bg-danger-soft text-danger",
  info: "border-transparent bg-azul-cidade/12 text-azul-rio dark:bg-azul-cidade/20 dark:text-azul-cidade",
};

type BadgeProps = ComponentProps<"span"> & { tone?: BadgeTone };

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
