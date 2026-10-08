# Ipê · Inteligência Térmica Urbana

**Saiba em qual rua o calor é pior e o que fazer em cada quarteirão.**

O Ipê é uma plataforma WebGIS de suporte à decisão. Ela mapeia ilhas de calor em escala de rua, estima a sensação térmica do pedestre (UTCI) e prescreve infraestrutura verde (arborização, pavimento permeável e pintura atérmica) para prefeituras e empresas do Sul Fluminense: Volta Redonda, Barra Mansa e Resende, mais de 560 mil habitantes (Censo 2022).

> **Dados demonstrativos.** Esta versão usa dados sintéticos e determinísticos para demonstrar o produto. Toda recomendação é um _pré-diagnóstico automatizado para subsidiar a análise do profissional responsável_.

## Como rodar

Pré-requisito: Node.js 22.12 ou superior (o CI usa Node 24).

```bash
npm install
npm run dev        # http://localhost:3000
npm run check      # lint + typecheck + testes + build (o mesmo portão do CI)
```

Com Docker (PostGIS 16 + aplicação):

```bash
docker compose up --build   # web em http://localhost:3000, PostGIS em localhost:5432
```

A API está documentada em [`docs/openapi.yaml`](docs/openapi.yaml) (OpenAPI 3.1).

### Para apresentar

- **[`/mapa?demo=1`](http://localhost:3000/mapa?demo=1)** (botão "Ver demonstração" da landing): entra como Administrador Municipal, abre Volta Redonda no quarteirão mais crítico e oferece o **tour guiado** (cerca de 4 min, ← → e Esc). O tour também abre pelo botão "Tour da demonstração", no cabeçalho.
- **Perfis de acesso (RF08):** [`/entrar`](http://localhost:3000/entrar) ou o menu do perfil, no cabeçalho, trocam entre Administrador Municipal, Técnico/Analista, Cliente Corporativo (B2B) e Leitor Público. A matriz completa fica em `/acessos`.
- Roteiro do pitch × telas: [`docs/PITCH.md`](docs/PITCH.md).

| Script                                   | O que faz                                           |
| ---------------------------------------- | --------------------------------------------------- |
| `npm run dev`                            | Servidor de desenvolvimento (Turbopack)             |
| `npm run build` / `npm start`            | Build e servidor de produção                        |
| `npm run lint` · `npm run typecheck`     | ESLint e TypeScript estrito                         |
| `npm run test` · `npm run test:coverage` | Vitest + Testing Library                            |
| `npm run format`                         | Prettier (com ordenação de classes Tailwind)        |
| `npm run seed`                           | Regenera os dados demonstrativos (determinísticos)  |
| `npm run db:seed-sql`                    | Gera o seed SQL do PostGIS a partir desses dados    |
| `npm run openapi`                        | Gera `docs/openapi.yaml` a partir dos contratos Zod |

## Stack

Next.js 16.4 (App Router, Cache Components) · React 19 · TypeScript estrito · Tailwind CSS v4 · Poppins · Zod · Zustand · TanStack Query · React Hook Form · MapLibre GL (basemap Carto/OSM) · Recharts · `@react-pdf/renderer` e `docx` (relatórios gerados no navegador) · lucide-react · Vitest. Na fase de endurecimento: Playwright.

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md): camadas, API v1, banco e regras de dependência
- [Contrato da API](docs/openapi.yaml): OpenAPI 3.1, 24 operações
- [Backend futuro](apps/api/README.md): FastAPI + Celery + GEE sobre o mesmo contrato
- [Decisões (ADR)](docs/DECISIONS.md)
- [Metodologia](docs/METHODOLOGY.md): UTCI, IVTU, motor prescritivo, simulador e ESG
- [Dados](docs/DATA.md): o que é demonstrativo e como trocar pelo pipeline real
- [Identidade visual no código](docs/BRAND.md): tokens, contraste e uso do logotipo
- [Roadmap](docs/ROADMAP.md): fases do MVP e caminho para o piloto real
- [Pitch](docs/PITCH.md): cada slide do pitch e a tela (e o passo do tour) que o demonstra

## Estrutura

```
src/
  app/            rotas: landing, entrar, (app)/telas e acessos, privacidade, api/v1
  proxy.ts        sessão e permissão por rota (RF08), atalho ?demo=1
  components/     brand, layout, ui, map, prescription, simulator, reports, citizen, adopt, charts, data,
                  auth (perfis), tour (Modo Apresentação), landing
  domain/         modelos puros: UTCI, IVTU, prescrição, simulador, ESG, acesso (RF08) + schemas Zod
  server/         repositórios (contratos + mock), serviços, sessão, gerador de dados demonstrativos
  lib/            config, formatadores pt-BR, i18n, tema, logger
  stores/         estado de cliente (Zustand)
scripts/          seed-demo-data.ts, export-sql-seed.ts, generate-openapi.ts, copy-maplibre-worker.mjs
db/               schema.sql (PostGIS) e seeds/
apps/api/         plano do backend FastAPI (não implementado)
docs/             arquitetura, metodologia, dados, ADRs, marca e roadmap
```
