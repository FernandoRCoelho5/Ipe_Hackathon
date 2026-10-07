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

| Script                                   | O que faz                                    |
| ---------------------------------------- | -------------------------------------------- |
| `npm run dev`                            | Servidor de desenvolvimento (Turbopack)      |
| `npm run build` / `npm start`            | Build e servidor de produção                 |
| `npm run lint` · `npm run typecheck`     | ESLint e TypeScript estrito                  |
| `npm run test` · `npm run test:coverage` | Vitest + Testing Library                     |
| `npm run format`                         | Prettier (com ordenação de classes Tailwind) |

## Stack

Next.js 16.4 (App Router, Cache Components) · React 19 · TypeScript estrito · Tailwind CSS v4 · Poppins · Zustand · lucide-react · Vitest. Nas próximas fases: MapLibre GL, Recharts, TanStack Query, Zod, React Hook Form, `@react-pdf/renderer`, `docx` e Playwright.

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md): camadas, fluxo de dados e regras de dependência
- [Decisões (ADR)](docs/DECISIONS.md)
- [Identidade visual no código](docs/BRAND.md): tokens, contraste e uso do logotipo
- [Roadmap](docs/ROADMAP.md): fases do MVP e caminho para o piloto real

## Estrutura

```
src/
  app/            rotas: landing, (app)/telas, privacidade, api/v1
  components/     brand, layout, ui (e, nas próximas fases, mapa, gráficos e tour)
  domain/         tipos e regras de negócio puras
  server/         repositórios (contratos + mock)
  lib/            config, formatadores pt-BR, i18n, tema, logger
  stores/         estado de cliente (Zustand)
docs/             arquitetura, ADRs, marca e roadmap
```
