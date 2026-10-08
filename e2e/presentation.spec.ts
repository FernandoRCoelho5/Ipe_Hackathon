import { expect, test } from "./support";

/**
 * Modo Apresentação: da landing ao fim do tour guiado, pelo fluxo do pitch
 * (mapa → quarteirão crítico → prescrição → simulador → relatório → ciência cidadã →
 * Adote uma Ilha Verde → perfis).
 */

const STEPS = [
  { title: "Ilhas de calor por quarteirão", url: /\/mapa/ },
  { title: "Camadas e horário", url: /\/mapa/ },
  { title: "O quarteirão mais crítico", url: /\/mapa\?bloco=vr-/ },
  { title: "Prescrição com justificativa", url: /\/prescricao\?bloco=vr-/ },
  { title: "Validação em campo", url: /\/prescricao\?bloco=vr-/ },
  { title: "Simulador what-if", url: /\/simulador\?bloco=vr-/ },
  { title: "Alívio térmico estimado", url: /\/simulador\?bloco=vr-/ },
  { title: "Relatório para o Fundo Clima", url: /\/relatorios/ },
  { title: "Ciência cidadã", url: /\/ciencia-cidada/ },
  { title: "Sensores IoT e calibração", url: /\/ciencia-cidada\?aba=sensores/ },
  { title: "Adote uma Ilha Verde", url: /\/adote-ilha-verde/ },
  { title: "Perfis de acesso", url: /\/adote-ilha-verde/ },
] as const;

test.describe("Modo Apresentação", () => {
  test("?demo=1 deixa a demonstração pronta e o tour percorre o pitch", async ({
    page,
    consoleErrors,
  }) => {
    test.slow();
    await page.goto("/");
    await page.getByRole("link", { name: "Ver demonstração" }).first().click();

    // Pronto para apresentar: Administrador, Volta Redonda, quarteirão mais crítico.
    const tour = page.getByRole("dialog", { name: "Modo apresentação" });
    await expect(tour).toBeVisible();
    await expect(tour.getByText(/Volta Redonda, quarteirão mais crítico \(VR-\d+\)/)).toBeVisible();
    await expect(page).toHaveURL(/\/mapa\?bloco=vr-\d+$/);
    await expect(
      page.getByRole("button", { name: /Perfil de acesso: Administrador/ }),
    ).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Selecionar município" })).toHaveValue(
      "volta-redonda",
    );

    await tour.getByRole("button", { name: "Começar o tour" }).click();

    for (const [index, step] of STEPS.entries()) {
      const card = page.getByRole("dialog", { name: step.title });
      await expect(card).toBeVisible();
      await expect(card.getByText(`Passo ${index + 1} de ${STEPS.length}`)).toBeVisible();
      await expect(page).toHaveURL(step.url);
      // O alvo do passo apareceu (o cartão deixa de dizer "Abrindo a tela…").
      await expect(card.getByText("Abrindo a tela…")).toBeHidden();

      if (step.title === "Relatório para o Fundo Clima") {
        // O exemplo é preenchido e gerado sozinho, pronto para baixar.
        await expect(page.getByRole("button", { name: "Baixar PDF" })).toBeVisible();
        await expect(
          page.getByText("Corredores de sombra nos bairros mais vulneráveis").first(),
        ).toBeVisible();
      }
      if (step.title === "Alívio térmico estimado") {
        await expect(page.getByText(/UTCI no pico solar/)).toBeVisible();
      }

      await card
        .getByRole("button", { name: index === STEPS.length - 1 ? "Concluir" : "Próximo" })
        .click();
    }

    await expect(page.locator("[data-tour-layer]")).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });

  test("tour pelo teclado: setas navegam, Esc encerra, e retoma após recarregar", async ({
    page,
  }) => {
    await page.goto("/mapa?demo=1");
    await page.getByRole("button", { name: "Começar o tour" }).click();
    await expect(page.getByRole("dialog", { name: "Ilhas de calor por quarteirão" })).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("dialog", { name: "Camadas e horário" })).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("dialog", { name: "Ilhas de calor por quarteirão" })).toBeVisible();
    await page.keyboard.press("ArrowRight");

    await page.reload();
    await expect(page.getByRole("dialog", { name: "Camadas e horário" })).toBeVisible();

    await page.getByRole("dialog", { name: "Camadas e horário" }).locator("h2").focus();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-tour-layer]")).toHaveCount(0);
  });

  test("navegar a partir da gaveta da prescrição não deixa o simulador inerte", async ({
    page,
  }) => {
    await page.goto("/prescricao?demo=1");
    await page.getByRole("button", { name: "Explorar sozinho" }).click();
    const drawer = page.getByRole("dialog").filter({ hasText: "Intervenções recomendadas" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: "Simular este quarteirão" }).click();
    await expect(page).toHaveURL(/\/simulador\?bloco=/);
    // Clicar num controle do simulador prova que a tela não ficou inerte.
    await page.getByRole("button", { name: "Só arborização" }).click();
    await expect(page.getByRole("button", { name: "Só arborização" })).toBeFocused();
  });
});
