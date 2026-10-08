import { expect, expectNoHorizontalOverflow, signInAs, test, waitForScreen } from "./support";

/**
 * Cada tela carrega o conteúdo principal, sem erro no console e sem vazar na horizontal
 * (celular). O mapa tem a lista alternativa ao lado (navegação sem o mapa).
 */

test.describe("telas da plataforma @mobile", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, "admin-municipal");
  });

  test("mapa: camadas, horário, alternativa em lista e diagnóstico", async ({
    page,
    consoleErrors,
  }) => {
    await page.goto("/mapa");
    await waitForScreen(page);
    await expect(page.getByRole("group", { name: "Camada" })).toBeVisible();
    await expect(page.getByRole("slider", { name: /Horário/ })).toBeVisible();
    await page
      .getByRole("button", { name: /VR-\d+/ })
      .first()
      .click();
    await expect(page).toHaveURL(/bloco=vr-/);
    await expect(page.getByText("Sensação térmica no pico")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(consoleErrors).toEqual([]);
  });

  test("prescrição, simulador, relatórios, ciência cidadã, Adote e acessos", async ({
    page,
    consoleErrors,
  }) => {
    test.slow();
    const checks: Array<[string, string]> = [
      ["/prescricao", "Ranking IVTU e prescrição"],
      ["/simulador", "Resultado estimado"],
      ["/relatorios", "Dados do projeto"],
      ["/ciencia-cidada", "Novo relato"],
      ["/ciencia-cidada?aba=sensores", "Calibração: sensor × modelo"],
      ["/adote-ilha-verde", "Áreas adotadas"],
      ["/acessos", "Matriz de permissões"],
    ];
    for (const [path, heading] of checks) {
      await page.goto(path);
      await waitForScreen(page);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
    expect(consoleErrors).toEqual([]);
  });
});
