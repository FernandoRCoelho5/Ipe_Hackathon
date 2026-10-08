import { describe, expect, it } from "vitest";
import {
  can,
  canAccessRoute,
  isPlatformRoute,
  PERMISSIONS,
  permissionsOf,
  ROLE_IDS,
  ROLES,
  routePermission,
  safeReturnPath,
} from "./access";

describe("matriz de permissões (RF08)", () => {
  it("define os quatro perfis do esquema SQL, do mais amplo ao mais restrito", () => {
    expect(ROLES.map((r) => r.id)).toEqual([...ROLE_IDS]);
    const sizes = ROLE_IDS.map((role) => permissionsOf(role).length);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  });

  it("Administrador Municipal pode tudo; Leitor Público não pode nenhuma ação", () => {
    expect(PERMISSIONS.every((p) => can("admin-municipal", p))).toBe(true);
    expect(permissionsOf("leitor-publico")).toEqual([]);
  });

  it("Leitor Público não salva cenários nem exporta relatórios", () => {
    expect(can("leitor-publico", "scenario:save")).toBe(false);
    expect(can("leitor-publico", "report:generate")).toBe(false);
  });

  it("Cliente Corporativo gera relatório ESG, mas não editais públicos nem moderação", () => {
    expect(can("cliente-corporativo", "report:generate")).toBe(true);
    expect(can("cliente-corporativo", "report:public-funding")).toBe(false);
    expect(can("cliente-corporativo", "citizen-report:moderate")).toBe(false);
    expect(can("cliente-corporativo", "checklist:edit")).toBe(false);
    expect(can("cliente-corporativo", "adoption:create")).toBe(true);
  });

  it("só o Administrador gerencia acessos", () => {
    expect(ROLE_IDS.filter((role) => can(role, "access:manage"))).toEqual(["admin-municipal"]);
  });

  it("perfis mais amplos contêm as permissões dos mais restritos", () => {
    for (let i = 1; i < ROLE_IDS.length; i++) {
      const wider = new Set(permissionsOf(ROLE_IDS[i - 1]));
      for (const permission of permissionsOf(ROLE_IDS[i])) {
        expect(wider.has(permission), `${ROLE_IDS[i - 1]} ⊇ ${permission}`).toBe(true);
      }
    }
  });
});

describe("permissão por rota", () => {
  it("reconhece as telas da plataforma e suas sub-rotas, sem falso positivo por prefixo", () => {
    expect(isPlatformRoute("/mapa")).toBe(true);
    expect(isPlatformRoute("/relatorios/abc")).toBe(true);
    expect(isPlatformRoute("/mapas")).toBe(false);
    expect(isPlatformRoute("/")).toBe(false);
    expect(isPlatformRoute("/entrar")).toBe(false);
    expect(isPlatformRoute("/privacidade")).toBe(false);
  });

  it("Relatórios exigem gerar relatório; Perfis e acessos, gerenciar acessos", () => {
    expect(routePermission("/relatorios")).toBe("report:generate");
    expect(routePermission("/acessos")).toBe("access:manage");
    expect(routePermission("/mapa")).toBeUndefined();

    expect(canAccessRoute("leitor-publico", "/relatorios")).toBe(false);
    expect(canAccessRoute("leitor-publico", "/mapa")).toBe(true);
    expect(canAccessRoute("cliente-corporativo", "/relatorios")).toBe(true);
    expect(canAccessRoute("tecnico", "/acessos")).toBe(false);
    expect(canAccessRoute("admin-municipal", "/acessos")).toBe(true);
  });
});

describe("caminho de retorno seguro", () => {
  it("aceita caminhos internos com query string", () => {
    expect(safeReturnPath("/simulador?bloco=vr-0001")).toBe("/simulador?bloco=vr-0001");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "mapa",
    "/ma\npa",
    "",
    undefined,
    42,
  ])("recusa %s", (value) => {
    expect(safeReturnPath(value)).toBe("/mapa");
  });
});
