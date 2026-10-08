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

## ADR-009 · Modelo simplificado de UTCI no MVP

**Contexto.** O UTCI operacional é um polinômio de 6ª ordem com mais de 200 coeficientes. Reproduzi-lo sem a tabela oficial arriscaria erros silenciosos com aparência de precisão.

**Decisão.** Usar no domínio um modelo aditivo transparente, ancorado na condição de referência do UTCI (UTCI = Ta com Tmrt = Ta, vento de 0,5 m/s e UR de 50%) e com coeficientes nomeados em `UTCI_MODEL`. No piloto, o backend calcula o UTCI oficial (`pythermalcomfort`) para calibração.

**Consequências.** Valores explicáveis ("por quê") e testáveis. Erro esperado de 1–2 °C frente ao oficial, declarado em `docs/METHODOLOGY.md` e a quantificar no piloto. O contrato de saída não muda quando o modelo oficial entrar.

## ADR-010 · Faixas fixas e limiares calibrados no IVTU

**Contexto.** Com faixas relativas ao conjunto (mín–máx), o mesmo quarteirão mudaria de nota quando outro município fosse adicionado. Com a faixa térmica a partir de UTCI 26 °C, 70% dos quarteirões caíam em "Alto" no verão.

**Decisão.** Normalizar por faixas fixas, com a térmica a partir do estresse forte (UTCI 32 °C), e usar limiares padrão 50/64/72, que deixam cerca de 10–15% dos quarteirões críticos no verão regional. Tudo configurável e validado por schema.

**Consequências.** O índice é comparável entre municípios e anos e discrimina dentro da cidade. A calibração dos limiares é revisada com os dados reais do piloto.

## ADR-011 · Dados demonstrativos determinísticos, ancorados e deslocados no tempo

**Contexto.** A demo precisa ser reproduzível (testes, apresentação) e, ao mesmo tempo, parecer "ao vivo" (relatos recentes, sensores na hora atual).

**Decisão.** Gerar o conjunto com semente fixa e datas relativas a um âncora, versionar os JSONs e deslocá-los na leitura (`createTimeShift`) em **dias inteiros**, alinhando a data local do âncora à de hoje. O deslocamento por horas foi descartado: tirava as leituras de fase com o ciclo diário (pico de calor de madrugada), o que o teste de calibração sensor × modelo detectou. O gerador produz dados até 23 h depois do âncora e o repositório descarta o futuro. Um teste falha se os JSONs divergirem do gerador.

**Consequências.** O conteúdo é idêntico em qualquer máquina e as datas são sempre plausíveis. As escritas da demo ficam em memória, guardadas em `globalThis` para sobreviver ao hot reload.

## ADR-012 · Contratos da API em Zod como fonte única do OpenAPI

**Contexto.** O OpenAPI precisa servir de contrato para o futuro backend FastAPI. Um YAML escrito à mão diverge do código com o tempo.

**Decisão.** Os DTOs da API v1 são schemas Zod (`src/lib/api/contracts.ts`), usados pelos handlers, pelos testes de contrato (cada resposta real é validada) e pelo gerador `npm run openapi` (`z.toJSONSchema`). Os testes falham se o YAML versionado divergir, se uma rota existir sem documentação ou se um `$ref` não resolver. Asserções de tipo garantem que os DTOs e os tipos do domínio não divergem.

**Consequências.** Contrato, código e documentação ficam sempre alinhados. Mudar um campo exige `npm run openapi`, e o CI acusa o esquecimento.

## ADR-013 · Validar o esquema PostGIS com PGlite nos testes

**Contexto.** Não há Docker no ambiente de desenvolvimento nem no CI padrão. Um `schema.sql` nunca executado é um risco.

**Decisão.** Usar `@electric-sql/pglite` com a extensão PostGIS (PostgreSQL em WASM) como dependência de desenvolvimento. O teste aplica `db/schema.sql` e o seed, verifica contagens, restrições (LGPD, domínios), consultas espaciais e compara o IVTU calculado pela view SQL com o do domínio TypeScript em todos os quarteirões.

**Consequências.** O SQL é exercitado a cada execução do CI, em cerca de 10 s. O PGlite roda PostgreSQL 18 / PostGIS 3.6; o esquema evita recursos posteriores ao PG 16 (alvo do docker-compose), mas a validação final no PostGIS 16 depende de rodar o `docker compose` uma vez.

## ADR-014 · Payload do mapa: gzip na API e UTCI horário separado da geometria

**Contexto.** O Next.js comprime páginas, mas não as respostas de Route Handlers. As camadas do mapa de um município têm cerca de 400 KB, e refazer esse download a cada movimento do slider de horário tornaria o mapa lento.

**Decisão.** Comprimir respostas JSON com gzip no wrapper da API (`CompressionStream`) e criar `GET /thermals/utci-by-hour`, com o UTCI de todos os quarteirões nas 11 horas em cerca de 7 KB comprimidos. A geometria vem uma vez; o slider recolore o mapa no cliente.

**Consequências.** Camadas em cerca de 41 KB e slider instantâneo. Em produção atrás de nginx ou CDN, a compressão pode migrar para o proxy sem mudar o contrato.

## ADR-015 · Telas no cliente com TanStack Query e estado na URL

**Contexto.** O município ativo é estado do navegador (persistido), e filtros, camada e quarteirão selecionado precisam virar links compartilháveis. Buscar no servidor a cada filtro tornaria as páginas dinâmicas e anularia o HTML estático do Cache Components.

**Decisão.** Páginas estáticas com o esqueleto da tela; a tela é um Client Component em `<Suspense>` que lê a URL e consome a API v1 com TanStack Query (`src/lib/api/queries.ts`). Filtros e seleção vão para a URL pela History API nativa (`replaceState`/`pushState`), que o App Router sincroniza com `useSearchParams` sem nova renderização no servidor.

**Consequências.** As telas saem do CDN como estáticas, o frontend fala só com o contrato OpenAPI (o backend FastAPI pode substituir os Route Handlers sem mudar telas) e qualquer visão pode ser compartilhada por link. O custo é uma ida à API após a hidratação, coberta por esqueletos e cache de cinco minutos.

## ADR-016 · Worker do MapLibre no mesmo domínio e CSP do mapa

**Contexto.** O MapLibre 6 é só ESM e resolve seu Web Worker relativo ao próprio módulo (`import.meta.url`), referência que se perde quando o Turbopack empacota o código. A CSP prevista para esta fase também precisa liberar o basemap.

**Decisão.** `scripts/copy-maplibre-worker.mjs` (em `predev` e `prebuild`) copia o worker para `public/vendor/` (fora do Git), e `<ThermalMap />` aponta para ele com `setWorkerUrl`, com a versão na query string. A CSP libera `basemaps.cartocdn.com` e subdomínios em `connect-src` e `img-src` e o próprio domínio em `worker-src`. Scripts mantêm `'unsafe-inline'` (script de tema e payload RSC sem nonce), porque nonces tornariam todas as páginas dinâmicas.

**Consequências.** O mapa funciona sob CSP, e o Docker herda o passo pelo `npm run build`. Trocar de basemap exige atualizar `BASEMAP_ORIGINS` em `next.config.ts`.

## ADR-017 · Limite próprio para cálculos POST sem efeito colateral

**Contexto.** O simulador dispara `POST /simulation/what-if` e `POST /esg/impact` a cada ajuste dos controles (com debounce de 250 ms). Com o limite de escritas (30/min), uma sessão normal de exploração receberia 429.

**Decisão.** Esses dois endpoints usam `computeRateLimiter` (240/min por IP e rota); escritas de verdade seguem em 30/min.

**Consequências.** Exploração fluida no simulador, ainda com proteção contra abuso. O OpenAPI documenta os dois limites na resposta 429.

## ADR-018 · Relatórios gerados no navegador a partir de um roteiro único

**Contexto.** O relatório para editais precisa existir em três formas — pré-visualização na tela, PDF para submissão e DOCX editável pela prefeitura — sem que números ou textos divirjam entre elas. Gerar no servidor exigiria Chromium headless ou LibreOffice na imagem Docker.

**Decisão.** A API devolve o documento estruturado (`POST /reports/preview`); `buildReportOutline` o traduz uma única vez em seções, parágrafos, listas, indicadores e tabelas. HTML, PDF (`@react-pdf/renderer`, A4, Poppins embutida, wordmark vetorial) e DOCX (`docx`) só desenham esse roteiro. Os dois geradores são importados sob demanda no clique de download.

**Consequências.** Os três formatos são consistentes por construção, e os testes geram PDF e DOCX reais (Node) a partir de um relatório verdadeiro do serviço. Nenhuma dependência nativa no servidor; o custo (≈ 1 MB de JavaScript) só é pago por quem baixa um arquivo.

## ADR-019 · CSP para o WebAssembly do gerador de PDF

**Contexto.** O motor de layout do react-pdf (yoga) é WebAssembly embutido como data URL. Sem ajuste, a CSP bloqueia o `fetch` do `data:` e, em produção, a compilação do WebAssembly.

**Decisão.** Acrescentar `'wasm-unsafe-eval'` a `script-src` e `data:` a `connect-src`. `'unsafe-eval'` continua só em desenvolvimento.

**Consequências.** O PDF é gerado sob CSP em produção. `'wasm-unsafe-eval'` permite compilar WebAssembly, mas não `eval` de JavaScript; `data:` em `connect-src` não amplia exfiltração além do que `'self'` já permite.

## ADR-020 · Perfis de acesso: matriz no domínio, sessão em `<Suspense>` e três pontos de controle

**Contexto.** O RF08 pede permissão por rota e por ação, com seletor de perfil para a banca e caminho para OIDC. Ler o cookie no layout tornaria todas as telas dinâmicas (ADR-001) e anularia o HTML estático das telas (ADR-015).

**Decisão.** A matriz (`src/domain/access`) define quatro perfis, sete permissões e as rotas que exigem permissão (`/relatorios` → gerar relatórios; `/acessos` → gerenciar acessos). Ela é aplicada em três pontos: o `proxy.ts` (sem sessão → `/entrar`; sem permissão → `/acesso-restrito`), o `withApi` das escritas (`401`/`403`, documentados no OpenAPI com o esquema `sessionCookie`) e a interface (navegação filtrada; botões desabilitados com o motivo, e não escondidos, para a regra ficar visível). O layout lê a sessão num Server Component dentro de `<Suspense>` e entrega ao cliente só o perfil (Zustand), conforme o guia `authentication-with-cache-components`. Trocar de perfil é uma Server Action (`signInAs`), que funciona sem JavaScript. Leituras, cálculos (what-if, ESG) e relatos cidadãos continuam públicos. O Cliente Corporativo gera o relatório ESG, mas não os de editais públicos.

**Consequências.** As telas passam a ser pré-renderizadas parcialmente: o esqueleto continua estático e só o perfil chega por requisição. A interface nunca é a barreira de segurança (proxy e API são). Sem `SESSION_SECRET`, o servidor usa um segredo de demonstração e avisa no log; forjar o cookie não dá acesso além do que o seletor já oferece. No piloto, o OIDC substitui `session-token.ts`, `session.ts` e `signInAs`; matriz, proxy, API e interface ficam.

## ADR-021 · Modo Apresentação com tour próprio, roteiro em dados e navegação pela URL

**Contexto.** O pitch precisa de um tour de cerca de 4 minutos, acessível por teclado, que atravesse seis telas, e de um atalho `?demo=1` que deixe tudo pronto. Bibliotecas de tour (Shepherd, driver.js) somam peso e lidam mal com `<dialog>` modais e com a navegação do App Router.

**Decisão.** O roteiro é uma lista de passos (`src/components/tour/steps.ts`), cada um com tela (URL) e alvo (`data-tour`). O `TourOverlay` navega uma vez por passo, acompanha o alvo a cada quadro, posiciona o cartão com uma função pura testada (`placeCard`) e desenha um destaque que não bloqueia a tela, para o apresentador continuar interagindo. Quando há um `<dialog>` modal aberto (gaveta da prescrição), o cartão é desenhado dentro dele; fora dele, ficaria inerte. As telas aceitam o estado do tour pela URL (`?bloco=`, `?aba=`, e `?exemplo=1` nos relatórios, que preenche e gera um relatório de exemplo). Com `?demo=1`, o proxy entra como Administrador Municipal e o cliente seleciona o primeiro município e o quarteirão mais crítico, e abre a introdução do tour. O estado fica no `sessionStorage`.

**Consequências.** Nenhuma dependência nova, e cada passo é um link compartilhável. Para incluir um passo, basta um `data-tour` na tela e uma linha no roteiro. Quem não é administrador vê, na introdução, o aviso de que o tour troca o perfil.

## ADR-022 · Landing estática com vitrine dos dados demonstrativos

**Contexto.** A landing precisa vender (mostrar o produto, ter números de impacto e o comparativo), com Lighthouse ≥ 90 e boa prévia nos compartilhamentos.

**Decisão.** A página é um Server Component estático (`"use cache"`), sem MapLibre. A vitrine (`buildShowcase`) recorta os dados demonstrativos em torno do quarteirão mais crítico e os desenha em SVG: quarteirões coloridos por UTCI e o mesmo trecho em pixels de 30 m pela temperatura de superfície, cada pixel com a média de área dos quarteirões e ruas que cobre. A revelação ao rolar usa CSS com `animation-timeline: view()`, sem JavaScript e desligada com `prefers-reduced-motion`. A imagem Open Graph é gerada no build (`next/og`, Poppins embutida) com o mesmo recorte. Os números de impacto são só os das fontes do projeto e levam o selo "Estimativas a validar no piloto".

**Consequências.** A landing carrega só o JavaScript do formulário de piloto. O comparativo de concorrentes descreve o foco principal de cada ferramenta e traz uma nota sobre a fonte. Revisar a tabela antes de cada apresentação.

## ADR-023 · Pedido de piloto como único dado pessoal

**Contexto.** O CTA "Solicitar piloto" não pode ser um botão morto, mas a plataforma se apresenta como livre de dados pessoais (LGPD).

**Decisão.** `POST /api/v1/pilot-requests` recebe o contato institucional com consentimento obrigatório (`consent: true`), limite de 5 pedidos por minuto por IP, e devolve só o protocolo, sem ecoar o contato. Na demo, o pedido fica em memória. A tabela `pilot_requests` registra `consent_at` e um comentário de retenção. A página de privacidade e o resumo LGPD passaram a citar essa exceção.

**Consequências.** O texto de privacidade continua verdadeiro. No piloto, o pedido deve seguir para o CRM ou o e-mail comercial, com prazo de exclusão definido com o DPO.

## ADR-024 · Gavetas modais fecham quando a tela fica oculta

**Contexto.** O App Router guarda a tela anterior oculta (`<Activity>`) para o "voltar" ser instantâneo. Uma gaveta `<dialog>` aberta com `showModal()` continuava modal, mesmo invisível, e deixava inerte a tela seguinte. Era o caso do botão "Simular este quarteirão", na prescrição, que travava o simulador; o tour revelou o problema.

**Decisão.** A limpeza do efeito do `Drawer` fecha o `<dialog>` em silêncio (sem chamar `onClose`, que mexeria na URL da tela oculta). Ao reexibir a tela, o efeito reabre a gaveta.

**Consequências.** Navegar a partir de uma gaveta é seguro, e a gaveta continua aberta ao voltar. Há um teste com `<Activity>` cobrindo o caso.
