import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./Logo";

describe("<Logo />", () => {
  it("expõe nome acessível na assinatura horizontal", () => {
    render(<Logo />);
    expect(
      screen.getByRole("img", { name: "Ipê – Inteligência Térmica Urbana" }),
    ).toBeInTheDocument();
  });

  it("some da árvore de acessibilidade quando decorativo", () => {
    const { container } = render(<Logo variant="symbol" decorative />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("gera ids de gradiente únicos para várias instâncias na mesma página", () => {
    const { container } = render(
      <>
        <Logo />
        <Logo tone="negative" />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("[id]")).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("versão negativa usa wordmark branco sobre fundo escuro", () => {
    const { container } = render(<Logo variant="wordmark" tone="negative" />);
    expect(container.querySelector("g[fill='#ffffff']")).not.toBeNull();
  });
});
