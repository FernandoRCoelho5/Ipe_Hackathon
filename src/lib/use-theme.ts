"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  applyThemePreference,
  readResolvedTheme,
  readThemePreference,
  subscribeToTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme";

/**
 * Preferência e tema resolvido, sincronizados com `<html data-theme>`.
 * No servidor assume "system"/"light"; o script inline já aplicou o tema real antes da hidratação.
 */
export function useTheme(): {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
} {
  const preference = useSyncExternalStore(
    subscribeToTheme,
    readThemePreference,
    () => "system" as const,
  );
  const resolvedTheme = useSyncExternalStore(
    subscribeToTheme,
    readResolvedTheme,
    () => "light" as const,
  );
  const setPreference = useCallback((next: ThemePreference) => applyThemePreference(next), []);
  return { preference, resolvedTheme, setPreference };
}
