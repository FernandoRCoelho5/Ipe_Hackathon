import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Área de conteúdo padrão das telas (o mapa usa largura total e não passa por aqui). */
export function PageContainer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-360 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10 lg:py-8",
        className,
      )}
      {...props}
    />
  );
}
