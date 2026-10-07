/**
 * Categorias de estresse térmico da escala UTCI (limites oficiais da escala de avaliação).
 */
export const THERMAL_STRESS_CATEGORIES = [
  { id: "estresse-extremo-calor", label: "Estresse extremo ao calor", min: 46, max: Infinity },
  { id: "estresse-muito-forte-calor", label: "Estresse muito forte ao calor", min: 38, max: 46 },
  { id: "estresse-forte-calor", label: "Estresse forte ao calor", min: 32, max: 38 },
  { id: "estresse-moderado-calor", label: "Estresse moderado ao calor", min: 26, max: 32 },
  { id: "sem-estresse", label: "Sem estresse térmico", min: 9, max: 26 },
  { id: "estresse-leve-frio", label: "Estresse leve ao frio", min: 0, max: 9 },
  { id: "estresse-moderado-frio", label: "Estresse moderado ao frio", min: -13, max: 0 },
  { id: "estresse-forte-frio", label: "Estresse forte ao frio", min: -27, max: -13 },
  { id: "estresse-muito-forte-frio", label: "Estresse muito forte ao frio", min: -40, max: -27 },
  { id: "estresse-extremo-frio", label: "Estresse extremo ao frio", min: -Infinity, max: -40 },
] as const;

export type ThermalStressCategoryId = (typeof THERMAL_STRESS_CATEGORIES)[number]["id"];
export type ThermalStressCategory = (typeof THERMAL_STRESS_CATEGORIES)[number];

/** Categoria de estresse para um valor de UTCI (°C). Limites inferiores são inclusivos. */
export function classifyThermalStress(utci: number): ThermalStressCategory {
  return (
    THERMAL_STRESS_CATEGORIES.find((category) => utci >= category.min && utci < category.max) ??
    THERMAL_STRESS_CATEGORIES[0]
  );
}

/**
 * Severidade ordinal ao calor: 0 (sem estresse ou frio) a 4 (extremo).
 * Usada em ordenações, ícones e padrões acessíveis do mapa.
 */
export function heatStressSeverity(utci: number): 0 | 1 | 2 | 3 | 4 {
  if (utci >= 46) return 4;
  if (utci >= 38) return 3;
  if (utci >= 32) return 2;
  if (utci >= 26) return 1;
  return 0;
}
