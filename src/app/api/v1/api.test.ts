// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import {
  adoptionListResponseSchema,
  adoptionSummarySchema,
  alertListResponseSchema,
  apiErrorSchema,
  blockDetailResponseSchema,
  calibrationResponseSchema,
  checklistResponseSchema,
  citizenReportListResponseSchema,
  esgResultSchema,
  fundingProgramListResponseSchema,
  iotNodeListResponseSchema,
  iotReadingsResponseSchema,
  mapLayersResponseSchema,
  municipalityListResponseSchema,
  pilotRequestReceiptResponseSchema,
  rankingResponseSchema,
  reportDocumentSchema,
  savedScenarioListResponseSchema,
  utciByHourResponseSchema,
  whatIfResponseSchema,
} from "@/lib/api/contracts";
import type { RoleId } from "@/domain/access/access";
import { citizenReportSchema } from "@/domain/citizen/schema";
import { savedScenarioSchema } from "@/domain/simulation/saved-scenario";
import { getSessionSecret } from "@/server/auth/session";
import { SESSION_COOKIE, signSession } from "@/server/auth/session-token";
import { withApi } from "@/server/http/handler";
import { createRateLimiter } from "@/server/http/rate-limit";
import * as adoptionById from "./adoptions/[id]/route";
import * as adoptions from "./adoptions/route";
import * as alerts from "./alerts/route";
import * as checklist from "./blocks/[id]/checklist/route";
import * as blockById from "./blocks/[id]/route";
import * as reportById from "./citizen-reports/[id]/route";
import * as reports from "./citizen-reports/route";
import * as esg from "./esg/impact/route";
import * as readings from "./iot-nodes/[id]/readings/route";
import * as calibration from "./iot-nodes/calibration/route";
import * as iotNodes from "./iot-nodes/route";
import * as municipalities from "./municipalities/route";
import * as pilotRequests from "./pilot-requests/route";
import * as ranking from "./prescriptions/ivtu-ranking/route";
import * as preview from "./reports/preview/route";
import * as programs from "./reports/programs/route";
import * as scenarios from "./simulation/scenarios/route";
import * as whatIf from "./simulation/what-if/route";
import * as mapLayers from "./thermals/map-layers/route";
import * as utciByHour from "./thermals/utci-by-hour/route";

const BASE = "http://localhost/api/v1";

type Handler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

async function sessionCookie(role: RoleId): Promise<string> {
  const { token } = await signSession(role, getSessionSecret());
  return `${SESSION_COOKIE}=${token}`;
}

/**
 * Chama o handler como o navegador faria. Por padrão, com a sessão do Administrador
 * Municipal; `as: null` simula uma requisição sem login.
 */
async function call(
  handler: Handler,
  path: string,
  init: RequestInit & { json?: unknown; as?: RoleId | null } = {},
  params: Record<string, string> = {},
) {
  const { json, as = "admin-municipal", ...rest } = init;
  const headers = new Headers(rest.headers);
  if (as) headers.set("cookie", await sessionCookie(as));
  if (json !== undefined) headers.set("content-type", "application/json");
  const request = new Request(`${BASE}${path}`, {
    ...rest,
    headers,
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });
  const response = await handler(request, { params: Promise.resolve(params) });
  return { response, body: (await response.json()) as unknown };
}

function expectShape<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw new Error(JSON.stringify(result.error.issues.slice(0, 5), null, 2));
  return result.data;
}

function expectError(body: unknown, code: string) {
  const parsed = expectShape(apiErrorSchema, body);
  expect(parsed.error.code).toBe(code);
  return parsed;
}

describe("API v1 — municípios, alertas e camadas térmicas", () => {
  it("lista municípios", async () => {
    const { response, body } = await call(municipalities.GET as Handler, "/municipalities");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toMatch(/[0-9a-f-]{36}/);
    expect(expectShape(municipalityListResponseSchema, body).data).toHaveLength(3);
  });

  it("alertas ativos e erro padronizado para município desconhecido", async () => {
    const ok = await call(alerts.GET as Handler, "/alerts?municipality=volta-redonda");
    expect(expectShape(alertListResponseSchema, ok.body).data).toHaveLength(1);
    const missing = await call(alerts.GET as Handler, "/alerts?municipality=petropolis");
    expect(missing.response.status).toBe(404);
    expectError(missing.body, "not_found");
  });

  it("camadas do mapa: GeoJSON válido, UTCI varia com a hora e cache privado", async () => {
    const noon = await call(
      mapLayers.GET as Handler,
      "/thermals/map-layers?municipality=volta-redonda",
    );
    expect(noon.response.headers.get("cache-control")).toContain("private");
    const layers = expectShape(mapLayersResponseSchema, noon.body);
    expect(layers.meta.hour).toBe(14);
    expect(layers.features.length).toBeGreaterThan(300);
    expect(layers.meta.notice.demo).toBe(true);

    const morning = expectShape(
      mapLayersResponseSchema,
      (
        await call(
          mapLayers.GET as Handler,
          "/thermals/map-layers?municipality=volta-redonda&hour=8",
        )
      ).body,
    );
    expect(morning.meta.ranges.utci[1]).toBeLessThan(layers.meta.ranges.utci[1]);
  });

  it("UTCI de 08h a 18h por quarteirão, coerente com a camada da hora", async () => {
    const all = expectShape(
      utciByHourResponseSchema,
      (await call(utciByHour.GET as Handler, "/thermals/utci-by-hour?municipality=resende")).body,
    );
    expect(all.hours).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    const layer = expectShape(
      mapLayersResponseSchema,
      (await call(mapLayers.GET as Handler, "/thermals/map-layers?municipality=resende&hour=13"))
        .body,
    );
    const feature = layer.features[0];
    expect(all.values[feature.id][5]).toBeCloseTo(feature.properties.utci, 1);
  });

  it("comprime respostas JSON com gzip quando o cliente aceita", async () => {
    const response = await (mapLayers.GET as Handler)(
      new Request(`${BASE}/thermals/map-layers?municipality=resende`, {
        headers: { "accept-encoding": "gzip, br" },
      }),
      { params: Promise.resolve({}) },
    );
    expect(response.headers.get("content-encoding")).toBe("gzip");
    expect(response.headers.get("vary")).toContain("Accept-Encoding");
    const compressed = new Uint8Array(await response.arrayBuffer());
    const text = await new Response(
      new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).text();
    expect(compressed.byteLength).toBeLessThan(text.length / 4);
    expectShape(mapLayersResponseSchema, JSON.parse(text));
  });

  it("valida a query: hora fora da janela 08h–18h", async () => {
    const { response, body } = await call(
      mapLayers.GET as Handler,
      "/thermals/map-layers?municipality=resende&hour=22",
    );
    expect(response.status).toBe(400);
    expect(expectError(body, "bad_request").error.details?.[0].path).toBe("hour");
  });

  it("detalhe do quarteirão e 404", async () => {
    const ok = await call(blockById.GET as Handler, "/blocks/vr-0001", {}, { id: "vr-0001" });
    const detail = expectShape(blockDetailResponseSchema, ok.body);
    expect(detail.hourly).toHaveLength(11);
    expect(detail.notice.seal).toMatch(/Pré-diagnóstico/);
    const missing = await call(blockById.GET as Handler, "/blocks/xx", {}, { id: "xx" });
    expect(missing.response.status).toBe(404);
  });
});

describe("API v1 — ranking IVTU", () => {
  it("ordena por IVTU, pagina e mantém a posição absoluta", async () => {
    const { body } = await call(
      ranking.GET as Handler,
      "/prescriptions/ivtu-ranking?municipality=barra-mansa&pageSize=10",
    );
    const page = expectShape(rankingResponseSchema, body);
    expect(page.data).toHaveLength(10);
    expect(page.data.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (let i = 1; i < page.data.length; i++)
      expect(page.data[i - 1].ivtu).toBeGreaterThanOrEqual(page.data[i].ivtu);
    expect(Object.values(page.meta.levelCounts).reduce((a, b) => a + b, 0)).toBe(page.meta.total);
    expect(page.meta.neighborhoods).toContain("Centro");
  });

  it("filtra por bairro, zona, nível de execução e intervenção", async () => {
    const { body } = await call(
      ranking.GET as Handler,
      "/prescriptions/ivtu-ranking?municipality=volta-redonda&neighborhood=Vila%20Santa%20Cec%C3%ADlia&zones=comercial,misto&executionLevel=tatico&intervention=arborizacao&sort=utci&order=asc",
    );
    const page = expectShape(rankingResponseSchema, body);
    expect(page.data.length).toBeGreaterThan(0);
    for (const row of page.data) {
      expect(row.neighborhood).toBe("Vila Santa Cecília");
      expect(["comercial", "misto"]).toContain(row.zone);
      expect(row.recommendation?.level).toBe("tatico");
    }
    for (let i = 1; i < page.data.length; i++)
      expect(page.data[i - 1].utciPeak).toBeLessThanOrEqual(page.data[i].utciPeak);
  });

  it("busca por código e rejeita filtros inválidos", async () => {
    const found = expectShape(
      rankingResponseSchema,
      (
        await call(
          ranking.GET as Handler,
          "/prescriptions/ivtu-ranking?municipality=resende&search=RS-0001",
        )
      ).body,
    );
    expect(found.data[0].code).toBe("RS-0001");
    const bad = await call(
      ranking.GET as Handler,
      "/prescriptions/ivtu-ranking?municipality=resende&zones=aeroporto",
    );
    expect(bad.response.status).toBe(400);
  });
});

describe("API v1 — simulação, cenários, checklist e ESG", () => {
  const scenario = {
    blockId: "vr-0001",
    trees: [{ speciesId: "ipe-amarelo", count: 12 }],
    permeablePavementShare: 0.3,
    coolRoofShare: 0.4,
  };

  it("what-if devolve faixa de alívio térmico", async () => {
    const { response, body } = await call(whatIf.POST as Handler, "/simulation/what-if", {
      method: "POST",
      json: scenario,
    });
    expect(response.status).toBe(200);
    const result = expectShape(whatIfResponseSchema, body).result;
    expect(result.peakUtciDelta.central).toBeLessThan(0);
    expect(result.scenario.horizonYears).toBe(10);
  });

  it("rejeita mídia, JSON e tamanho inválidos", async () => {
    const wrongType = await call(whatIf.POST as Handler, "/simulation/what-if", {
      method: "POST",
      body: "x",
      headers: { "content-type": "text/plain" },
    });
    expect(wrongType.response.status).toBe(415);
    const malformed = await call(whatIf.POST as Handler, "/simulation/what-if", {
      method: "POST",
      body: "{",
      headers: { "content-type": "application/json" },
    });
    expectError(malformed.body, "bad_request");
    const huge = await call(whatIf.POST as Handler, "/simulation/what-if", {
      method: "POST",
      json: { ...scenario, padding: "x".repeat(70_000) },
    });
    expect(huge.response.status).toBe(413);
    const unknown = await call(whatIf.POST as Handler, "/simulation/what-if", {
      method: "POST",
      json: { ...scenario, blockId: "vr-9999" },
    });
    expect(unknown.response.status).toBe(404);
  });

  it("salva cenário e o lista", async () => {
    const saved = await call(scenarios.POST as Handler, "/simulation/scenarios", {
      method: "POST",
      json: { name: "Rua 33 arborizada", municipalityId: "volta-redonda", scenario },
    });
    expect(saved.response.status).toBe(201);
    const scenarioSaved = expectShape(savedScenarioSchema, saved.body);
    expect(scenarioSaved.summary.peakUtciDelta).toBeLessThan(0);
    const list = await call(
      scenarios.GET as Handler,
      "/simulation/scenarios?municipality=volta-redonda",
    );
    expect(expectShape(savedScenarioListResponseSchema, list.body).data.map((s) => s.id)).toContain(
      scenarioSaved.id,
    );

    const wrongCity = await call(scenarios.POST as Handler, "/simulation/scenarios", {
      method: "POST",
      json: { name: "Errado", municipalityId: "resende", scenario },
    });
    expect(wrongCity.response.status).toBe(400);
  });

  it("checklist de campo: leitura, gravação e progresso", async () => {
    const empty = expectShape(
      checklistResponseSchema,
      (await call(checklist.GET as Handler, "/blocks/vr-0002/checklist", {}, { id: "vr-0002" }))
        .body,
    );
    expect(empty.progress).toBe(0);
    const first = empty.applicable[0].id;
    const updated = await call(
      checklist.PUT as Handler,
      "/blocks/vr-0002/checklist",
      { method: "PUT", json: { items: { [first]: "conforme" }, notes: "Vistoria em 12/02" } },
      { id: "vr-0002" },
    );
    const saved = expectShape(checklistResponseSchema, updated.body);
    expect(saved.progress).toBeGreaterThan(0);
    expect(saved.checklist.notes).toBe("Vistoria em 12/02");
  });

  it("ESG com premissas", async () => {
    const { body } = await call(esg.POST as Handler, "/esg/impact", {
      method: "POST",
      json: { trees: [{ speciesId: "oiti", count: 10 }], permeableAreaM2: 200 },
    });
    expect(expectShape(esgResultSchema, body).premises.length).toBeGreaterThan(2);
  });
});

describe("API v1 — ciência cidadã e IoT", () => {
  it("lista relatos com contagem por status e filtros", async () => {
    const { body } = await call(
      reports.GET as Handler,
      "/citizen-reports?municipality=volta-redonda&statuses=pendente&pageSize=5",
    );
    const page = expectShape(citizenReportListResponseSchema, body);
    expect(page.data.every((r) => r.status === "pendente")).toBe(true);
    expect(page.meta.statusCounts.pendente).toBe(page.meta.total);
    expect(page.meta.statusCounts.validado).toBeGreaterThan(0);
  });

  it("cria e modera um relato; rejeita categoria inválida", async () => {
    const created = await call(reports.POST as Handler, "/citizen-reports", {
      method: "POST",
      json: {
        municipalityId: "resende",
        location: [-44.4467, -22.4689],
        category: "ponto-onibus-sem-sombra",
        text: "Ponto de ônibus sem cobertura nenhuma.",
      },
    });
    expect(created.response.status).toBe(201);
    const report = expectShape(citizenReportSchema, created.body);
    const moderated = await call(
      reportById.PATCH as Handler,
      `/citizen-reports/${report.id}`,
      { method: "PATCH", json: { status: "validado" } },
      { id: report.id },
    );
    expect(expectShape(citizenReportSchema, moderated.body).status).toBe("validado");

    const missing = await call(
      reportById.PATCH as Handler,
      "/citizen-reports/x",
      { method: "PATCH", json: { status: "spam" } },
      { id: "x" },
    );
    expect(missing.response.status).toBe(404);
    const invalid = await call(reports.POST as Handler, "/citizen-reports", {
      method: "POST",
      json: {
        municipalityId: "resende",
        location: [-44.4, -22.4],
        category: "outra",
        text: "Texto válido aqui",
      },
    });
    expect(invalid.response.status).toBe(400);
  });

  it("nós IoT com status, leituras e calibração", async () => {
    const nodes = expectShape(
      iotNodeListResponseSchema,
      (await call(iotNodes.GET as Handler, "/iot-nodes")).body,
    ).data;
    expect(nodes).toHaveLength(10);
    const statuses = new Set(nodes.map((n) => n.status));
    expect(statuses).toContain("offline");
    expect(statuses).toContain("bateria-baixa");

    const id = nodes[0].node.id;
    const series = expectShape(
      iotReadingsResponseSchema,
      (await call(readings.GET as Handler, `/iot-nodes/${id}/readings?hours=48`, {}, { id })).body,
    );
    expect(series.data.length).toBeGreaterThan(40);
    const missing = await call(readings.GET as Handler, "/iot-nodes/xx/readings", {}, { id: "xx" });
    expect(missing.response.status).toBe(404);

    const calib = expectShape(
      calibrationResponseSchema,
      (await call(calibration.GET as Handler, "/iot-nodes/calibration?municipality=volta-redonda"))
        .body,
    );
    expect(calib.stats.points).toBeGreaterThan(100);
    expect(calib.stats.pearson).toBeGreaterThan(0.8);
    expect(Math.abs(calib.stats.bias)).toBeLessThan(1.5);
  });
});

describe("API v1 — Adote uma Ilha Verde e relatórios", () => {
  it("lista, detalha e cadastra parcerias", async () => {
    const list = expectShape(
      adoptionListResponseSchema,
      (await call(adoptions.GET as Handler, "/adoptions?municipality=resende")).body,
    );
    expect(list.data.length).toBeGreaterThan(0);
    const id = list.data[0].adoption.id;
    expectShape(
      adoptionSummarySchema,
      (await call(adoptionById.GET as Handler, `/adoptions/${id}`, {}, { id })).body,
    );

    const blockId = list.data[0].adoption.blockId;
    const created = await call(adoptions.POST as Handler, "/adoptions", {
      method: "POST",
      json: {
        municipalityId: "resende",
        blockId,
        partnerName: "Mercearia do Vale",
        partnerType: "comercio",
        trees: [{ speciesId: "quaresmeira", count: 5 }],
      },
    });
    expect(created.response.status).toBe(201);
    expect(expectShape(adoptionSummarySchema, created.body).esg.treesPlanted).toBe(5);
    const wrong = await call(adoptions.POST as Handler, "/adoptions", {
      method: "POST",
      json: {
        municipalityId: "volta-redonda",
        blockId,
        partnerName: "Outra",
        partnerType: "comercio",
      },
    });
    expect(wrong.response.status).toBe(400);
  });

  it("catálogo de editais e relatório estruturado com fontes e selo", async () => {
    const list = expectShape(
      fundingProgramListResponseSchema,
      (await call(programs.GET as Handler, "/reports/programs")).body,
    );
    expect(list.data.map((p) => p.id)).toEqual([
      "fundo-clima",
      "ambiente-resiliente-rj",
      "fecam",
      "esg-corporativo",
    ]);

    const { response, body } = await call(preview.POST as Handler, "/reports/preview", {
      method: "POST",
      json: {
        programId: "fundo-clima",
        municipalityId: "volta-redonda",
        projectName: "Corredores Verdes do Centro",
        department: "Secretaria de Meio Ambiente",
        estimatedBudget: 1_200_000,
        neighborhoods: ["Vila Santa Cecília", "Retiro"],
      },
    });
    expect(response.status).toBe(200);
    const doc = expectShape(reportDocumentSchema, body);
    expect(doc.diagnosis.neighborhoods.map((n) => n.name)).toEqual([
      "Vila Santa Cecília",
      "Retiro",
    ]);
    expect(doc.diagnosis.priorityBlocks.length).toBe(10);
    expect(doc.epidemiology[0].statement).toContain("119.643");
    expect(doc.notices).toContain("Estimativas a validar no piloto.");

    const bad = await call(preview.POST as Handler, "/reports/preview", {
      method: "POST",
      json: {
        programId: "fecam",
        municipalityId: "resende",
        projectName: "Projeto X",
        department: "SMMA",
        estimatedBudget: 10,
        neighborhoods: ["Aterrado"],
      },
    });
    expect(bad.response.status).toBe(400);
  });
});

describe("API v1 — perfis de acesso (RF08)", () => {
  const scenarioBody = {
    name: "Cenário do leitor",
    municipalityId: "volta-redonda",
    scenario: { blockId: "vr-0001", trees: [{ speciesId: "ipe-amarelo", count: 4 }] },
  };
  const reportBody = (programId: string) => ({
    programId,
    municipalityId: "volta-redonda",
    projectName: "Pátio sombreado da fábrica",
    department: "Diretoria de Sustentabilidade",
    estimatedBudget: 450_000,
    neighborhoods: ["Retiro"],
  });

  it("escrita protegida sem sessão devolve 401; sessão adulterada também", async () => {
    const anonymous = await call(scenarios.POST as Handler, "/simulation/scenarios", {
      method: "POST",
      json: scenarioBody,
      as: null,
    });
    expect(anonymous.response.status).toBe(401);
    expectError(anonymous.body, "unauthorized");

    const forged = await call(scenarios.POST as Handler, "/simulation/scenarios", {
      method: "POST",
      json: scenarioBody,
      as: null,
      headers: { cookie: `${SESSION_COOKIE}=eyJ2IjoxfQ.assinatura-falsa` },
    });
    expect(forged.response.status).toBe(401);
  });

  it("Leitor Público não salva cenários nem gera relatórios (403)", async () => {
    const save = await call(scenarios.POST as Handler, "/simulation/scenarios", {
      method: "POST",
      json: scenarioBody,
      as: "leitor-publico",
    });
    expect(save.response.status).toBe(403);
    expect(expectError(save.body, "forbidden").error.message).toContain("Leitor Público");

    const report = await call(preview.POST as Handler, "/reports/preview", {
      method: "POST",
      json: reportBody("esg-corporativo"),
      as: "leitor-publico",
    });
    expect(report.response.status).toBe(403);
  });

  it("Cliente Corporativo gera o relatório ESG, mas não o de edital público", async () => {
    const esgReport = await call(preview.POST as Handler, "/reports/preview", {
      method: "POST",
      json: reportBody("esg-corporativo"),
      as: "cliente-corporativo",
    });
    expect(esgReport.response.status).toBe(200);
    const publicReport = await call(preview.POST as Handler, "/reports/preview", {
      method: "POST",
      json: reportBody("fundo-clima"),
      as: "cliente-corporativo",
    });
    expect(publicReport.response.status).toBe(403);
  });

  it("moderação e checklist exigem perfil municipal", async () => {
    const list = expectShape(
      citizenReportListResponseSchema,
      (await call(reports.GET as Handler, "/citizen-reports?municipality=resende")).body,
    );
    const id = list.data[0].id;
    for (const role of ["cliente-corporativo", "leitor-publico"] as const) {
      const moderate = await call(
        reportById.PATCH as Handler,
        `/citizen-reports/${id}`,
        { method: "PATCH", json: { status: "validado" }, as: role },
        { id },
      );
      expect(moderate.response.status).toBe(403);
    }
    const asTechnician = await call(
      checklist.PUT as Handler,
      "/blocks/rs-0001/checklist",
      { method: "PUT", json: { items: {} }, as: "tecnico" },
      { id: "rs-0001" },
    );
    expect(asTechnician.response.status).toBe(200);
    const asClient = await call(
      checklist.PUT as Handler,
      "/blocks/rs-0001/checklist",
      { method: "PUT", json: { items: {} }, as: "cliente-corporativo" },
      { id: "rs-0001" },
    );
    expect(asClient.response.status).toBe(403);
  });

  it("leituras, cálculos e relatos cidadãos continuam públicos", async () => {
    const read = await call(municipalities.GET as Handler, "/municipalities", { as: null });
    expect(read.response.status).toBe(200);
    const compute = await call(whatIf.POST as Handler, "/simulation/what-if", {
      method: "POST",
      json: scenarioBody.scenario,
      as: null,
    });
    expect(compute.response.status).toBe(200);
  });
});

describe("API v1 — pedido de piloto", () => {
  const request = {
    organization: "Prefeitura de Barra Mansa",
    organizationType: "prefeitura",
    municipality: "Barra Mansa",
    contactName: "Carla Mendes",
    email: "carla.mendes@barramansa.rj.gov.br",
    interests: ["diagnostico", "relatorios"],
    consent: true,
  };

  it("registra sem login e devolve só o protocolo, sem ecoar o contato", async () => {
    const { response, body } = await call(pilotRequests.POST as Handler, "/pilot-requests", {
      method: "POST",
      json: request,
      as: null,
      headers: { "x-forwarded-for": "10.9.0.1" },
    });
    expect(response.status).toBe(201);
    const receipt = expectShape(pilotRequestReceiptResponseSchema, body);
    expect(receipt.protocol).toMatch(/^IPE-\d{4}-[A-Z0-9]{6}$/);
    expect(JSON.stringify(body)).not.toContain("carla");
  });

  it("exige consentimento, e-mail válido e ao menos um módulo", async () => {
    const { response, body } = await call(pilotRequests.POST as Handler, "/pilot-requests", {
      method: "POST",
      json: { ...request, consent: false, email: "carla", interests: [] },
      as: null,
      headers: { "x-forwarded-for": "10.9.0.2" },
    });
    expect(response.status).toBe(400);
    const paths = expectError(body, "bad_request").error.details?.map((d) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["consent", "email", "interests"]));
  });

  it("limita a 5 pedidos por minuto por IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const { response } = await call(pilotRequests.POST as Handler, "/pilot-requests", {
        method: "POST",
        json: request,
        as: null,
        headers: { "x-forwarded-for": "10.9.0.3" },
      });
      statuses.push(response.status);
    }
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });
});

describe("infraestrutura HTTP", () => {
  it("limita escritas por IP com 429 e Retry-After", async () => {
    const handler = withApi(async () => Response.json({ ok: true }), {
      rateLimiter: createRateLimiter({ limit: 2, windowMs: 60_000 }),
    }) as Handler;
    const post = () =>
      call(handler, "/x", { method: "POST", headers: { "x-forwarded-for": "10.0.0.1" } });
    expect((await post()).response.status).toBe(200);
    expect((await post()).response.status).toBe(200);
    const limited = await post();
    expect(limited.response.status).toBe(429);
    expect(Number(limited.response.headers.get("retry-after"))).toBeGreaterThan(0);
    expectError(limited.body, "rate_limited");
  });

  it("erro inesperado vira 500 sem vazar detalhes internos", async () => {
    // O erro é registrado no log do servidor (esperado); silenciado para não poluir a saída.
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const handler = withApi(async () => {
      throw new Error("senha do banco: 123");
    }) as Handler;
    const { response, body } = await call(handler, "/x");
    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("senha");
    expect(stderr).toHaveBeenCalledOnce();
    stderr.mockRestore();
  });

  it("janela do rate limit reinicia", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check("a", 0).allowed).toBe(true);
    expect(limiter.check("a", 10).allowed).toBe(false);
    expect(limiter.check("a", 1001).allowed).toBe(true);
  });
});
