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
| `src/lib/`                 | Config, formatadores, i18n, tema, logger                              | `domain` (regras puras, ex.: acesso)   |
| `src/stores/`              | Estado de cliente (Zustand): município, perfil, tour                  | `domain` (tipos)                       |

Server Actions (`src/server/auth/actions.ts`, com `"use server"`) podem ser importadas por componentes: são chamadas remotas, não código do servidor no navegador.

`src/server/repositories/index.ts` importa `server-only`: qualquer tentativa de usar repositórios em um Client Component falha no build.

## API v1

- **Contratos:** [`src/lib/api/contracts.ts`](../src/lib/api/contracts.ts) (Zod), a fonte única de tipos, validação e [`docs/openapi.yaml`](./openapi.yaml) (`npm run openapi`).
- **Handlers:** `src/app/api/v1/**/route.ts`, finos: validam, chamam o serviço e respondem.
- **Wrapper `withApi`** ([`src/server/http/handler.ts`](../src/server/http/handler.ts)): `X-Request-Id`, log estruturado, erros no formato `ApiError` (400/404/413/415/429/500), rate limit de escritas (30/min por IP e rota; 240/min nos cálculos what-if e ESG), corpo JSON limitado a 64 KB e gzip.
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
| Comercial            | `POST /pilot-requests` (público, 5/min)                                          |

`GET /api/health` atende orquestradores (Docker, balanceadores).

## Telas e dados no cliente

As telas são Client Components dentro de `<Suspense>` (leem a URL com `useSearchParams`): o esqueleto sai no HTML estático e os dados vêm da API v1.

- **Consultas:** [`src/lib/api/queries.ts`](../src/lib/api/queries.ts) reúne chave, função e política de cache de cada endpoint para o TanStack Query; [`client.ts`](../src/lib/api/client.ts) converte `ApiError` em `ApiClientError` com mensagem pronta para a interface.
- **Município ativo:** `useActiveMunicipality()` (contexto do layout + Zustand) é `null` até a reidratação, para nenhuma tela buscar dados do município errado.
- **Estado na URL:** filtros, camada, página e quarteirão aberto (`?bloco=`) via History API nativa (`useUrlState`). Os links são compartilháveis e o "voltar" funciona. `useBlockMunicipalitySync` alinha quarteirão e município quando um link aponta para outra cidade.
- **Mapa:** [`<ThermalMap />`](../src/components/map/thermal-map.tsx) é o único arquivo que conhece o MapLibre. A geometria entra uma vez; UTCI da hora, seleção e destaque são `feature-state`.
- **Formulários:** React Hook Form validado pelos MESMOS schemas Zod da API (`reportRequestSchema`, `newAdoptionSchema`), com as mensagens em português do domínio.
- **Relatórios:** [`report-outline.ts`](../src/components/reports/report-outline.ts) traduz o `ReportDocument` em um roteiro único; a pré-visualização (HTML), o PDF (`@react-pdf/renderer`) e o DOCX (`docx`) só desenham esse roteiro. Os geradores são carregados no clique e rodam no navegador.
- **Simulador:** os controles editam um rascunho puro ([`scenario.ts`](../src/components/simulator/scenario.ts)); o efeito é sempre calculado pela API (`POST /simulation/what-if`, com debounce), e o resultado anterior fica esmaecido enquanto o novo chega.

| Tela                 | Endpoints usados                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| Mapa                 | `thermals/map-layers`, `thermals/utci-by-hour`, `alerts`, `prescriptions/ivtu-ranking`, `blocks/{id}`  |
| Prescrição           | `prescriptions/ivtu-ranking`, `blocks/{id}`, `blocks/{id}/checklist` (GET e PUT)                       |
| Simulador            | `blocks/{id}`, `simulation/what-if`, `esg/impact`, `simulation/scenarios` (GET e POST)                 |
| Relatórios           | `reports/programs`, `prescriptions/ivtu-ranking` (bairros), `simulation/scenarios`, `reports/preview`  |
| Ciência cidadã       | `citizen-reports` (GET, POST e PATCH), `iot-nodes`, `iot-nodes/{id}/readings`, `iot-nodes/calibration` |
| Adote uma Ilha Verde | `adoptions` (GET e POST), `prescriptions/ivtu-ranking` (busca da área)                                 |

## Acesso (RF08)

A matriz de perfis e permissões vive em [`src/domain/access`](../src/domain/access/access.ts) e é aplicada em três pontos (ADR-020):

| Onde                                          | O que faz                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`src/proxy.ts`](../src/proxy.ts)             | Telas: sem sessão → `/entrar`; sem permissão → `/acesso-restrito`; `?demo=1` → Administrador |
| `withApi({ permission })`                     | Escritas: `401` sem sessão e `403` sem permissão (`ApiError`), com o perfil no log           |
| Interface (`usePermission`, `PermissionNote`) | Navegação filtrada; botões desabilitados com o motivo                                        |

| Permissão                          | Admin. Municipal | Técnico | Cliente B2B | Leitor Público |
| ---------------------------------- | :--------------: | :-----: | :---------: | :------------: |
| Salvar cenários                    |        ✓         |    ✓    |      ✓      |                |
| Checklist de campo                 |        ✓         |    ✓    |             |                |
| Moderar relatos                    |        ✓         |    ✓    |             |                |
| Cadastrar parcerias                |        ✓         |    ✓    |      ✓      |                |
| Gerar e exportar relatórios (tela) |        ✓         |    ✓    |      ✓      |                |
| Editais de recurso público         |        ✓         |    ✓    |             |                |
| Gerenciar acessos (tela)           |        ✓         |         |             |                |

Sessão: cookie `ipe_session` (`httpOnly`, `SameSite=Lax`, 8 h) com HMAC-SHA256 via Web Crypto ([`session-token.ts`](../src/server/auth/session-token.ts)). O layout lê o cookie num Server Component em `<Suspense>` (`SessionLoader`) e entrega só o perfil ao cliente.

## Modo Apresentação

- **`?demo=1`:** o proxy emite a sessão de Administrador Municipal; no cliente, `PresentationMode` seleciona o primeiro município e o quarteirão mais crítico (`?bloco=`) e abre a introdução do tour.
- **Tour:** roteiro em dados ([`steps.ts`](../src/components/tour/steps.ts)), com 12 passos em seis telas. O cartão se ancora em `[data-tour]`, entra no `<dialog>` modal aberto quando há um e responde a ← → e Esc (ADR-021).

## Landing

Server Component estático: hero com uma prévia do mapa em SVG, problema (119.643 mortes e o comparativo pixel de 30 m × quarteirão), solução, comparativo, arquitetura com cronograma e investimento, impacto, adoção e o formulário de piloto. A vitrine vem de [`showcase.ts`](../src/server/services/showcase.ts). Inclui imagem Open Graph gerada no build, `robots.txt`, `sitemap.xml` e JSON-LD (ADR-022).

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
