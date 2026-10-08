import { expect, expectAccessible, signInAs, test, useDarkTheme, waitForScreen } from "./support";

/**
 * RNF04 (WCAG 2.1 AA): zero violações do axe nas páginas públicas e nas telas
 * principais, nos temas claro e escuro, no desktop e no celular.
 */

const PUBLIC_PAGES = [
  { path: "/", ready: "heading", name: /Saiba em qual rua/ },
  { path: "/privacidade", ready: "heading", name: "Privacidade e LGPD" },
  { path: "/entrar", ready: "heading", name: "Escolha um perfil de acesso" },
] as const;

const SCREENS = [
  { path: "/mapa", name: "Mapa de calor urbano" },
  { path: "/mapa?bloco=vr-0092", name: "Mapa de calor urbano" },
  { path: "/prescricao", name: "Ranking IVTU e prescrição" },
  { path: "/prescricao?bloco=vr-0092", name: "Ranking IVTU e prescrição" },
  { path: "/simulador", name: "Simulador what-if" },
  { path: "/relatorios?exemplo=1", name: "Relatórios para editais" },
  { path: "/ciencia-cidada", name: "Ciência cidadã e sensores IoT" },
  { path: "/ciencia-cidada?aba=sensores", name: "Ciência cidadã e sensores IoT" },
  { path: "/adote-ilha-verde", name: "Adote uma Ilha Verde" },
  { path: "/acessos", name: "Perfis e acessos" },
] as const;

for (const theme of ["claro", "escuro"] as const) {
  test.describe(`acessibilidade · tema ${theme} @mobile`, () => {
    test.beforeEach(async ({ page }) => {
      if (theme === "escuro") await useDarkTheme(page);
    });

    for (const pageInfo of PUBLIC_PAGES) {
      test(`página pública ${pageInfo.path}`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await expect(page.getByRole("heading", { name: pageInfo.name, level: 1 })).toBeVisible();
        // A landing revela as seções ao rolar: percorre a página antes de analisar.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 600) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 30));
          }
          window.scrollTo(0, 0);
        });
        await expectAccessible(page, `${pageInfo.path} (${theme})`);
      });
    }

    test("telas da plataforma (Administrador Municipal)", async ({ page }) => {
      test.slow();
      await signInAs(page, "admin-municipal");
      for (const screen of SCREENS) {
        await page.goto(screen.path);
        await expect(page.getByRole("heading", { name: screen.name, level: 1 })).toBeVisible();
        await waitForScreen(page);
        if (screen.path.startsWith("/relatorios")) {
          await expect(page.getByRole("button", { name: "Baixar PDF" })).toBeVisible();
        }
        await expectAccessible(page, `${screen.path} (${theme})`);
      }
    });

    test("acesso restrito (Leitor Público)", async ({ page }) => {
      await signInAs(page, "leitor-publico");
      await page.goto("/relatorios");
      await expect(page).toHaveURL(/\/acesso-restrito/);
      await waitForScreen(page);
      await expectAccessible(page, `/acesso-restrito (${theme})`);
    });
  });
}
