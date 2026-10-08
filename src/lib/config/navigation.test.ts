import { describe, expect, it } from "vitest";
import { isNavItemActive, navItems, visibleNavGroups } from "./navigation";

const hrefs = (role: Parameters<typeof visibleNavGroups>[0]) =>
  visibleNavGroups(role).flatMap((group) => group.items.map((item) => item.href));

describe("navegação", () => {
  it("expõe as seis telas da plataforma e a gestão de acessos, com rotas únicas", () => {
    expect(navItems.map((item) => item.href)).toEqual([
      "/mapa",
      "/prescricao",
      "/simulador",
      "/relatorios",
      "/ciencia-cidada",
      "/adote-ilha-verde",
      "/acessos",
    ]);
    expect(navItems.every((item) => item.label.length > 0 && item.description.length > 0)).toBe(
      true,
    );
  });

  it("marca como ativa a rota exata e suas sub-rotas, sem falsos positivos por prefixo", () => {
    const map = { href: "/mapa" as const };
    expect(isNavItemActive(map, "/mapa")).toBe(true);
    expect(isNavItemActive(map, "/mapa/quarteirao/42")).toBe(true);
    expect(isNavItemActive(map, "/mapas")).toBe(false);
    expect(isNavItemActive(map, "/")).toBe(false);
  });

  it("mostra só o que o perfil pode abrir (RF08)", () => {
    expect(hrefs("admin-municipal")).toContain("/acessos");
    expect(hrefs("tecnico")).not.toContain("/acessos");
    expect(hrefs("leitor-publico")).not.toContain("/relatorios");
    expect(hrefs("cliente-corporativo")).toContain("/relatorios");
    expect(visibleNavGroups("tecnico").map((g) => g.id)).toEqual(["diagnosis", "funding"]);
  });

  it("enquanto a sessão carrega, mostra as telas gerais e esconde a gestão", () => {
    expect(hrefs(null)).toEqual(navItems.map((i) => i.href).filter((h) => h !== "/acessos"));
  });
});
