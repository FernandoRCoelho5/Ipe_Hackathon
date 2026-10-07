import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Bloco de carregamento (decorativo: o estado é anunciado por quem o usa). */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-lg bg-surface-sunken", className)}
      {...props}
    />
  );
}
