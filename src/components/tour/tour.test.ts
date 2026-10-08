import { describe, expect, it } from "vitest";
import { placeCard } from "./position";
import { isAtStepLocation, TOUR_STEPS } from "./steps";

const viewport = { width: 1280, height: 800 };
const card = { width: 360, height: 220 };

describe("posição do cartão do tour", () => {
  it("sem alvo, centraliza", () => {
    expect(placeCard(null, card, viewport)).toEqual({ top: 290, left: 460, placement: "center" });
  });

  it("prefere abaixo do alvo, centralizado e dentro da tela", () => {
    const pos = placeCard({ top: 80, left: 1200, width: 60, height: 36 }, card, viewport);
    expect(pos.placement).toBe("bottom");
    expect(pos.top).toBe(80 + 36 + 14);
    expect(pos.left + card.width).toBeLessThanOrEqual(viewport.width - 16);
  });

  it("vai para cima quando não cabe abaixo", () => {
    const pos = placeCard({ top: 600, left: 100, width: 300, height: 150 }, card, viewport);
    expect(pos).toMatchObject({ placement: "top", top: 600 - 14 - 220 });
  });

  it("usa a lateral quando o alvo ocupa a altura toda", () => {
    const pos = placeCard({ top: 72, left: 0, width: 700, height: 728 }, card, viewport);
    expect(pos.placement).toBe("right");
    expect(pos.left).toBe(714);
  });

  it("alvo enorme (mapa em tela cheia): canto inferior direito", () => {
    const pos = placeCard({ top: 72, left: 0, width: 1280, height: 728 }, card, viewport);
    expect(pos).toEqual({ top: 800 - 220 - 16, left: 1280 - 360 - 16, placement: "corner" });
  });
});

describe("roteiro do tour", () => {
  it("começa pela introdução, percorre as seis telas e termina nos perfis", () => {
    expect(TOUR_STEPS[0].id).toBe("intro");
    expect(TOUR_STEPS.at(-1)?.id).toBe("profiles");
    const paths = TOUR_STEPS.flatMap((s) =>
      s.path ? [new URL(s.path({ blockId: "vr-0001" }), "http://x").pathname] : [],
    );
    expect(new Set(paths)).toEqual(
      new Set([
        "/mapa",
        "/prescricao",
        "/simulador",
        "/relatorios",
        "/ciencia-cidada",
        "/adote-ilha-verde",
      ]),
    );
    expect(TOUR_STEPS.every((s) => s.title && s.body)).toBe(true);
  });

  it("reconhece a tela do passo sem exigir os demais parâmetros", () => {
    const here = { pathname: "/mapa", search: "?bloco=vr-0001&camada=lst" };
    expect(isAtStepLocation("/mapa", here)).toBe(true);
    expect(isAtStepLocation("/mapa?bloco=vr-0001", here)).toBe(true);
    expect(isAtStepLocation("/mapa?bloco=vr-0002", here)).toBe(false);
    expect(isAtStepLocation("/simulador?bloco=vr-0001", here)).toBe(false);
  });
});
