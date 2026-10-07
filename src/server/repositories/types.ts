import type { Municipality } from "@/domain/municipality/types";

/**
 * Contratos de acesso a dados.
 * A interface e as rotas da API dependem apenas destes contratos; a implementação
 * `mock` (dados demonstrativos) pode ser trocada por PostGIS ou pelo backend FastAPI
 * sem mudanças no domínio ou nas telas. Ver docs/ARCHITECTURE.md.
 */
export interface MunicipalityRepository {
  list(): Promise<Municipality[]>;
  getById(id: string): Promise<Municipality | null>;
}

export interface Repositories {
  municipalities: MunicipalityRepository;
}
