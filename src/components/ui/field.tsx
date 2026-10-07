"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const controlBase =
  "h-10 w-full min-w-0 rounded-control border border-line bg-surface text-sm text-fg transition-colors hover:border-line-strong disabled:opacity-50";

export function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-xs font-medium text-fg-muted", className)} {...props} />;
}

interface SelectFieldProps extends Omit<ComponentProps<"select">, "children"> {
  label: string;
  options: readonly { value: string; label: string }[];
  /** Rótulo da opção vazia (por exemplo, "Todos"); omita para exigir uma escolha. */
  emptyLabel?: string;
  hideLabel?: boolean;
}

export function SelectField({
  label,
  options,
  emptyLabel,
  hideLabel,
  className,
  id,
  ...props
}: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={fieldId} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </FieldLabel>
      <div className="relative">
        <select
          id={fieldId}
          className={cn(controlBase, "cursor-pointer appearance-none truncate pr-9 pl-3")}
          {...props}
        >
          {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-3 right-3 size-4 text-fg-muted"
        />
      </div>
    </div>
  );
}

interface SearchFieldProps extends Omit<ComponentProps<"input">, "type" | "onChange" | "value"> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  clearLabel?: string;
}

export function SearchField({
  label,
  value,
  onValueChange,
  clearLabel = "Limpar busca",
  className,
  id,
  ...props
}: SearchFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-3 left-3 size-4 text-fg-muted"
        />
        <input
          id={fieldId}
          type="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className={cn(
            controlBase,
            "pr-9 pl-9 placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:hidden",
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={() => onValueChange("")}
            aria-label={clearLabel}
            className="absolute top-2 right-2 rounded-md p-1 text-fg-muted hover:bg-surface-muted hover:text-fg"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface RangeFieldProps extends Omit<
  ComponentProps<"input">,
  "type" | "onChange" | "value" | "min" | "max" | "step"
> {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  /** Valor formatado exibido ao lado do rótulo e lido pelo leitor de tela. */
  valueText: string;
  hint?: ReactNode;
}

/** Controle deslizante nativo (teclado e leitores de tela incluídos) com valor visível. */
export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onValueChange,
  valueText,
  hint,
  className,
  id,
  ...props
}: RangeFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <FieldLabel htmlFor={fieldId} className="text-sm text-fg">
          {label}
        </FieldLabel>
        <output htmlFor={fieldId} className="text-sm font-semibold text-fg tabular">
          {valueText}
        </output>
      </div>
      <input
        id={fieldId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        onChange={(event) => onValueChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-accent"
        {...props}
      />
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}
