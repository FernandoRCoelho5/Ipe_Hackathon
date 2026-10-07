import { clsx, type ClassValue } from "clsx";

/** Concatena classes condicionalmente (alias de `clsx`, reconhecido pelo Prettier). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
