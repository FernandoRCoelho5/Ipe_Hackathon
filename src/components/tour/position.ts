/**
 * Posição do cartão do tour em relação ao elemento destacado (função pura, testada).
 * Tenta abaixo, acima, à direita e à esquerda do alvo, nessa ordem; se nada couber
 * (alvo enorme, como o mapa), ancora no canto inferior direito da tela.
 */

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Placement = "bottom" | "top" | "right" | "left" | "corner" | "center";

const MARGIN = 16;
const GAP = 14;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function placeCard(
  target: Box | null,
  card: Size,
  viewport: Size,
): { top: number; left: number; placement: Placement } {
  if (!target) {
    return {
      top: Math.max(MARGIN, (viewport.height - card.height) / 2),
      left: Math.max(MARGIN, (viewport.width - card.width) / 2),
      placement: "center",
    };
  }

  const maxLeft = viewport.width - card.width - MARGIN;
  const maxTop = viewport.height - card.height - MARGIN;
  const centeredLeft = clamp(target.left + target.width / 2 - card.width / 2, MARGIN, maxLeft);
  const centeredTop = clamp(target.top + target.height / 2 - card.height / 2, MARGIN, maxTop);

  const below = target.top + target.height + GAP;
  if (below + card.height <= viewport.height - MARGIN) {
    return { top: below, left: centeredLeft, placement: "bottom" };
  }
  const above = target.top - GAP - card.height;
  if (above >= MARGIN) {
    return { top: above, left: centeredLeft, placement: "top" };
  }
  const right = target.left + target.width + GAP;
  if (right + card.width <= viewport.width - MARGIN) {
    return { top: centeredTop, left: right, placement: "right" };
  }
  const left = target.left - GAP - card.width;
  if (left >= MARGIN) {
    return { top: centeredTop, left, placement: "left" };
  }
  return { top: Math.max(MARGIN, maxTop), left: Math.max(MARGIN, maxLeft), placement: "corner" };
}
