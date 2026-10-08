import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type ScrollRegionProps = ComponentProps<"div"> & {
  /** Nome da região para leitores de tela (ex.: o título da tabela). */
  label: string;
};

/**
 * Área com rolagem horizontal (tabelas largas no celular).
 * - Focável pelo teclado (WCAG 2.1.1): as setas rolam o conteúdo.
 * - `relative`: textos `sr-only` (posição absoluta) ficam contidos e não alargam a página.
 */
export function ScrollRegion({ label, className, ...props }: ScrollRegionProps) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn("relative overflow-x-auto", className)}
      {...props}
    />
  );
}
