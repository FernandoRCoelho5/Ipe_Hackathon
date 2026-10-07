import { z } from "zod";

/**
 * Catálogo de espécies para arborização urbana no Sul Fluminense (Mata Atlântica).
 * Dimensões de copa e altura são valores típicos na maturidade, para planejamento;
 * a escolha final cabe ao responsável técnico, considerando viveiros locais e o plano
 * municipal de arborização.
 */
export const TREE_SIZES = ["pequeno", "medio", "grande"] as const;
export type TreeSize = (typeof TREE_SIZES)[number];

export const TREE_SIZE_LABELS: Record<TreeSize, string> = {
  pequeno: "Pequeno porte",
  medio: "Médio porte",
  grande: "Grande porte",
};

export const SPECIES_IDS = [
  "ipe-amarelo",
  "ipe-roxo",
  "sibipiruna",
  "pau-ferro",
  "oiti",
  "quaresmeira",
  "aroeira-pimenteira",
] as const;
export const speciesIdSchema = z.enum(SPECIES_IDS);
export type SpeciesId = z.infer<typeof speciesIdSchema>;

export interface Species {
  id: SpeciesId;
  commonName: string;
  scientificName: string;
  size: TreeSize;
  /** Diâmetro de copa na maturidade (m). */
  crownDiameterM: number;
  heightM: number;
  native: boolean;
  /** Densidade de sombra da copa (0–1): fração da radiação interceptada. */
  shadeDensity: number;
  /** Copa alta, sem obstruir fachadas, vitrines e tráfego (indicada para zonas comerciais). */
  highCanopy: boolean;
  /** Largura mínima de calçada recomendada (m). */
  minSidewalkM: number;
  note: string;
}

export const SPECIES: Record<SpeciesId, Species> = {
  "ipe-amarelo": {
    id: "ipe-amarelo",
    commonName: "Ipê-amarelo",
    scientificName: "Handroanthus chrysotrichus",
    size: "medio",
    crownDiameterM: 6,
    heightM: 8,
    native: true,
    shadeDensity: 0.7,
    highCanopy: true,
    minSidewalkM: 2.4,
    note: "Florada marcante no inverno; perde folhas na seca, mas sombreia no verão.",
  },
  "ipe-roxo": {
    id: "ipe-roxo",
    commonName: "Ipê-roxo",
    scientificName: "Handroanthus impetiginosus",
    size: "grande",
    crownDiameterM: 8,
    heightM: 12,
    native: true,
    shadeDensity: 0.72,
    highCanopy: true,
    minSidewalkM: 3,
    note: "Copa alta e ampla; indicado para avenidas, canteiros centrais e praças.",
  },
  sibipiruna: {
    id: "sibipiruna",
    commonName: "Sibipiruna",
    scientificName: "Cenostigma pluviosum",
    size: "grande",
    crownDiameterM: 10,
    heightM: 12,
    native: true,
    shadeDensity: 0.8,
    highCanopy: true,
    minSidewalkM: 3,
    note: "Sombra densa e copa elevada; tradicional na arborização de vias no Sudeste.",
  },
  "pau-ferro": {
    id: "pau-ferro",
    commonName: "Pau-ferro",
    scientificName: "Libidibia ferrea",
    size: "grande",
    crownDiameterM: 10,
    heightM: 14,
    native: true,
    shadeDensity: 0.75,
    highCanopy: true,
    minSidewalkM: 3.5,
    note: "Porte elevado; prefira praças e canteiros amplos, longe de fiação aérea.",
  },
  oiti: {
    id: "oiti",
    commonName: "Oiti",
    scientificName: "Moquilea tomentosa",
    size: "medio",
    crownDiameterM: 8,
    heightM: 10,
    native: true,
    shadeDensity: 0.88,
    highCanopy: false,
    minSidewalkM: 2.4,
    note: "Perene e de sombra muito densa; ótimo para pontos de ônibus e calçadões.",
  },
  quaresmeira: {
    id: "quaresmeira",
    commonName: "Quaresmeira",
    scientificName: "Pleroma granulosum",
    size: "pequeno",
    crownDiameterM: 4,
    heightM: 6,
    native: true,
    shadeDensity: 0.6,
    highCanopy: false,
    minSidewalkM: 1.8,
    note: "Pequeno porte, compatível com calçadas estreitas e fiação aérea.",
  },
  "aroeira-pimenteira": {
    id: "aroeira-pimenteira",
    commonName: "Aroeira-pimenteira",
    scientificName: "Schinus terebinthifolia",
    size: "pequeno",
    crownDiameterM: 5,
    heightM: 6,
    native: true,
    shadeDensity: 0.65,
    highCanopy: false,
    minSidewalkM: 1.8,
    note: "Rústica e de crescimento rápido; boa para mutirões e áreas degradadas.",
  },
};

export function crownAreaM2(species: Species): number {
  return Math.PI * (species.crownDiameterM / 2) ** 2;
}

/** Espécies adequadas para uma calçada e zona, da mais para a menos indicada. */
export function suggestSpecies(sidewalkWidthM: number, needsHighCanopy: boolean): Species[] {
  return Object.values(SPECIES)
    .filter((s) => s.minSidewalkM <= Math.max(sidewalkWidthM, 1.8))
    .sort((a, b) => {
      if (needsHighCanopy && a.highCanopy !== b.highCanopy) return a.highCanopy ? -1 : 1;
      return b.shadeDensity * b.crownDiameterM - a.shadeDensity * a.crownDiameterM;
    });
}
