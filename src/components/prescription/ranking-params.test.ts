import { describe, expect, it } from "vitest";
import { patchSearchParams } from "@/lib/use-url-state";
import {
  hasActiveFilters,
  parseRankingState,
  rankingStateToUrl,
  RANKING_PAGE_SIZE,
  toRankingFilters,
} from "./ranking-params";

const parse = (query: string) => parseRankingState(new URLSearchParams(query));

describe("filtros do ranking na URL", () => {
  it("usa padrões sensatos sem parâmetros", () => {
    const state = parse("");
    expect(state).toMatchObject({ sort: "ivtu", order: "desc", page: 1, levels: [], zones: [] });
    expect(hasActiveFilters(state)).toBe(false);
  });

  it("lê filtros válidos e descarta valores desconhecidos", () => {
    const state = parse(
      "nivel=critico,inexistente,alto&uso=comercial&intervencao=telhado-frio&prazo=xyz&ordem=utci&dir=asc&pagina=-3&q=Rua",
    );
    expect(state.levels).toEqual(["alto", "critico"]);
    expect(state.zones).toEqual(["comercial"]);
    expect(state.intervention).toBe("telhado-frio");
    expect(state.executionLevel).toBe("");
    expect(state.sort).toBe("utci");
    expect(state.order).toBe("asc");
    expect(state.page).toBe(1);
    expect(hasActiveFilters(state)).toBe(true);
  });

  it("faz ida e volta pela URL omitindo os padrões", () => {
    const original = parse("nivel=critico&bairro=Centro&ordem=priority&pagina=3");
    const query = patchSearchParams("", rankingStateToUrl(original));
    expect(query).not.toContain("dir=");
    expect(parse(query)).toEqual(original);
  });

  it("converte o estado em filtros da API", () => {
    const filters = toRankingFilters(parse("nivel=alto&q=VR-00"), "volta-redonda");
    expect(filters).toMatchObject({
      municipality: "volta-redonda",
      ivtuLevels: ["alto"],
      search: "VR-00",
      neighborhood: undefined,
      pageSize: RANKING_PAGE_SIZE,
    });
  });
});
