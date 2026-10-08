import { z } from "zod";
import { permissionPhrase, type Permission } from "@/domain/access/access";
import { SESSION_COOKIE } from "@/server/auth/session-token";
import {
  adoptionListResponseSchema,
  adoptionSummarySchema,
  alertListResponseSchema,
  blockDetailResponseSchema,
  calibrationResponseSchema,
  checklistResponseSchema,
  checklistUpdateSchema,
  citizenReportListResponseSchema,
  citizenReportQuerySchema,
  citizenReportStatusUpdateSchema,
  esgRequestSchema,
  esgResultSchema,
  fundingProgramListResponseSchema,
  iotNodeListResponseSchema,
  iotReadingsQuerySchema,
  iotReadingsResponseSchema,
  mapLayersQuerySchema,
  mapLayersResponseSchema,
  municipalityListResponseSchema,
  municipalityQuerySchema,
  newAdoptionRequestSchema,
  newCitizenReportRequestSchema,
  newPilotRequestRequestSchema,
  pilotRequestReceiptResponseSchema,
  rankingQuerySchema,
  rankingResponseSchema,
  reportDocumentSchema,
  utciByHourResponseSchema,
  reportRequestSchema,
  saveScenarioRequestSchema,
  savedScenarioListResponseSchema,
  whatIfRequestSchema,
  whatIfResponseSchema,
} from "@/lib/api/contracts";
import { citizenReportSchema } from "@/domain/citizen/schema";
import { savedScenarioSchema } from "@/domain/simulation/saved-scenario";

/**
 * Documento OpenAPI 3.1 gerado a partir dos contratos Zod (fonte única).
 * `npm run openapi` grava docs/openapi.yaml; um teste garante que o arquivo
 * versionado está em sincronia com o código.
 */

type JsonSchema = Record<string, unknown>;

const REF = (id: string) => `#/components/schemas/${id}`;

function idOf(schema: z.ZodType): string | undefined {
  return z.globalRegistry.get(schema)?.id as string | undefined;
}

function strip(schema: JsonSchema): JsonSchema {
  return Object.fromEntries(
    Object.entries(schema).filter(([key]) => key !== "$schema" && key !== "$id"),
  );
}

/** Esquema de corpo de requisição: forma de ENTRADA (campos com default são opcionais). */
function inputSchema(schema: z.ZodType): JsonSchema {
  return strip(
    z.toJSONSchema(schema, {
      io: "input",
      unrepresentable: "any",
      metadata: z.registry(),
    }) as JsonSchema,
  );
}

/** Esquema de resposta: referência ao componente quando registrado. */
function outputSchema(schema: z.ZodType): JsonSchema {
  const id = idOf(schema);
  if (id) return { $ref: REF(id) };
  return strip(z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }) as JsonSchema);
}

const QUERY_DESCRIPTIONS: Record<string, string> = {
  municipality: "Identificador do município (ex.: `volta-redonda`).",
  hour: "Hora local de 8 a 18 para a sensação térmica.",
  zones: "Zonas separadas por vírgula: comercial, residencial, misto, industrial, verde.",
  ivtuLevels: "Níveis IVTU separados por vírgula: baixo, medio, alto, critico.",
  statuses: "Status separados por vírgula: pendente, validado, descartado, spam.",
  categories: "Categorias de relato separadas por vírgula.",
  hours: "Janela em horas (1 a 168).",
  search: "Busca por código, logradouro ou bairro.",
};

function queryParameters(schema: z.ZodObject): JsonSchema[] {
  const json = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
    metadata: z.registry(),
  }) as {
    properties: Record<string, JsonSchema>;
    required?: string[];
  };
  return Object.entries(json.properties).map(([name, property]) => ({
    name,
    in: "query",
    required: json.required?.includes(name) ?? false,
    ...(QUERY_DESCRIPTIONS[name] ? { description: QUERY_DESCRIPTIONS[name] } : {}),
    schema: property,
  }));
}

const pathParam = (name: string, description: string) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string" },
});

const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: "Parâmetros ou corpo inválidos",
  401: "Sessão ausente ou expirada",
  403: "O perfil da sessão não tem a permissão exigida",
  404: "Recurso não encontrado",
  413: "Corpo acima de 64 KB",
  415: "Corpo deve ser application/json",
  429: "Limite de requisições excedido, por IP e rota (escritas: 30/min; cálculos what-if e ESG: 240/min; pedidos de piloto: 5/min) ou pelo teto global da rota (10 vezes o limite por IP; 30/min nos pedidos de piloto)",
  500: "Erro interno",
};

interface Operation {
  method: "get" | "post" | "put" | "patch";
  path: string;
  tag: string;
  summary: string;
  description?: string;
  query?: z.ZodObject;
  pathParams?: JsonSchema[];
  body?: z.ZodType;
  /** Ação protegida (RF08): exige o cookie de sessão de um perfil com esta permissão. */
  permission?: Permission;
  response: { status: 200 | 201; schema: z.ZodType; description: string };
  errors: number[];
}

const OPERATIONS: Operation[] = [
  {
    method: "get",
    path: "/municipalities",
    tag: "Territórios",
    summary: "Municípios atendidos",
    description:
      "Centro, bounding box e zoom de cada município. A plataforma escala trocando apenas estes dados.",
    response: {
      status: 200,
      schema: municipalityListResponseSchema,
      description: "Lista de municípios",
    },
    errors: [500],
  },
  {
    method: "get",
    path: "/alerts",
    tag: "Territórios",
    summary: "Alertas de calor ativos",
    query: municipalityQuerySchema,
    response: { status: 200, schema: alertListResponseSchema, description: "Alertas vigentes" },
    errors: [400, 404],
  },
  {
    method: "get",
    path: "/thermals/map-layers",
    tag: "Diagnóstico térmico",
    summary: "Camadas térmicas do mapa (GeoJSON)",
    description:
      "Quarteirões com LST de satélite, UTCI na hora pedida, UTCI de pico, IVTU e ação recomendada. Toda resposta traz o selo de pré-diagnóstico.",
    query: mapLayersQuerySchema,
    response: {
      status: 200,
      schema: mapLayersResponseSchema,
      description: "FeatureCollection de quarteirões",
    },
    errors: [400, 404],
  },
  {
    method: "get",
    path: "/thermals/utci-by-hour",
    tag: "Diagnóstico térmico",
    summary: "UTCI de 08h a 18h de todos os quarteirões",
    description:
      "Payload compacto para o slider de horário: o cliente recolore o mapa sem baixar a geometria de novo.",
    query: municipalityQuerySchema,
    response: {
      status: 200,
      schema: utciByHourResponseSchema,
      description: "UTCI por quarteirão e hora",
    },
    errors: [400, 404],
  },
  {
    method: "get",
    path: "/blocks/{id}",
    tag: "Diagnóstico térmico",
    summary: "Diagnóstico de um quarteirão",
    description: "UTCI, IVTU, drenagem, prescrição com justificativa e curva horária 08h–18h.",
    pathParams: [pathParam("id", "Identificador do quarteirão (ex.: vr-0001)")],
    response: {
      status: 200,
      schema: blockDetailResponseSchema,
      description: "Diagnóstico completo",
    },
    errors: [404],
  },
  {
    method: "get",
    path: "/blocks/{id}/checklist",
    tag: "Prescrição",
    summary: "Checklist de validação de campo",
    pathParams: [pathParam("id", "Identificador do quarteirão")],
    response: {
      status: 200,
      schema: checklistResponseSchema,
      description: "Checklist e progresso",
    },
    errors: [404],
  },
  {
    method: "put",
    path: "/blocks/{id}/checklist",
    permission: "checklist:edit",
    tag: "Prescrição",
    summary: "Salvar checklist de validação de campo",
    pathParams: [pathParam("id", "Identificador do quarteirão")],
    body: checklistUpdateSchema,
    response: { status: 200, schema: checklistResponseSchema, description: "Checklist salvo" },
    errors: [400, 404, 413, 415, 429],
  },
  {
    method: "get",
    path: "/prescriptions/ivtu-ranking",
    tag: "Prescrição",
    summary: "Ranking IVTU com ação recomendada",
    description:
      "`rank` é sempre a posição pelo IVTU no município, qualquer que seja a ordenação escolhida.",
    query: rankingQuerySchema,
    response: { status: 200, schema: rankingResponseSchema, description: "Página do ranking" },
    errors: [400, 404],
  },
  {
    method: "post",
    path: "/simulation/what-if",
    tag: "Simulação",
    summary: "Simular intervenções num quarteirão",
    description:
      "Árvores (espécie e quantidade), pavimento permeável e pintura atérmica. O alívio é devolvido como faixa (conservador, central e otimista).",
    body: whatIfRequestSchema,
    response: { status: 200, schema: whatIfResponseSchema, description: "Resultado da simulação" },
    errors: [400, 404, 413, 415, 429],
  },
  {
    method: "get",
    path: "/simulation/scenarios",
    tag: "Simulação",
    summary: "Cenários de projeto salvos",
    query: z.object({ municipality: z.string().optional() }),
    response: {
      status: 200,
      schema: savedScenarioListResponseSchema,
      description: "Cenários salvos",
    },
    errors: [],
  },
  {
    method: "post",
    path: "/simulation/scenarios",
    permission: "scenario:save",
    tag: "Simulação",
    summary: "Salvar cenário de projeto",
    body: saveScenarioRequestSchema,
    response: {
      status: 201,
      schema: savedScenarioSchema,
      description: "Cenário salvo com resumo congelado",
    },
    errors: [400, 404, 413, 415, 429],
  },
  {
    method: "post",
    path: "/esg/impact",
    tag: "Simulação",
    summary: "Calcular retorno ESG",
    body: esgRequestSchema,
    response: { status: 200, schema: esgResultSchema, description: "Impacto com premissas" },
    errors: [400, 413, 415, 429],
  },
  {
    method: "get",
    path: "/citizen-reports",
    tag: "Ciência cidadã",
    summary: "Relatos cidadãos anônimos",
    description:
      "LGPD: apenas texto, coordenadas e categoria. Inclui contagem por status para moderação.",
    query: citizenReportQuerySchema,
    response: {
      status: 200,
      schema: citizenReportListResponseSchema,
      description: "Página de relatos",
    },
    errors: [400, 404],
  },
  {
    method: "post",
    path: "/citizen-reports",
    tag: "Ciência cidadã",
    summary: "Registrar relato",
    body: newCitizenReportRequestSchema,
    response: { status: 201, schema: citizenReportSchema, description: "Relato criado (pendente)" },
    errors: [400, 404, 413, 415, 429],
  },
  {
    method: "patch",
    path: "/citizen-reports/{id}",
    permission: "citizen-report:moderate",
    tag: "Ciência cidadã",
    summary: "Moderar relato",
    pathParams: [pathParam("id", "Identificador do relato")],
    body: citizenReportStatusUpdateSchema,
    response: { status: 200, schema: citizenReportSchema, description: "Relato atualizado" },
    errors: [400, 404, 413, 415, 429],
  },
  {
    method: "get",
    path: "/iot-nodes",
    tag: "Sensores IoT",
    summary: "Nós de calibração",
    query: z.object({ municipality: z.string().optional() }),
    response: {
      status: 200,
      schema: iotNodeListResponseSchema,
      description: "Nós com status e sparkline",
    },
    errors: [404],
  },
  {
    method: "get",
    path: "/iot-nodes/{id}/readings",
    tag: "Sensores IoT",
    summary: "Série horária de um nó",
    pathParams: [pathParam("id", "Identificador do nó (ex.: iot-vr-01)")],
    query: iotReadingsQuerySchema,
    response: {
      status: 200,
      schema: iotReadingsResponseSchema,
      description: "Leituras em ordem cronológica",
    },
    errors: [400, 404],
  },
  {
    method: "get",
    path: "/iot-nodes/calibration",
    tag: "Sensores IoT",
    summary: "Calibração sensor × modelo",
    query: z.object({
      municipality: z.string().optional(),
      hours: z.coerce.number().int().min(1).max(168).default(72),
    }),
    response: {
      status: 200,
      schema: calibrationResponseSchema,
      description: "Pontos e estatísticas (viés, RMSE, r)",
    },
    errors: [400, 404],
  },
  {
    method: "get",
    path: "/adoptions",
    tag: "Adote uma Ilha Verde",
    summary: "Parcerias de zeladoria",
    query: z.object({ municipality: z.string().optional() }),
    response: {
      status: 200,
      schema: adoptionListResponseSchema,
      description: "Parcerias com NDVI, ESG e manutenção",
    },
    errors: [404],
  },
  {
    method: "post",
    path: "/adoptions",
    permission: "adoption:create",
    tag: "Adote uma Ilha Verde",
    summary: "Cadastrar parceria",
    body: newAdoptionRequestSchema,
    response: { status: 201, schema: adoptionSummarySchema, description: "Parceria criada" },
    errors: [400, 404, 413, 415, 429],
  },
  {
    method: "get",
    path: "/adoptions/{id}",
    tag: "Adote uma Ilha Verde",
    summary: "Detalhe da parceria",
    pathParams: [pathParam("id", "Identificador da parceria")],
    response: { status: 200, schema: adoptionSummarySchema, description: "Parceria" },
    errors: [404],
  },
  {
    method: "get",
    path: "/reports/programs",
    tag: "Relatórios",
    summary: "Editais e relatórios suportados",
    response: {
      status: 200,
      schema: fundingProgramListResponseSchema,
      description: "Catálogo de editais",
    },
    errors: [],
  },
  {
    method: "post",
    path: "/reports/preview",
    permission: "report:generate",
    tag: "Relatórios",
    summary: "Montar relatório para edital",
    description:
      "Diagnóstico geográfico, justificativa epidemiológica com fontes, impacto socioeconômico (estimativas a validar no piloto) e cenários salvos.",
    body: reportRequestSchema,
    response: {
      status: 200,
      schema: reportDocumentSchema,
      description: "Documento estruturado do relatório",
    },
    errors: [400, 404, 413, 415, 429],
  },
  {
    method: "post",
    path: "/pilot-requests",
    tag: "Comercial",
    summary: "Solicitar piloto",
    description:
      "Formulário público da landing. Único dado pessoal recebido pela plataforma: o contato institucional, com consentimento explícito e finalidade única (responder ao pedido). A resposta não ecoa o contato.",
    body: newPilotRequestRequestSchema,
    response: {
      status: 201,
      schema: pilotRequestReceiptResponseSchema,
      description: "Pedido registrado com protocolo",
    },
    errors: [400, 413, 415, 429],
  },
];

const SESSION_SCHEME = "sessionCookie";

export function buildOpenApiDocument() {
  const components = z.toJSONSchema(z.globalRegistry, {
    uri: REF,
    io: "output",
    unrepresentable: "any",
  }) as { schemas: Record<string, JsonSchema> };

  const paths: Record<string, Record<string, unknown>> = {};
  for (const op of OPERATIONS) {
    const parameters = [...(op.pathParams ?? []), ...(op.query ? queryParameters(op.query) : [])];
    const responses: Record<string, unknown> = {
      [op.response.status]: {
        description: op.response.description,
        content: { "application/json": { schema: outputSchema(op.response.schema) } },
      },
    };
    const errors = op.permission ? [...op.errors, 401, 403].sort((a, b) => a - b) : op.errors;
    for (const status of errors) {
      responses[status] = {
        description: ERROR_DESCRIPTIONS[status],
        content: { "application/json": { schema: { $ref: REF("ApiError") } } },
      };
    }
    const description = [
      op.description,
      op.permission && `**Permissão:** ${permissionPhrase(op.permission)}.`,
    ]
      .filter(Boolean)
      .join("\n\n");
    paths[op.path] ??= {};
    paths[op.path][op.method] = {
      tags: [op.tag],
      summary: op.summary,
      ...(description ? { description } : {}),
      ...(op.permission ? { security: [{ [SESSION_SCHEME]: [] }] } : {}),
      operationId: `${op.method}${op.path
        .replace(/[{}]/g, "")
        .replace(/\/(\w)/g, (_, c: string) => c.toUpperCase())
        .replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}`,
      ...(parameters.length ? { parameters } : {}),
      ...(op.body
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { schema: inputSchema(op.body) } },
            },
          }
        : {}),
      responses,
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Ipê · Inteligência Térmica Urbana — API",
      version: "1.0.0",
      description: [
        "API de suporte à decisão para ilhas de calor e infraestrutura verde.",
        "",
        "**Todas as recomendações são pré-diagnóstico automatizado para subsidiar a análise do profissional responsável.**",
        "Nesta versão, os dados são demonstrativos (ver docs/DATA.md).",
        "",
        "Erros seguem o formato `ApiError`. Respostas trazem o cabeçalho `X-Request-Id`.",
        "Leituras são públicas. Escritas protegidas exigem a sessão de um perfil com a permissão indicada (RF08); no MVP, um cookie assinado de demonstração, e no piloto, OIDC.",
        "Este contrato é gerado a partir dos schemas Zod em `src/lib/api/contracts.ts` (`npm run openapi`).",
      ].join("\n"),
      license: { name: "Proprietário" },
    },
    servers: [
      {
        url: "/api/v1",
        description: "Next.js (MVP) — o backend FastAPI implementará o mesmo contrato",
      },
    ],
    tags: [
      { name: "Territórios" },
      { name: "Diagnóstico térmico" },
      { name: "Prescrição" },
      { name: "Simulação" },
      { name: "Ciência cidadã" },
      { name: "Sensores IoT" },
      { name: "Adote uma Ilha Verde" },
      { name: "Relatórios" },
      { name: "Comercial" },
    ],
    paths,
    components: {
      securitySchemes: {
        [SESSION_SCHEME]: {
          type: "apiKey",
          in: "cookie",
          name: SESSION_COOKIE,
          description:
            "Sessão do perfil de acesso (Administrador Municipal, Técnico/Analista, Cliente Corporativo ou Leitor Público).",
        },
      },
      schemas: Object.fromEntries(
        Object.entries(components.schemas).map(([k, v]) => [k, strip(v)]),
      ),
    },
  };
}
