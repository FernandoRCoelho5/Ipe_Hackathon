# Metodologia

Este documento descreve os modelos que o Ipê usa para gerar o **pré-diagnóstico automatizado para subsidiar a análise do profissional responsável**. Todas as fórmulas estão implementadas como funções puras e testadas em [`src/domain`](../src/domain).

> **Estado atual.** Os coeficientes abaixo são premissas de projeto em ordem de grandeza compatível com a literatura de clima urbano. Todos estão **a validar no piloto**, com os 10 nós IoT, as estações do INMET e as séries de satélite. Nenhum resultado deve ser lido como medição.

---

## 1. Sensação térmica do pedestre (UTCI)

[`thermal/utci.ts`](../src/domain/thermal/utci.ts)

### Por que um modelo simplificado

O UTCI operacional (Bröde et al., 2012) é um polinômio de 6ª ordem com mais de 200 coeficientes. Reproduzi-lo de memória arriscaria erros silenciosos com aparência de precisão. No MVP, adotamos um **modelo aditivo transparente**, ancorado na definição de referência do próprio UTCI:

> UTCI = Ta quando Tmrt = Ta, vento a 10 m = 0,5 m/s e UR = 50% (pressão de vapor de referência limitada a 20 hPa).

### Fórmula

```
UTCI ≈ Ta + R + W + H

R = 0,29 · (Tmrt − Ta) / (1 + 0,12 · (va − 0,5))          ganho radiante, atenuado pelo vento
W = −1,4 · clamp((40 − Ta)/10, 0, 1) · ln(va / 0,5)        resfriamento convectivo (some perto de 40 °C)
H = 0,12 · (pa − pa_ref) · clamp((Ta − 20)/10, 0, 1,5)     umidade acima da referência
pa_ref = min(0,5 · es(Ta), 20 hPa)
va ∈ [0,5; 17] m/s (faixa de validade do UTCI)
```

O teste `coincide com Ta nas condições de referência do UTCI` garante a âncora. Os testes de sinal garantem que mais radiação, menos vento ou mais umidade nunca reduzam a sensação térmica.

**No piloto:** o backend FastAPI calcula o UTCI oficial (biblioteca `pythermalcomfort`) e o compara com este modelo. A troca não muda a interface, porque o contrato de saída (valor + categoria) é o mesmo.

### Categorias de estresse

| UTCI (°C) | Categoria                       |
| --------- | ------------------------------- |
| > 46      | Estresse extremo ao calor       |
| 38 a 46   | Estresse muito forte ao calor   |
| 32 a 38   | Estresse forte ao calor         |
| 26 a 32   | Estresse moderado ao calor      |
| 9 a 26    | Sem estresse térmico            |
| < 9       | Faixas de frio (leve a extremo) |

## 2. Temperatura radiante média (Tmrt)

[`thermal/tmrt.ts`](../src/domain/thermal/tmrt.ts)

```
Tmrt ≈ Ta + 0,034 · S · (1 − 0,85 · sombra) + 0,35 · (Tsup − Ta)
```

- `S`: radiação solar global (W/m²). Ao sol pleno (900 W/m²), o termo solar soma cerca de 30 °C.
- `sombra = clamp(0,9 · copa sobre a calçada + sombra de edificações, 0, 1)`. A copa densa remove cerca de 85% do ganho solar; a radiação difusa permanece.
- `Tsup`: temperatura de superfície derivada da LST do satélite (seção 3).

## 3. Perfis horários (08h–18h)

[`thermal/diurnal.ts`](../src/domain/thermal/diurnal.ts)

O dia de referência de cada município tem poucos parâmetros (Tmín, Tmáx, UR da manhã, vento médio, radiação de pico). No piloto, eles vêm da estação INMET de referência.

| Variável          | Modelo                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Temperatura do ar | Mínima às 6h, máxima às 15h, interpolação cossenoidal                                                                 |
| Radiação solar    | Senoide entre o nascer (5h36) e o pôr do sol (18h54)                                                                  |
| Umidade relativa  | Pressão de vapor constante no dia (ponto de orvalho estável)                                                          |
| Vento             | Média × (0,8 a 1,2), mais forte à tarde                                                                               |
| Superfície        | Excesso sobre o ar na passagem do Landsat (~10h15) acompanha a radiação com 45 min de atraso e resíduo noturno de 10% |
| Ar local          | `Ta + 0,05·(LST − 38) − 3·(copa − 0,15)`, limitado a [−2; +2,5] °C                                                    |

A **janela de pico solar** é 11h–15h. O "UTCI de pico" de um quarteirão é o maior valor nessa janela.

## 4. IVTU — Índice de Vulnerabilidade Térmica Urbana (0–100)

[`ivtu/ivtu.ts`](../src/domain/ivtu/ivtu.ts)

```
IVTU = 100 · (wT·T + wP·P + wS·S) / (wT + wP + wS)
```

| Componente                   | Cálculo (faixas fixas, saturando em 0 e 1)                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **T** estresse térmico       | 0,7 · norm(UTCI pico; 32–46 °C) + 0,3 · norm(LST; 30–50 °C)                                                            |
| **P** circulação             | ln(1 + pedestres/h) / ln(1 + 1500)                                                                                     |
| **S** vulnerabilidade social | 0,40 · (1 − norm(renda; R$ 600–4.500)) + 0,25 · norm(densidade; 1.000–15.000 hab/km²) + 0,35 · norm(idosos 65+; 5–25%) |

**Pesos padrão 0,45 / 0,25 / 0,30.** O estresse térmico é o perigo em si e domina o índice. A vulnerabilidade social pesa mais que a circulação porque cerca de 80% dos óbitos associados ao calor no Brasil entre 2000 e 2019 foram de idosos de 65 anos ou mais (Fiocruz/UFBA). A circulação mede quantas pessoas ficam expostas no pico solar e evita que a periferia, que "reclama menos", fique invisível.

**Faixas fixas, não relativas ao conjunto.** O índice é comparável entre municípios e ao longo dos anos. As faixas térmicas começam no estresse _forte_ (UTCI 32 °C) porque, no verão, quase todo quarteirão já passa do estresse moderado, e o índice precisa discriminar entre eles.

**Níveis:** Baixo < 50 ≤ Médio < 64 ≤ Alto < 72 ≤ Crítico. Esses limiares foram calibrados para que cerca de 10–15% dos quarteirões sejam críticos no verão do Sul Fluminense.

Pesos, faixas e limiares são configuráveis e validados por schema: os pesos não podem somar zero e os limiares precisam ser crescentes.

**Propriedades testadas:** o índice fica sempre em [0, 100] e é **monotônico**, ou seja, piorar qualquer entrada nunca reduz o IVTU (300 casos aleatórios por execução).

## 5. Risco de drenagem (0–1)

[`block/drainage.ts`](../src/domain/block/drainage.ts)

```
risco = 0,45 · proximidade do rio + 0,35 · impermeabilização + 0,20 · relevo plano
proximidade = 1 − norm(distância ao Paraíba do Sul; 100–1.200 m)
plano = 1 − norm(declividade; 1–12%)
```

Trata **calor e drenagem juntos**: a mesma superfície impermeável que aquece a rua acelera o escoamento.

## 6. Motor prescritivo

[`prescription/engine.ts`](../src/domain/prescription/engine.ts)

Regras georreferenciadas explícitas. A IA entra como apoio (estimativas de superfície e de sensação térmica que alimentam as regras), nunca como decisora única. Cada recomendação traz justificativa legível, confiança (0,50–0,92), locais potenciais e checklist de validação de campo.

| Intervenção                      | Quando                                                                                | Nível                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Arborização – Copa elevada**   | Cobertura < 30% e zona comercial (ou mista com ≥ 600 pedestres/h)                     | Tático se calçada ≥ 2,4 m ou solo livre ≥ 10%; senão Estruturante      |
| **Arborização – Copa ampla**     | Cobertura < 30%, calçada ≥ 2,4 m ou praça                                             | Tático                                                                 |
| **Arborização – Porte compacto** | Cobertura < 30%, calçada de 2 a 2,4 m ou solo livre ≥ 5%                              | Tático se solo livre ≥ 10%; senão Estruturante (abertura de canteiros) |
| **Sombreamento tático**          | Sem calçada nem solo livre, em corredor comercial quente                              | Tático (vasos, parklets, coberturas)                                   |
| **Jardins de chuva**             | Impermeabilização ≥ 70% e risco de drenagem de 0,45 a 0,65                            | Tático                                                                 |
| **Pavimento permeável**          | Impermeabilização ≥ 70% e risco de drenagem ≥ 0,65                                    | Estruturante (com microdrenagem)                                       |
| **Pintura atérmica**             | Telhados metálicos ou de fibrocimento ≥ 35%, ou indústria com ≥ 4.000 m² de cobertura | Tático                                                                 |

A meta de 30% de cobertura arbórea vem do estudo da Lancet com 93 cidades europeias, segundo o qual levar a cobertura a 30% evitaria 2.644 mortes prematuras.

**Prioridade (0–100)** combina necessidade, calor e exposição. É a base do ranking da tela de Prescrição.

**Salvaguarda:** o sistema indica apenas _locais potenciais_ (canteiros, praças, recuos e calçadas existentes). Toda indicação exige o checklist de campo: fiação aérea, calçada > 2 m com faixa livre de 1,20 m (NBR 9050), recuos, redes subterrâneas, acessos e visibilidade, drenagem existente, infiltração do solo, estrutura do telhado e ART/RRT.

## 7. Simulador what-if

[`simulation/simulate.ts`](../src/domain/simulation/simulate.ts) · coeficientes em [`simulation/coefficients.ts`](../src/domain/simulation/coefficients.ts), cada um com unidade e justificativa.

1. **Árvores** aumentam a copa do quarteirão e o sombreamento da calçada:
   `Δcopa_calçada = Σ n · área_copa · crescimento(anos) · densidade_sombra · 0,55 / (perímetro · largura da calçada)`, com `crescimento(t) = 1 − e^(−t/4,5)` (≈ 50% em 3 anos, ≈ 90% em 10 anos).
2. **Capacidade de plantio** = perímetro / 8 m (se calçada ≥ 2 m) + solo livre / 30 m². Acima disso, o efeito é limitado e o resultado avisa.
3. **Superfície:** `ΔLST = −13·Δcopa − 9·(área convertida em piso drenante) − 12·(telhado pintado) × 0,35`. O pedestre "vê" só parte dos telhados.
4. **Ar:** `−0,4 °C × fração convertida − 0,5 °C × fração pintada`, além do efeito da copa no ar local (seção 3).
5. O UTCI é recalculado hora a hora com os mesmos modelos das seções 1–3.

**Saídas:**

- variação média do UTCI no pico (11h–15h);
- curva horária atual × simulada;
- evapotranspiração relativa (copa 1,0; solo vegetado 0,6; piso drenante 0,12);
- escoamento pelo método racional (asfalto 0,90; telhado 0,95; piso drenante 0,35; solo 0,20);
- volume retido por ano, com precipitação de referência de 1,4 m/ano.

**Incerteza.** O resultado nunca é um número único. O modelo roda em três cenários de sensibilidade (conservador, central e otimista), variando a eficácia da sombra (0,70 / 0,85 / 0,92), a sobreposição da copa com a calçada (0,40 / 0,55 / 0,65) e os coeficientes de superfície (×0,7 / ×1,0 / ×1,2). A interface mostra a faixa.

**Propriedades testadas:** nenhuma intervenção aquece em nenhuma hora; a cobertura nunca passa de 95%; o escoamento nunca aumenta; mais árvores nunca pioram o resultado.

## 8. Retorno ESG

[`esg/esg.ts`](../src/domain/esg/esg.ts)

- **CO₂:** 8, 15 e 25 kg por árvore por ano na maturidade (pequeno, médio e grande porte), crescendo com a copa, com 85% de sobrevivência das mudas.
- **Área verde:** área de copa no fim do horizonte de avaliação.
- **Água retida:** `área drenante × 1,4 m/ano × (0,90 − 0,35)`.

Todas as premissas são devolvidas junto com o resultado e impressas no selo do parceiro.

## 9. Limitações conhecidas

- Modelo de UTCI simplificado (seção 1). Erro esperado da ordem de 1–2 °C frente ao UTCI oficial, a quantificar no piloto.
- Copa sobre calçada e sombra de edificações são estimativas. No piloto, vêm da super-resolução Sentinel-2 + OSM.
- Vento urbano tratado como exposição média do quarteirão, sem modelagem de cânion.
- O dia de referência é um dia quente típico de verão. Ondas de calor são tratadas como alerta.
