/**
 * Coeficientes do simulador what-if.
 *
 * Todos são PREMISSAS DE PROJETO em ordem de grandeza compatível com a literatura de
 * clima urbano, a calibrar no piloto com os nós IoT e as séries de satélite.
 * Cada um traz unidade e justificativa para aparecer nos relatórios.
 */
export interface Coefficient {
  value: number;
  unit: string;
  justification: string;
}

export const SIMULATION_COEFFICIENTS = {
  sidewalkOverlap: {
    value: 0.55,
    unit: "fração da copa",
    justification:
      "Árvores na faixa de serviço projetam cerca de metade da copa sobre a calçada; o restante cai sobre a pista.",
  },
  crownGrowthYears: {
    value: 4.5,
    unit: "anos",
    justification:
      "Constante de crescimento da copa: ~50% do diâmetro adulto em 3 anos e ~90% em 10 anos, com mudas de 2,5 m ou mais.",
  },
  treeSpacingM: {
    value: 8,
    unit: "m entre árvores",
    justification: "Espaçamento usual em calçadas para copas de médio porte.",
  },
  soilAreaPerTreeM2: {
    value: 30,
    unit: "m² por árvore",
    justification: "Área de canteiro, praça ou recuo necessária por árvore.",
  },
  lstPerCanopy: {
    value: 13,
    unit: "°C de LST por unidade de cobertura arbórea",
    justification: "Sombra e evapotranspiração reduzem a temperatura de superfície do quarteirão.",
  },
  lstPermeable: {
    value: 9,
    unit: "°C de LST por unidade de área convertida",
    justification: "Pisos drenantes retêm umidade e aquecem menos que o asfalto no pico solar.",
  },
  lstCoolRoof: {
    value: 12,
    unit: "°C de LST por unidade de área pintada",
    justification: "Tintas de alta refletância reduzem a temperatura de telhados metálicos.",
  },
  roofPedestrianWeight: {
    value: 0.35,
    unit: "fração",
    justification:
      "O pedestre “vê” pouco dos telhados: só parte da redução de temperatura dos telhados chega ao nível da rua.",
  },
  airPermeable: {
    value: 0.4,
    unit: "°C por unidade de área convertida",
    justification: "Resfriamento do ar pela evaporação da umidade retida no pavimento.",
  },
  airCoolRoof: {
    value: 0.5,
    unit: "°C por unidade de área pintada",
    justification: "Menos calor sensível liberado pelos telhados para o ar do entorno.",
  },
  runoffImpervious: {
    value: 0.9,
    unit: "coef. de escoamento",
    justification: "Valor típico de tabelas do método racional para pavimento asfáltico.",
  },
  runoffRoof: {
    value: 0.95,
    unit: "coef. de escoamento",
    justification: "Valor típico para coberturas metálicas e de fibrocimento.",
  },
  runoffPermeable: {
    value: 0.35,
    unit: "coef. de escoamento",
    justification: "Valor típico para pavimento intertravado drenante.",
  },
  runoffPervious: {
    value: 0.2,
    unit: "coef. de escoamento",
    justification: "Valor típico para canteiros e gramados.",
  },
  etCanopy: {
    value: 1,
    unit: "índice relativo",
    justification: "Copa arbórea como referência de evapotranspiração.",
  },
  etPervious: {
    value: 0.6,
    unit: "índice relativo",
    justification: "Solo vegetado rasteiro evapotranspira menos que a copa.",
  },
  etPermeable: {
    value: 0.12,
    unit: "índice relativo",
    justification: "Piso drenante evapora a água retida nas juntas e na base.",
  },
  annualRainfallM: {
    value: 1.4,
    unit: "m/ano",
    justification:
      "Precipitação anual de referência para o Médio Paraíba (premissa ajustável por município).",
  },
} satisfies Record<string, Coefficient>;

export type SimulationCoefficients = { [K in keyof typeof SIMULATION_COEFFICIENTS]: number };

export function centralCoefficients(): SimulationCoefficients {
  return Object.fromEntries(
    Object.entries(SIMULATION_COEFFICIENTS).map(([key, c]) => [key, c.value]),
  ) as SimulationCoefficients;
}

/**
 * Cenários de sensibilidade. O resultado do simulador é apresentado como faixa
 * (conservador → otimista) e nunca como valor único falsamente exato.
 */
export const SENSITIVITY = {
  conservative: { coefficientFactor: 0.7, overlap: 0.4, shadeEfficacy: 0.7 },
  central: { coefficientFactor: 1, overlap: 0.55, shadeEfficacy: 0.85 },
  optimistic: { coefficientFactor: 1.2, overlap: 0.65, shadeEfficacy: 0.92 },
} as const;
export type SensitivityCase = keyof typeof SENSITIVITY;
