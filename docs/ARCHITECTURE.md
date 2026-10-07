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

| Pasta                      | Responsabilidade                                                      | Pode importar                     |
| -------------------------- | --------------------------------------------------------------------- | --------------------------------- |
| `src/domain/`              | Tipos, schemas Zod e regras de negócio **puras** (sem I/O, sem React) | apenas `src/domain`               |
| `src/server/repositories/` | Contratos de acesso a dados + implementação `mock`                    | `domain`                          |
| `src/server/services/`     | Orquestração (relatórios, agregações)                                 | `domain`, `repositories`          |
| `src/app/api/v1/`          | REST: validação Zod, erros padronizados, cache                        | `domain`, `server`                |
| `src/app/` (páginas)       | Rotas, layouts, metadados                                             | tudo acima + `components`         |
| `src/components/`          | UI (layout, mapa, gráficos, ui, tour)                                 | `domain` (tipos), `lib`, `stores` |
| `src/lib/`                 | Config, formatadores, i18n, tema, logger                              | —                                 |
| `src/stores/`              | Estado de cliente (Zustand)                                           | `domain` (tipos)                  |

`src/server/repositories/index.ts` importa `server-only`: qualquer tentativa de usar repositórios em um Client Component falha no build.

## Escalabilidade territorial

Municípios são **dados** (`Municipality`: nome, código IBGE, centro, bounding box, zoom). A interface nunca fixa uma cidade: o seletor do cabeçalho lista o que o repositório devolve. Atender um novo município significa cadastrar uma linha em `municipalities` e processar seu bounding box no pipeline.

## Tema, marca e i18n

- Tokens da marca e semânticos: `src/app/globals.css` (ver `docs/BRAND.md`).
- Textos da interface: `src/lib/i18n/messages/pt-BR.ts`. Números e datas: `src/lib/format.ts` (`Intl`, pt-BR, fuso America/Sao_Paulo).
- Tema claro/escuro: `src/lib/theme.ts` (script inline + `data-theme`).

## Decisões

Ver [`DECISIONS.md`](./DECISIONS.md).
