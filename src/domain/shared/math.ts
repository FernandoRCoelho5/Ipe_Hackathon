/** Utilitários numéricos puros usados pelos modelos do domínio. */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Normalização min–max para [0, 1] com faixa de referência FIXA.
 * Faixas fixas (e não relativas ao conjunto de dados) mantêm o índice comparável
 * entre municípios e ao longo do tempo. Valores fora da faixa saturam em 0 ou 1.
 */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return clamp01((value - min) / (max - min));
}

/** Arredonda para `digits` casas decimais (evita ruído de ponto flutuante em saídas). */
export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

/** Média ponderada; pesos zerados ou vazios retornam 0. */
export function weightedMean(values: readonly number[], weights: readonly number[]): number {
  const totalWeight = sum(weights);
  if (totalWeight === 0) return 0;
  return sum(values.map((value, index) => value * (weights[index] ?? 0))) / totalWeight;
}

/** Coeficiente de correlação de Pearson. Retorna 0 quando não há variância. */
export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}
