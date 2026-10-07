import "server-only";
import { mockMunicipalityRepository } from "./mock/municipalities";
import type { Repositories } from "./types";

export type * from "./types";

/**
 * Ponto único de escolha da fonte de dados (`DATA_SOURCE`).
 * Hoje só existe `mock`; a implementação `postgis` entra quando o pipeline real estiver
 * disponível, sem alterar quem consome estes repositórios.
 */
const mockRepositories: Repositories = {
  municipalities: mockMunicipalityRepository,
};

export function getRepositories(): Repositories {
  const source = process.env.DATA_SOURCE ?? "mock";
  if (source !== "mock") {
    throw new Error(`DATA_SOURCE "${source}" ainda não implementado. Use "mock".`);
  }
  return mockRepositories;
}
