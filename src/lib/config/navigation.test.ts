import { describe, expect, it } from "vitest";
import { isNavItemActive, navItems } from "./navigation";

describe("navegação", () => {
  it("expõe as seis telas da plataforma com rotas únicas", () => {
    expect(navItems.map((item) => item.href)).toEqual([
      "/mapa",
      "/prescricao",
      "/simulador",
      "/relatorios",
      "/ciencia-cidada",
      "/adote-ilha-verde",
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
});
