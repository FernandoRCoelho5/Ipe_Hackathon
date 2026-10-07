# Dados

## Tudo nesta versão é demonstrativo

O MVP **não** usa dados reais de satélite, de estações ou de sensores. O conjunto foi gerado de forma sintética e determinística para mostrar o funcionamento da plataforma. Por isso, a interface exibe o selo **"Dados demonstrativos"**, e os relatórios exportados trazem a mesma nota.

| O que é real                                                                                    | O que é sintético                                                                                       |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Municípios, códigos IBGE e população (Censo 2022)                                               | Malha de quarteirões e suas posições                                                                    |
| Nomes de bairros                                                                                | Posição aproximada dos bairros dentro da cidade                                                         |
| Algumas avenidas conhecidas (ex.: Av. Amaral Peixoto, Av. Joaquim Leite, Av. Albino de Almeida) | Demais logradouros (nomes genéricos)                                                                    |
| Traçado geral do Rio Paraíba do Sul (aproximado)                                                | LST, NDVI, cobertura, impermeabilização, renda, densidade, idosos e circulação                          |
| Espécies arbóreas e seus nomes científicos                                                      | Leituras IoT, relatos cidadãos, parcerias e séries de NDVI                                              |
|                                                                                                 | Parceiros do "Adote uma Ilha Verde" (**fictícios**; qualquer semelhança com nomes reais é coincidência) |

## Como o conjunto é gerado

```bash
npm run seed   # tsx scripts/seed-demo-data.ts
```

- **Gerador:** [`src/server/demo-data/generate.ts`](../src/server/demo-data/generate.ts), com perfis em [`profiles.ts`](../src/server/demo-data/profiles.ts).
- **Semente fixa** (`DEMO_SEED = 20260120`) com PRNG `mulberry32`: o mesmo resultado byte a byte em qualquer máquina. O teste `dataset.test.ts` falha se os JSONs versionados divergirem do gerador.
- **Validação:** todo registro passa pelos schemas Zod do domínio antes de ser gravado.
- **Saída:** `src/server/repositories/mock/data/*.json`, com cerca de 1,4 MB no total.

### Malha de quarteirões

Para cada bairro, o gerador cria uma grade de quarteirões girada (±28°), com bordas irregulares e leve variação de forma: cerca de 110 × 75 m, ou 215 × 150 m em áreas industriais. Ficam de fora os quarteirões que caem fora do bounding box do município ou a menos de 60 m da margem do rio.

### Atributos e padrões reproduzidos

Os atributos seguem o perfil do bairro (centro comercial, uso misto, residencial médio ou alto padrão, periferia, industrial) e a zona do quarteirão. O modelo de superfície é:

```
LST ≈ 27 + 15·impermeabilização + 7·telhado metálico − 13·copa + 3·propensão ao calor − resfriamento do rio + ruído
```

| Padrão urbano                 | Como aparece                                              |
| ----------------------------- | --------------------------------------------------------- |
| Áreas industriais e galpões   | Mais quentes (telhados metálicos, solo selado)            |
| Centros comerciais            | Densos, pouca vegetação, alto fluxo de pedestres          |
| Periferias                    | IVTU alto por vulnerabilidade social e calçadas estreitas |
| Proximidade do Paraíba do Sul | Risco de drenagem; leve resfriamento da superfície        |
| Praças e bairros arborizados  | Mais frios                                                |

### Demais entidades

- **10 nós IoT** (ESP32 + SHT31; 4 em Volta Redonda, 3 em Barra Mansa, 3 em Resende) nos corredores de maior circulação. Têm leituras horárias de 7 dias derivadas do modelo térmico, com viés e ruído do sensor. Estados realistas: `VR-03` com bateria baixa, `BM-02` offline há 9 h e `RS-03` com sinal fraco.
- **240 relatos cidadãos** anônimos: só texto, coordenadas e categoria. Concentram-se nos quarteirões mais quentes e movimentados, nos últimos 30 dias, com status Pendente, Validado, Descartado e Spam. Cerca de 5% são spam detectável.
- **8 parcerias "Adote uma Ilha Verde"**, com série de NDVI na revisita alternada Sentinel-2 (5 dias) e Landsat (8 dias), observações com nuvem marcadas e uma estiagem recente simulada. Também trazem o cronograma de manutenção com tarefas preditivas.
- **1 alerta de onda de calor** ativo para os três municípios.

### Datas sempre "atuais"

O conjunto é ancorado em `2026-01-20T15:00` (horário de Brasília). Na leitura, o repositório mock desloca todas as datas para que o âncora coincida com a hora cheia atual ([`clock.ts`](../src/server/repositories/mock/clock.ts)). O conteúdo continua determinístico, mas o último relato é de minutos atrás e as leituras IoT chegam até a hora corrente.

### Escritas durante a demonstração

Novos relatos, moderação, parcerias, cenários salvos e checklists ficam **em memória** no processo do servidor e se perdem ao reiniciar.

## Como trocar pelo pipeline real

A interface e as rotas dependem só dos contratos em [`src/server/repositories/types.ts`](../src/server/repositories/types.ts). Para usar dados reais:

1. **Ingestão** (backend `apps/api`, ver roadmap):
   - **Google Earth Engine / Planetary Computer:** composições de verão Landsat 8/9 (LST, banda termal) e Sentinel-2 (NDVI, NDWI, uso do solo), filtradas por nuvem.
   - **INMET:** estações de Volta Redonda, Resende e Valença, que geram o `DailyWeather` de cada município.
   - **OpenStreetMap:** quarteirões (polígonos entre vias), calçadas e praças. Um script opcional de download via Overpass pode substituir a malha sintética.
   - **IBGE/Ipea:** setores censitários (renda, densidade, % de idosos) e Índice de Vulnerabilidade Social, agregados por quarteirão.
2. **Persistência:** PostgreSQL 16 + PostGIS 3.4 com o esquema de `db/schema.sql` (Fase 3).
3. **Implementação `postgis`** dos repositórios e `DATA_SOURCE=postgis` no ambiente.
4. **Calibração:** comparar o UTCI do modelo com o UTCI oficial e com os nós IoT, ajustando os coeficientes de [`coefficients.ts`](../src/domain/simulation/coefficients.ts) e de `thermal/`.
