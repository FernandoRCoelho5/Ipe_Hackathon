import { render } from "@testing-library/react";
import { Activity } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Drawer } from "./drawer";

// O jsdom não implementa showModal/close: polyfill mínimo, com o evento "close" real.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

describe("<Drawer />", () => {
  it("fecha o <dialog> modal quando a tela fica oculta (Activity), sem disparar onClose", () => {
    const onClose = vi.fn();
    const ui = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <Drawer open onClose={onClose} title="Prescrição">
          conteúdo
        </Drawer>
      </Activity>
    );
    const { rerender, container } = render(ui("visible"));
    const dialog = container.ownerDocument.querySelector("dialog");
    expect(dialog?.open).toBe(true);

    // O App Router oculta a tela anterior ao navegar: o modal não pode continuar aberto,
    // senão a tela nova fica inerte.
    rerender(ui("hidden"));
    expect(dialog?.open).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    // Ao voltar para a tela, a gaveta reabre.
    rerender(ui("visible"));
    expect(dialog?.open).toBe(true);
  });
});
