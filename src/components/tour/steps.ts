import { messages } from "@/lib/i18n";

export type TourStepId = keyof typeof messages.tour.steps;

export interface TourContext {
  /** Quarteirão mais crítico (1º do ranking IVTU) do município do tour. */
  blockId: string;
}

export interface TourStep {
  id: TourStepId;
  title: string;
  body: string;
  /** Tela do passo. Sem `path`, o passo acontece onde o apresentador estiver. */
  path?: (context: TourContext) => string;
  /** Elemento destacado: `[data-tour="<target>"]`. Sem alvo, o cartão fica centralizado. */
  target?: string;
}

function step(id: TourStepId, options: Omit<TourStep, "id" | "title" | "body"> = {}): TourStep {
  return { id, ...messages.tour.steps[id], ...options };
}

const block = ({ blockId }: TourContext) => blockId;

/**
 * Roteiro do pitch (~4 min): mapa → quarteirão crítico → prescrição → simulador →
 * relatório para o Fundo Clima → ciência cidadã e IoT → Adote uma Ilha Verde → perfis.
 */
export const TOUR_STEPS: readonly TourStep[] = [
  step("intro"),
  step("map", { path: () => "/mapa", target: "map-canvas" }),
  step("layers", { path: () => "/mapa", target: "map-controls" }),
  step("block", { path: (c) => `/mapa?bloco=${block(c)}`, target: "block-panel" }),
  step("prescription", {
    path: (c) => `/prescricao?bloco=${block(c)}`,
    target: "prescription-detail",
  }),
  step("checklist", { path: (c) => `/prescricao?bloco=${block(c)}`, target: "field-checklist" }),
  step("simulator", { path: (c) => `/simulador?bloco=${block(c)}`, target: "simulator-controls" }),
  step("result", { path: (c) => `/simulador?bloco=${block(c)}`, target: "simulation-result" }),
  step("report", { path: () => "/relatorios?exemplo=1", target: "report-preview" }),
  step("citizen", { path: () => "/ciencia-cidada", target: "citizen-moderation" }),
  step("sensors", { path: () => "/ciencia-cidada?aba=sensores", target: "calibration" }),
  step("adopt", { path: () => "/adote-ilha-verde", target: "adoption-detail" }),
  step("profiles", { target: "profile-menu" }),
];

/**
 * Verdadeiro se a URL atual já é a tela do passo: mesmo caminho e os parâmetros pedidos
 * (outros parâmetros, como filtros escolhidos pelo apresentador, são preservados).
 */
export function isAtStepLocation(href: string, current: { pathname: string; search: string }) {
  const target = new URL(href, "http://ipe.local");
  if (target.pathname !== current.pathname) return false;
  const params = new URLSearchParams(current.search);
  return [...target.searchParams].every(([key, value]) => params.get(key) === value);
}
