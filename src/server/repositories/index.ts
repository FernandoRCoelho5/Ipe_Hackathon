import "server-only";
import { createMockRepositories } from "./mock";
import type { Repositories } from "./types";

export type * from "./types";

/**
 * Ponto único de escolha da fonte de dados (`DATA_SOURCE`).
 * Hoje só existe `mock`; a implementação `postgis` entra com o pipeline real, sem
 * alterar quem consome estes repositórios.
 *
 * A instância fica em `globalThis` para sobreviver ao hot reload em desenvolvimento:
 * escritas feitas durante a demonstração (relatos, cenários) não se perdem a cada edição.
 */
const globalForRepositories = globalThis as unknown as { __ipeRepositories?: Repositories };

export function getRepositories(): Repositories {
  const source = process.env.DATA_SOURCE ?? "mock";
  if (source !== "mock") {
    throw new Error(`DATA_SOURCE "${source}" ainda não implementado. Use "mock".`);
  }
  globalForRepositories.__ipeRepositories ??= createMockRepositories();
  return globalForRepositories.__ipeRepositories;
}
