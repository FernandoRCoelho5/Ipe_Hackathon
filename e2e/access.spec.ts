import { expect, roleLabel, signInAs, test, waitForScreen } from "./support";

/** RF08: permissões por rota e por ação, para cada perfil, na interface e na API. */

const scenario = {
  name: "Cenário e2e",
  municipalityId: "volta-redonda",
  scenario: { blockId: "vr-0092", trees: [{ speciesId: "ipe-amarelo", count: 4 }] },
};

test.describe("perfis de acesso @mobile", () => {
  test("sem sessão, as telas pedem um perfil e voltam ao destino", async ({ page }) => {
    await page.goto("/simulador?bloco=vr-0092");
    await expect(page).toHaveURL(/\/entrar\?proximo=%2Fsimulador%3Fbloco%3Dvr-0092/);
    await page.getByRole("button", { name: `Entrar como ${roleLabel("tecnico")}` }).click();
    await expect(page).toHaveURL(/\/simulador\?bloco=vr-0092/);
    await expect(page.getByRole("button", { name: /Perfil de acesso: Técnico/ })).toBeVisible();
  });

  test("Leitor Público consulta, mas não salva cenários nem abre relatórios", async ({ page }) => {
    await signInAs(page, "leitor-publico", "/simulador");
    await waitForScreen(page);
    await expect(
      page.getByText(/O perfil Leitor Público não permite salvar cenários/),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar cenário" })).toBeDisabled();

    // A API também recusa, mesmo chamada fora da interface.
    const response = await page.request.post("/api/v1/simulation/scenarios", { data: scenario });
    expect(response.status()).toBe(403);

    await page.goto("/relatorios");
    await expect(page).toHaveURL(/\/acesso-restrito\?rota=%2Frelatorios/);
    await expect(
      page.getByRole("heading", { name: "Relatórios não está disponível para o seu perfil" }),
    ).toBeVisible();
  });

  test("Cliente Corporativo gera só o relatório ESG e não modera relatos", async ({ page }) => {
    await signInAs(page, "cliente-corporativo", "/relatorios");
    await waitForScreen(page);
    await expect(page.getByRole("radio", { name: /Fundo Clima/ })).toBeDisabled();
    await expect(page.getByRole("radio", { name: /Relatório ESG Corporativo/ })).toBeChecked();

    const publicReport = await page.request.post("/api/v1/reports/preview", {
      data: {
        programId: "fundo-clima",
        municipalityId: "volta-redonda",
        projectName: "Projeto e2e",
        department: "Diretoria",
        estimatedBudget: 100_000,
        neighborhoods: ["Retiro"],
      },
    });
    expect(publicReport.status()).toBe(403);

    await page.goto("/ciencia-cidada");
    await waitForScreen(page);
    await expect(page.getByText(/não modera relatos/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Validar" })).toHaveCount(0);

    await page.goto("/acessos");
    await expect(page).toHaveURL(/\/acesso-restrito/);
  });

  test("Técnico/Analista modera e valida em campo, mas não gerencia acessos", async ({ page }) => {
    await signInAs(page, "tecnico", "/ciencia-cidada");
    await waitForScreen(page);
    await expect(page.getByRole("button", { name: "Validar" }).first()).toBeEnabled();

    await page.goto("/prescricao?bloco=vr-0092");
    const drawer = page.getByRole("dialog").filter({ hasText: "Checklist de validação em campo" });
    await expect(drawer.getByRole("button", { name: "Salvar checklist" })).toBeEnabled();

    await page.goto("/acessos");
    await expect(page).toHaveURL(/\/acesso-restrito\?rota=%2Facessos/);
  });

  test("passar pela landing não troca o perfil (links da demonstração sem efeito até o clique)", async ({
    page,
  }) => {
    await signInAs(page, "leitor-publico");
    await page.goto("/");
    // Hover nos links "Ver demonstração" (o App Router faria prefetch).
    for (const link of await page.getByRole("link", { name: /demonstração/i }).all()) {
      if (await link.isVisible()) await link.hover();
    }
    await page.waitForTimeout(1000);
    await page.goto("/mapa");
    await expect(
      page.getByRole("button", { name: /Perfil de acesso: Leitor Público/ }),
    ).toBeVisible();
  });

  test("Administrador vê a matriz e troca de perfil pelo cabeçalho", async ({ page }) => {
    await signInAs(page, "admin-municipal", "/acessos");
    await expect(page.getByRole("table", { name: /Permissões por perfil/ })).toBeVisible();

    await page.getByRole("button", { name: /Perfil de acesso: Administrador/ }).click();
    await page.getByRole("button", { name: roleLabel("leitor-publico") }).click();
    // A tela atual não é permitida ao novo perfil: volta ao mapa.
    await expect(page).toHaveURL(/\/mapa$/);
    await expect(
      page.getByRole("button", { name: /Perfil de acesso: Leitor Público/ }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Perfil de acesso/ }).click();
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/entrar$/);
  });
});
