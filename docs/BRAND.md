# Identidade visual no produto

Fonte: _Manual de Identidade Visual — Ipê · Inteligência Térmica Urbana_. Este documento mostra como o manual foi traduzido para código.

## Cores

Definidas em [`src/app/globals.css`](../src/app/globals.css) como tokens do Tailwind v4 (`@theme`).

| Token       | Hex       | Uso                                         | Utilitário                       |
| ----------- | --------- | ------------------------------------------- | -------------------------------- |
| Verde Ipê   | `#083E28` | Logotipo, títulos, texto, botão primário    | `bg-verde-ipe`, `text-verde-ipe` |
| Verde Folha | `#1E842D` | Destaques, ícones ativos, foco (tema claro) | `bg-verde-folha`                 |
| Amarelo Ipê | `#FAB20A` | Acentos, linhas, item de navegação ativo    | `bg-amarelo-ipe`                 |
| Verde Lima  | `#82B930` | Apoio; primária no tema escuro              | `bg-verde-lima`                  |
| Laranja Sol | `#FA6F14` | Pontual: calor e dados                      | `bg-laranja-sol`                 |
| Azul Cidade | `#159EBF` | Pontual: ilustração e dados                 | `bg-azul-cidade`                 |
| Azul Rio    | `#046A8F` | Pontual: drenagem e água                    | `bg-azul-rio`                    |
| Papel       | `#F9F9F3` | Fundo claro                                 | `bg-papel`                       |

**Tokens semânticos** (`bg-surface`, `text-fg`, `text-fg-muted`, `border-line`, `bg-primary`…) trocam de valor no tema escuro. Componentes devem usar estes, e não as cores da marca, sempre que a cor depender do tema.

**Escala térmica** (`bg-thermal-1` a `bg-thermal-6`, utilitário `thermal-gradient`): verde → lima → amarelo → laranja → vermelho → vinho. Vermelho e vinho existem só para dados, como pede o manual. Nos mapas, a cor vem sempre acompanhada de valor numérico e rótulo, para que a leitura não dependa só da cor (daltonismo).

**Escalas do mapa** ([`components/map/scales.ts`](../src/components/map/scales.ts)): faixas fixas por camada (UTCI 26–46 °C, superfície 25–50 °C, IVTU por nível, cobertura arbórea em verdes, risco de alagamento em azuis), iguais em qualquer hora e município. Os selos de dado (`IvtuBadge`, `UtciChip`) escolhem texto Verde Ipê ou branco pelo maior contraste.

**Gráficos** (`--chart-current`, `--chart-simulated`): vermelho térmico × Azul Cidade, par validado para daltonismo nos dois temas (ΔE ≥ 19 em deuteranopia). A série "situação atual" é tracejada e há legenda e tabela de dados, então a leitura não depende só da cor.

### Contraste (WCAG 2.1 AA)

| Combinação                                 | Razão    |
| ------------------------------------------ | -------- |
| Verde Ipê sobre Papel                      | 11,5 : 1 |
| Branco sobre Verde Folha                   | 4,5 : 1  |
| Verde Ipê sobre Amarelo Ipê                | 6,6 : 1  |
| `text-fg-muted` (#4A6357) sobre Papel      | 6,2 : 1  |
| `text-highlight-ink` (#9A6700) sobre Papel | 4,6 : 1  |

Amarelo Ipê sobre Papel tem só 1,7 : 1 e por isso **não é usado em texto no tema claro**. Números e rótulos "em amarelo" usam `text-highlight-ink`, que vira Amarelo Ipê no tema escuro.

## Tipografia

Poppins via `next/font/google` (pesos 300–700, subconjuntos `latin` e `latin-ext`), variável `--font-poppins`. Títulos em 600–700; corpo em 400–500; legendas em Medium, caixa alta, com tracking amplo.

## Logotipo

Componente [`<Logo />`](../src/components/brand/Logo.tsx):

```tsx
<Logo variant="horizontal" />          // assinatura principal (preferencial)
<Logo variant="symbol" />              // símbolo isolado
<Logo variant="wordmark" />            // logotipo + assinatura descritiva
<Logo tone="negative" />               // sobre Verde Ipê ou fundos escuros
<Logo decorative />                    // quando houver rótulo visível ao lado
```

Regras do manual aplicadas:

- **Tamanho mínimo digital:** assinatura horizontal com 140 px de largura (altura ≥ 56 px, classe `h-14`); símbolo com 40 px. Abaixo disso, usar só o símbolo, como faz o cabeçalho no mobile.
- **Área de proteção:** 2X ao redor, onde X é o diâmetro do pingo do "i" (29 unidades da geometria do wordmark).
- **Versão negativa:** símbolo dentro de um círculo Papel e wordmark branco, sem divisor e sem traço amarelo.
- **Não** distorcer, recolorir, girar nem aplicar sobre fundo sem contraste.

### Arquivo provisório e como substituir pelo oficial

O SVG atual é **provisório**: foi redesenhado a partir das referências raster em [`docs/brand/`](./brand/). Para trocar pelo arquivo oficial:

1. Coloque os SVGs oficiais em `public/brand/` (`ipe-horizontal.svg`, `ipe-simbolo.svg`, `ipe-wordmark.svg` e as versões `-negativo`).
2. Substitua o conteúdo de `Logo.tsx` por um `<img>` (ou SVG inline importado) que aponte para esses arquivos, mantendo a mesma API de props (`variant`, `tone`, `decorative`, `title`).
3. Rode `npm run test`: os testes de `Logo.test.tsx` garantem nome acessível e ids únicos.

Nenhum outro arquivo precisa mudar.
