import { expect, expectNoHorizontalOverflow, test } from "./support";

/** Landing/pitch: seções do pitch, SEO e o formulário "Solicitar piloto". */

test.describe("landing @mobile", () => {
  test("seções do pitch, selo de estimativas e SEO", async ({ page, consoleErrors }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Saiba em qual rua/);
    for (const title of [
      /O calor extremo mata/,
      /Dos dados à obra/,
      /Onde o Ipê se diferencia/,
      /Arquitetura pronta para escalar/,
      /O que está em jogo/,
      /Do contrato com empresas/,
      /Solicite um piloto/,
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: title })).toBeAttached();
    }
    await expect(page.getByText("119.643")).toBeAttached();
    await expect(page.getByText("R$ 218.020").first()).toBeAttached();
    await expect(page.getByText("Estimativas a validar no piloto")).toBeAttached();
    await expect(page.getByRole("table", { name: /Comparação entre o Ipê/ })).toBeAttached();

    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /opengraph-image/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /^https?:\/\/[^/]+\/?$/,
    );
    await expectNoHorizontalOverflow(page);
    expect(consoleErrors).toEqual([]);
  });

  test("imagem de compartilhamento, robots e sitemap", async ({ request }) => {
    const image = await request.get("/opengraph-image");
    expect(image.headers()["content-type"]).toBe("image/png");
    expect((await image.body()).byteLength).toBeGreaterThan(10_000);
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /api/");
    expect(await (await request.get("/sitemap.xml")).text()).toContain("<loc>");
  });

  test("Solicitar piloto: valida, envia e mostra o protocolo", async ({ page }, testInfo) => {
    await page.goto("/#piloto");
    const form = page.locator("#piloto");
    await form.getByRole("button", { name: "Enviar pedido" }).click();
    await expect(
      form.getByText("É preciso autorizar o contato para enviar o pedido"),
    ).toBeVisible();
    await expect(form.getByLabel("Organização", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    await form.getByLabel("Organização", { exact: true }).fill("Prefeitura de Resende");
    await form.getByLabel("Município de interesse").fill("Resende");
    await form.getByLabel("Seu nome").fill(`Equipe e2e ${testInfo.project.name}`);
    await form.getByLabel("E-mail institucional").fill("meio.ambiente@resende.rj.gov.br");
    await form.getByLabel("Mapa de calor e diagnóstico").check();
    await form.getByLabel(/Autorizo o uso destes dados/).check();
    await form.getByRole("button", { name: "Enviar pedido" }).click();

    await expect(form.getByText("Pedido recebido")).toBeVisible();
    await expect(form.getByText(/Protocolo IPE-\d{4}-[A-Z0-9]{6}/)).toBeVisible();
  });
});
