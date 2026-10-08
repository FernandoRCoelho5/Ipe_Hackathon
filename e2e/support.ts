import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";
import { ROLE_BY_ID, type RoleId } from "../src/domain/access/access";

/**
 * Apoio dos testes e2e: login por perfil (pelo mesmo fluxo da banca), verificação de
 * acessibilidade com axe (WCAG 2.1 AA) e coleta de erros de console por teste.
 */

/** Ruído externo que não é defeito da aplicação (basemap sem rede, por exemplo). */
const IGNORED_CONSOLE = [/basemaps\.cartocdn\.com/i, /Failed to load resource.*cartocdn/i];

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, provide) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (!IGNORED_CONSOLE.some((pattern) => pattern.test(text))) errors.push(text);
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await provide(errors);
  },
});

export { expect };

/** Entra com um perfil pela tela `/entrar` (Server Action), voltando para `next`. */
export async function signInAs(page: Page, role: RoleId, next = "/mapa") {
  await page.goto(`/entrar?proximo=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: `Entrar como ${ROLE_BY_ID[role].label}` }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"));
  await expect(
    page.getByRole("button", { name: `Perfil de acesso: ${ROLE_BY_ID[role].label}` }),
  ).toBeVisible();
}

/** Espera a tela da plataforma terminar de carregar (perfil no cabeçalho, sem esqueletos). */
export async function waitForScreen(page: Page) {
  await expect(page.locator('[data-tour="profile-menu"]')).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

export function roleLabel(role: RoleId) {
  return ROLE_BY_ID[role].label;
}

/** Zero violações WCAG 2.1 A/AA. O canvas do mapa é pintura (a alternativa é a lista ao lado). */
export async function expectAccessible(page: Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude(".maplibregl-canvas")
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join("\n  ")}`,
  );
  expect(summary, `Violações de acessibilidade em ${context}`).toEqual([]);
}

/** Nada pode vazar na horizontal (celular). */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Aplica o tema escuro como o botão de tema faria (preferência salva + atributo). */
export async function useDarkTheme(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("ipe-theme", "dark");
    } catch {}
  });
}
