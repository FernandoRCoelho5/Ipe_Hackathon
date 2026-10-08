import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useSessionStore } from "@/stores/session-store";
import { PermissionNote } from "./permission-note";

afterEach(() => useSessionStore.setState({ ready: false, role: null }));

describe("<PermissionNote />", () => {
  it("não mostra nada enquanto a sessão carrega", () => {
    const { container } = render(<PermissionNote permission="scenario:save" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("explica o bloqueio quando o perfil não tem a permissão", () => {
    render(<PermissionNote permission="report:generate" />);
    act(() => useSessionStore.getState().setRole("leitor-publico"));
    expect(
      screen.getByText(
        /O perfil Leitor Público não permite gerar e exportar relatórios \(PDF e DOCX\)/,
      ),
    ).toBeInTheDocument();
  });

  it("some quando o perfil pode", () => {
    const { container } = render(<PermissionNote permission="scenario:save" />);
    act(() => useSessionStore.getState().setRole("cliente-corporativo"));
    expect(container).toBeEmptyDOMElement();
  });
});
