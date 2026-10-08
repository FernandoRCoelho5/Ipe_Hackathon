import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MunicipalitiesProvider } from "@/components/layout/municipality-context";
import { MOCK_MUNICIPALITIES } from "@/server/repositories/mock/municipalities";
import { useSessionStore } from "@/stores/session-store";
import { useTourStore } from "@/stores/tour-store";
import { TourOverlay } from "./tour-overlay";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/server/auth/actions", () => ({ signInAs: vi.fn() }));

function renderTour() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MunicipalitiesProvider municipalities={MOCK_MUNICIPALITIES}>
        <TourOverlay />
      </MunicipalitiesProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // Ranking IVTU: o 1º quarteirão do município conduz o roteiro.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ data: [{ id: "vr-0092", code: "VR-0092" }], meta: {} })),
  );
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
  useSessionStore.setState({ ready: true, role: "admin-municipal" });
});

afterEach(() => {
  act(() => useTourStore.getState().close());
  vi.unstubAllGlobals();
  push.mockReset();
});

describe("<TourOverlay /> (Modo Apresentação)", () => {
  it("fica fechado até alguém iniciar o tour", () => {
    renderTour();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre na introdução e começa pelo mapa do quarteirão mais crítico", async () => {
    const user = userEvent.setup();
    renderTour();
    act(() => useTourStore.getState().start({ fromDemo: true }));

    expect(await screen.findByRole("heading", { name: "Modo apresentação" })).toBeInTheDocument();
    expect(await screen.findByText(/quarteirão mais crítico \(VR-0092\)/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Começar o tour/ }));
    expect(screen.getByRole("heading", { name: "Ilhas de calor por quarteirão" })).toHaveFocus();
    expect(screen.getByText("Passo 1 de 12")).toBeInTheDocument();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/mapa", { scroll: false }));
  });

  it("navega pelo teclado (→ e ←) e encerra com Esc", async () => {
    const user = userEvent.setup();
    renderTour();
    act(() => {
      useTourStore.getState().start();
      useTourStore.getState().goTo(3);
    });
    const heading = await screen.findByRole("heading", { name: "O quarteirão mais crítico" });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/mapa?bloco=vr-0092", { scroll: false }),
    );

    heading.focus();
    await user.keyboard("{ArrowRight}");
    expect(
      await screen.findByRole("heading", { name: "Prescrição com justificativa" }),
    ).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(
      await screen.findByRole("heading", { name: "O quarteirão mais crítico" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useTourStore.getState().open).toBe(false);
  });

  it("avisa que troca para o Administrador quando outro perfil inicia o tour", async () => {
    useSessionStore.setState({ ready: true, role: "leitor-publico" });
    renderTour();
    act(() => useTourStore.getState().start());
    expect(await screen.findByText(/usa o perfil Administrador Municipal/)).toBeInTheDocument();
  });
});
