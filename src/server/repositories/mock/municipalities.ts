import type { Municipality } from "@/domain/municipality/types";
import type { MunicipalityRepository } from "../types";

/**
 * Municípios do piloto. População: Censo 2022 (IBGE).
 * Centros e bounding boxes cobrem a mancha urbana principal de cada cidade.
 */
export const MOCK_MUNICIPALITIES: readonly Municipality[] = [
  {
    id: "volta-redonda",
    name: "Volta Redonda",
    state: "RJ",
    ibgeCode: "3306305",
    population: 261_563,
    populationYear: 2022,
    center: [-44.104, -22.5231],
    bbox: [-44.17, -22.585, -44.035, -22.46],
    defaultZoom: 13,
  },
  {
    id: "barra-mansa",
    name: "Barra Mansa",
    state: "RJ",
    ibgeCode: "3300407",
    population: 169_894,
    populationYear: 2022,
    center: [-44.1714, -22.544],
    bbox: [-44.23, -22.59, -44.12, -22.505],
    defaultZoom: 13.5,
  },
  {
    id: "resende",
    name: "Resende",
    state: "RJ",
    ibgeCode: "3304201",
    population: 129_612,
    populationYear: 2022,
    center: [-44.4467, -22.4689],
    bbox: [-44.505, -22.51, -44.39, -22.43],
    defaultZoom: 13.5,
  },
];

export const mockMunicipalityRepository: MunicipalityRepository = {
  async list() {
    return [...MOCK_MUNICIPALITIES];
  },
  async getById(id) {
    return MOCK_MUNICIPALITIES.find((municipality) => municipality.id === id) ?? null;
  },
};
