# Registro de decisões (ADR)

Formato curto: contexto → decisão → consequências. Decisões novas entram no fim, numeradas.

---

## ADR-001 · Manter Next.js 16.4 com Cache Components e Partial Prefetching

**Contexto.** O projeto foi criado com `cacheComponents` e `partialPrefetching` ativos (padrão do `create-next-app` 16.4). Nesse modelo, leituras de `cookies()`/`headers()` e dados sem cache precisam ficar atrás de `<Suspense>`, e `error.tsx` recebe `retry` (estável desde 16.3) em vez de `reset`.

**Decisão.** Manter os dois recursos. Dados demonstrativos vêm de módulos determinísticos (pré-renderizáveis); leituras de sessão ficam em boundaries com `<Suspense>`. O antigo `middleware` é escrito como `proxy.ts`.

**Consequências.** Telas estáticas saem do CDN instantaneamente; quem tocar em sessão precisa seguir o guia `authentication-with-cache-components` incluído em `node_modules/next/dist/docs`.

## ADR-002 · MapLibre GL JS como motor de mapa

**Contexto.** O documento do projeto cita Mapbox GL JS, que exige token e cobra por carga de mapa.

**Decisão.** Usar MapLibre GL JS (fork open source, API compatível) com basemap Carto/OSM, atrás do componente `<ThermalMap />`.

**Consequências.** Custo zero de licença na demo e no piloto. Trocar para Mapbox ou Deck.gl afeta só a implementação de `<ThermalMap />`.

## ADR-003 · Autenticação de demonstração própria, com cookie assinado por HMAC

**Contexto.** O RF08 pede perfis com permissão por rota e ação. Para o MVP basta um seletor de perfil; Auth.js adicionaria dependência, configuração de provedores e risco de incompatibilidade com Next 16.4.

**Decisão.** Sessão em cookie `httpOnly` assinado com HMAC-SHA256 (Web Crypto), verificado no `proxy.ts` e nas rotas de escrita. As permissões vivem numa matriz pura em `src/domain`, testada.

**Consequências.** Sem dependência extra. A troca para OIDC real substitui só a emissão e a validação da sessão; matriz de permissões, rotas e UI permanecem.

## ADR-004 · Logotipo vetorial provisório

**Contexto.** O repositório não tem os arquivos vetoriais oficiais da marca; existem apenas referências raster (JPG) do manual.

**Decisão.** Desenhar um SVG limpo e fiel às referências (`src/components/brand`), com as variantes `horizontal`, `symbol` e `wordmark` e os tons positivo e negativo. As referências raster ficam em `docs/brand/` apenas para consulta.

**Consequências.** O logo escala sem perda e se adapta ao tema. A substituição pelo arquivo oficial está descrita em `docs/BRAND.md`.

## ADR-005 · Popover API e `<dialog>` nativos em vez de biblioteca de componentes

**Contexto.** Popovers, gavetas e modais precisam de foco preso, Esc e clique fora, com acessibilidade correta.

**Decisão.** Usar `popover` e `<dialog>` nativos (top layer, Esc e devolução de foco inclusos) e componentes próprios sobre os tokens da marca, sem shadcn/Radix.

**Consequências.** Menos JavaScript e nenhuma dependência de UI. Se surgir um padrão complexo (combobox com busca, por exemplo), reavaliamos caso a caso.

## ADR-006 · Ferramental de testes: Vitest 5 e `@types/node` 24

**Contexto.** O Vitest 5 exige `@types/node` 22 ou superior; o template vinha com a versão 20. O runtime local e o do CI é Node 24.

**Decisão.** Atualizar `@types/node` para 24 e fixar `engines.node >= 22.12`.

**Consequências.** Sem `--legacy-peer-deps`; a árvore de dependências resolve limpa.

## ADR-007 · Sem Husky na Fase 1; o CI é o portão de qualidade

**Contexto.** Hooks locais aceleram o feedback, mas no Windows costumam gerar atrito (fins de linha, shells).

**Decisão.** O portão obrigatório é o GitHub Actions (`format:check`, `lint`, `typecheck`, `test`, `build`). `npm run check` reproduz o mesmo fluxo localmente.

**Consequências.** Husky + lint-staged podem entrar depois sem mudar o pipeline.

## ADR-008 · Tema aplicado por script inline antes da pintura

**Contexto.** O tema escuro precisa valer desde o primeiro quadro, sem "flash" e sem erro de hidratação.

**Decisão.** Um script inline no `<head>` lê o `localStorage` e define `<html data-theme>`. O Tailwind usa `@custom-variant dark` sobre `data-theme`. Variantes de logo por tema são trocadas via CSS.

**Consequências.** Sem flash e sem erro de hidratação. O `useTheme` sincroniza a interface com `useSyncExternalStore`.
