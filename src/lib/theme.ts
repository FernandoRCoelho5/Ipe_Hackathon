/**
 * Tema claro/escuro.
 * A preferência ("light" | "dark" | "system") fica no localStorage; o tema resolvido
 * é aplicado em `<html data-theme>` por um script inline antes da primeira pintura,
 * evitando o "flash" de tema errado na hidratação.
 */

export const THEME_STORAGE_KEY = "ipe-theme";
export const THEME_CHANGE_EVENT = "ipe:theme-change";

export const themePreferences = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof themePreferences)[number];
export type ResolvedTheme = "light" | "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (themePreferences as readonly string[]).includes(value);
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/** Próxima preferência no ciclo do botão: claro → escuro → automático → claro. */
export function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = themePreferences.indexOf(current);
  return themePreferences[(index + 1) % themePreferences.length];
}

/** Script executado de forma síncrona no <head>. Mantenha-o pequeno e sem dependências. */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=p==="dark"||p==="light"?p:(d?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="light";}})();`;

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Armazenamento indisponível (modo privado): o tema vale só para esta sessão.
  }
  document.documentElement.dataset.theme = resolveTheme(preference, systemPrefersDark());
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
}

/** Assina mudanças de preferência (botão) e do sistema operacional. */
export function subscribeToTheme(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemChange = () => {
    if (readThemePreference() === "system") {
      document.documentElement.dataset.theme = resolveTheme("system", media.matches);
    }
    onChange();
  };
  media.addEventListener("change", handleSystemChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", handleSystemChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

export function readResolvedTheme(): ResolvedTheme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
