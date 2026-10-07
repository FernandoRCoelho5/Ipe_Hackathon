# Arquitetura

## Visão geral

```
┌──────────────────────────────────────────────────────────────────┐
│  Navegador                                                       │
│  Telas (Client Components) · Zustand (filtros, município, cenário)│
│  TanStack Query ──► /api/v1/*                                    │
└───────────────▲──────────────────────────────────────────────────┘
                │ JSON (contrato em docs/openapi.yaml)
┌───────────────┴──────────────────────────────────────────────────┐
│  Next.js 16 (App Router)                                         │
│  Server Components ─┐                                            │
│  Route Handlers ────┼─► src/server/repositories (interfaces)     │
│  proxy.ts (sessão)  │        ├─ mock     (dados demonstrativos)  │
│                     │        └─ postgis  (roadmap)               │
│                     └─► src/domain (regras puras: UTCI, IVTU,    │
│                                     prescrição, simulador, ESG)  │
└──────────────────────────────────────────────────────────────────┘
                │ (roadmap)
┌───────────────┴──────────────────────────────────────────────────┐
│  apps/api — FastAPI + Celery + GEE/INMET/OSM → PostGIS           │
└──────────────────────────────────────────────────────────────────┘
```

## Camadas e regras de dependência

| Pasta                      | Responsabilidade                                                      | Pode importar                          |
| -------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| `src/domain/`              | Tipos, schemas Zod e regras de negócio **puras** (sem I/O, sem React) | `src/domain` e `src/lib/format` (puro) |
| `src/server/repositories/` | Contratos de acesso a dados + implementação `mock`                    | `domain`                               |
| `src/server/services/`     | Orquestração (relatórios, agregações)                                 | `domain`, `repositories`               |
| `src/app/api/v1/`          | REST: validação Zod, erros padronizados, cache                        | `domain`, `server`                     |
| `src/app/` (páginas)       | Rotas, layouts, metadados                                             | tudo acima + `components`              |
| `src/components/`          | UI (layout, mapa, gráficos, ui, tour)                                 | `domain` (tipos), `lib`, `stores`      |
| `src/lib/`                 | Config, formatadores, i18n, tema, logger                              | —                                      |
| `src/stores/`              | Estado de cliente (Zustand)                                           | `domain` (tipos)                       |

`src/server/repositories/index.ts` importa `server-only`: qualquer tentativa de usar repositórios em um Client Component falha no build.

## API v1

- **Contratos:** [`src/lib/api/contracts.ts`](../src/lib/api/contracts.ts) (Zod), a fonte única de tipos, validação e [`docs/openapi.yaml`](./openapi.yaml) (`npm run openapi`).
- **Handlers:** `src/app/api/v1/**/route.ts`, finos: validam, chamam o serviço e respondem.
- **Wrapper `withApi`** ([`src/server/http/handler.ts`](../src/server/http/handler.ts)): `X-Request-Id`, log estruturado, erros no formato `ApiError` (400/404/413/415/429/500), rate limit de escritas (30/min por IP e rota), corpo JSON limitado a 64 KB e gzip.
- **Serviços:** `src/server/services/*` compõem repositórios e domínio; os diagnósticos são memoizados por município.

| Recurso              | Endpoints                                                                        |
| -------------------- | -------------------------------------------------------------------------------- |
| Territórios          | `GET /municipalities`, `GET /alerts`                                             |
| Diagnóstico          | `GET /thermals/map-layers`, `GET /thermals/utci-by-hour`, `GET /blocks/{id}`     |
| Prescrição           | `GET /prescriptions/ivtu-ranking`, `GET·PUT /blocks/{id}/checklist`              |
| Simulação            | `POST /simulation/what-if`, `GET·POST /simulation/scenarios`, `POST /esg/impact` |
| Ciência cidadã       | `GET·POST /citizen-reports`, `PATCH /citizen-reports/{id}`                       |
| IoT                  | `GET /iot-nodes`, `GET /iot-nodes/{id}/readings`, `GET /iot-nodes/calibration`   |
| Adote uma Ilha Verde | `GET·POST /adoptions`, `GET /adoptions/{id}`                                     |
| Relatórios           | `GET /reports/programs`, `POST /reports/preview`                                 |

`GET /api/health` atende orquestradores (Docker, balanceadores).

## Banco de dados

[`db/schema.sql`](../db/schema.sql) (PostgreSQL 16 + PostGIS 3.4, schema `ipe`) espelha os repositórios. Inclui a função `ipe.ivtu_score()` e a view `ipe.v_block_ivtu`, que replicam a fórmula do domínio. O teste [`schema.test.ts`](../src/server/db/schema.test.ts) aplica esquema e seed num PostgreSQL com PostGIS em WASM (PGlite) e confere o IVTU SQL contra o TypeScript.

## Escalabilidade territorial

Municípios são **dados** (`Municipality`: nome, código IBGE, centro, bounding box, zoom). A interface nunca fixa uma cidade: o seletor do cabeçalho lista o que o repositório devolve. Atender um novo município significa cadastrar uma linha em `municipalities` e processar seu bounding box no pipeline.

## Tema, marca e i18n

- Tokens da marca e semânticos: `src/app/globals.css` (ver `docs/BRAND.md`).
- Textos da interface: `src/lib/i18n/messages/pt-BR.ts`. Números e datas: `src/lib/format.ts` (`Intl`, pt-BR, fuso America/Sao_Paulo).
- Tema claro/escuro: `src/lib/theme.ts` (script inline + `data-theme`).

## Decisões

Ver [`DECISIONS.md`](./DECISIONS.md).
