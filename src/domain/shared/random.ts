/**
 * Gerador pseudoaleatório determinístico (mulberry32).
 * Mesma semente ⇒ mesma sequência, em qualquer máquina: os dados demonstrativos
 * são reproduzíveis byte a byte.
 */
export interface Rng {
  /** Uniforme em [0, 1). */
  next(): number;
  /** Uniforme em [min, max). */
  range(min: number, max: number): number;
  /** Inteiro uniforme em [min, max]. */
  int(min: number, max: number): number;
  /** Normal aproximada (Box–Muller) com média e desvio. */
  normal(mean?: number, sd?: number): number;
  /** Verdadeiro com probabilidade `p`. */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Escolha ponderada: `weights[i]` é o peso de `items[i]`. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    normal: (mean = 0, sd = 1) => {
      const u = Math.max(next(), 1e-12);
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted: (items, weights) => {
      const total = weights.reduce((a, b) => a + b, 0);
      let threshold = next() * total;
      for (let i = 0; i < items.length; i++) {
        threshold -= weights[i];
        if (threshold < 0) return items[i];
      }
      return items[items.length - 1];
    },
  };
  return rng;
}

/** Hash FNV-1a de 32 bits: deriva sementes estáveis a partir de textos (ids, nomes). */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
