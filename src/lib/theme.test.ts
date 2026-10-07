import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyThemePreference,
  isThemePreference,
  nextThemePreference,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  themeInitScript,
} from "./theme";

function mockSystemDark(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: dark && query.includes("dark"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("tema", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("resolve a preferência considerando o sistema", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("cicla claro → escuro → automático", () => {
    expect(nextThemePreference("light")).toBe("dark");
    expect(nextThemePreference("dark")).toBe("system");
    expect(nextThemePreference("system")).toBe("light");
  });

  it("valida valores lidos do armazenamento", () => {
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("sepia")).toBe(false);
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(readThemePreference()).toBe("system");
  });

  it("aplica e persiste a preferência", () => {
    mockSystemDark(false);
    applyThemePreference("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    applyThemePreference("system");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("o script inline aplica o tema salvo antes da hidratação", () => {
    mockSystemDark(false);
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    new Function(themeInitScript)();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
