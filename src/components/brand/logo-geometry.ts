/**
 * Geometria vetorial do logotipo Ipê (versão provisória, ver docs/BRAND.md).
 *
 * Wordmark "ipê" em letras geométricas (unidades: altura-x = 100):
 *  - "i": haste 28 × 100 e pingo com diâmetro X = 29 (X define a área de proteção 2X);
 *  - "p": haste com descendente e bojo circular com folha no miolo;
 *  - "ê": anel aberto à direita com barra horizontal e acento circunflexo.
 */

const r = (n: number) => Math.round(n * 100) / 100;

function polar(cx: number, cy: number, radius: number, degrees: number): [number, number] {
  const rad = (degrees * Math.PI) / 180;
  return [r(cx + radius * Math.cos(rad)), r(cy + radius * Math.sin(rad))];
}

/** Anel completo (usar com fill-rule="evenodd"). */
function ring(cx: number, cy: number, outer: number, inner: number): string {
  const circle = (rad: number) =>
    `M${r(cx - rad)} ${cy}a${rad} ${rad} 0 1 0 ${rad * 2} 0a${rad} ${rad} 0 1 0 ${-rad * 2} 0Z`;
  return `${circle(outer)}${circle(inner)}`;
}

/** Setor de anel de `from` a `to` graus, no sentido horário (convenção SVG, y para baixo). */
function annularSector(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  from: number,
  to: number,
): string {
  const sweep = (((to - from) % 360) + 360) % 360;
  const large = sweep > 180 ? 1 : 0;
  const [ox1, oy1] = polar(cx, cy, outer, from);
  const [ox2, oy2] = polar(cx, cy, outer, to);
  const [ix2, iy2] = polar(cx, cy, inner, to);
  const [ix1, iy1] = polar(cx, cy, inner, from);
  return `M${ox1} ${oy1}A${outer} ${outer} 0 ${large} 1 ${ox2} ${oy2}L${ix2} ${iy2}A${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1}Z`;
}

export const WORDMARK = {
  /** viewBox do wordmark isolado: x, y, largura, altura. */
  viewBox: { x: 0, y: -46, width: 260, height: 197 },
  iDot: { cx: 14, cy: -27, r: 14.5 },
  iStem: { x: 0, y: 0, width: 28, height: 100 },
  pStem: { x: 50, y: 0, width: 28, height: 150 },
  pBowl: ring(101, 50, 50, 23),
  /** Folha inscrita no miolo do "p" (centro 101,50). */
  leaf: "M-19 0Q0-12.5 19 0Q0 12.5-19 0Z",
  leafVein: "M-15.5 0.8Q0-1.4 15.5 0",
  leafTransform: "translate(101 50.5) rotate(-48)",
  eBowl: annularSector(210, 50, 50, 23.5, 36, 360),
  eBar: { x: 186, y: 42.5, width: 73.5, height: 15 },
  circumflex: "M183-6L210-30L237-6L237-21L210-45L183-21Z",
} as const;

/** Arcos de calor do sol, centrados no sol do símbolo (82, 36). */
function sunArc(radius: number, from: number, to: number): string {
  const [x1, y1] = polar(82, 36, radius, from);
  const [x2, y2] = polar(82, 36, radius, to);
  const large = to - from > 180 ? 1 : 0;
  return `M${x1} ${y1}A${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
}

export const SYMBOL = {
  viewBox: "0 0 120 120",
  heart:
    "M60 112C38 96 10 76 10 46C10 28 23 16 39 16C49 16 56 21 60 29C64 21 71 16 81 16C97 16 110 28 110 46C110 76 82 96 60 112Z",
  swoosh: "M8 54C6 31 25 11 53 8C35 15 22 29 17 50Z",
  sunArcs: [sunArc(21, -110, 10), sunArc(27, -95, 25), sunArc(27, 37, 58)],
  land: "M0 64H120V120H0Z",
  river: "M0 92C26 84 56 76 108 67L111 72C64 80 36 94 26 120H0Z",
  hillShadow: "M30 120C40 96 64 82 104 72L112 69C70 80 46 96 36 120Z",
  hill: "M36 120C46 96 70 80 112 68V120Z",
  circuits: ["M53 116V100L65 88", "M60 114V102L70 92", "M67 110V104L73 98"],
  circuitNodes: [
    [66.5, 86.5],
    [71.5, 90.5],
    [74.5, 96.5],
  ],
} as const;
