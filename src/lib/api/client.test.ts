import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiClient, toSearchParams } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cliente da API", () => {
  it("monta query string ignorando vazios e juntando listas em CSV", () => {
    expect(
      toSearchParams({
        municipality: "volta-redonda",
        zones: ["comercial", "misto"],
        ivtuLevels: [],
        search: "",
        neighborhood: undefined,
        page: 2,
      }),
    ).toBe("?municipality=volta-redonda&zones=comercial%2Cmisto&page=2");
    expect(toSearchParams({})).toBe("");
  });

  it("devolve o corpo JSON em respostas 2xx", async () => {
    const fetchMock = vi.fn(async () => Response.json({ data: [1, 2] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiClient.get("/alerts", { municipality: "resende" })).resolves.toEqual({
      data: [1, 2],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/alerts?municipality=resende",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("converte ApiError em ApiClientError com código e request id", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json(
        { error: { code: "not_found", message: "Quarteirão x não encontrado", requestId: "r-1" } },
        { status: 404 },
      ),
    );
    const error = await apiClient.get("/blocks/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      status: 404,
      code: "not_found",
      requestId: "r-1",
      message: "Quarteirão x não encontrado",
    });
  });

  it("envia JSON nos POSTs", async () => {
    const fetchMock = vi.fn(async (...args: [string, RequestInit?]) => {
      void args;
      return Response.json({ ok: 1 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await apiClient.post("/esg/impact", { horizonYears: 10 });
    const init = fetchMock.mock.calls[0][1];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('{"horizonYears":10}');
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("traduz falha de rede em mensagem amigável", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(apiClient.get("/alerts")).rejects.toMatchObject({ code: "network", status: 0 });
  });
});
