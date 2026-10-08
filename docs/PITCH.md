# Pitch × produto

Roteiro do pitch de 4:30 min, com a tela que demonstra cada slide e o passo correspondente do tour guiado.

**Antes de subir ao palco**

1. Abra `/mapa?demo=1` (ou "Ver demonstração", na landing). A plataforma entra como **Administrador Municipal**, abre Volta Redonda no quarteirão mais crítico e mostra a introdução do tour.
2. Opcional: no simulador, salve um cenário. Ele aparece no relatório de exemplo.
3. Tenha a landing (`/`) aberta em outra aba para os slides de mercado e investimento.

Os dados são demonstrativos. O selo no cabeçalho e nos relatórios deixa isso claro, e as estimativas trazem "a validar no piloto".

| #   | Slide (tempo sugerido)           | Mensagem                                                                        | Onde mostrar                                                     | Passo do tour |
| --- | -------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- | :-----------: |
| 1   | Problema (0:00–0:35)             | 119.643 mortes associadas a ondas de calor (2000–2019); cerca de 80% idosos     | Landing › 01 · O problema                                        |       —       |
| 2   | Lacuna (0:35–0:55)               | O satélite vê pixels de 30 m, não a rua; superfície ≠ sensação térmica          | Landing › comparativo pixel × quarteirão                         |       —       |
| 3   | Solução (0:55–1:10)              | Dados → Inteligência → Entregas                                                 | Landing › 02 · A solução                                         |       —       |
| 4   | Diagnóstico (1:10–1:40)          | Mapa de calor por quarteirão (UTCI), camadas e horário 08h–18h                  | `/mapa`                                                          |     1 e 2     |
| 5   | Prioridade (1:40–2:00)           | O quarteirão mais crítico: pico, curva horária, quem está exposto (IVTU)        | `/mapa?bloco=…`                                                  |       3       |
| 6   | Prescrição (2:00–2:25)           | O que fazer, com o porquê e o prazo; validação de campo                         | `/prescricao?bloco=…` (gaveta)                                   |     4 e 5     |
| 7   | Simulação (2:25–2:55)            | Árvores, piso permeável e pintura atérmica: alívio em °C com faixa de incerteza | `/simulador?bloco=…`                                             |     6 e 7     |
| 8   | Captação (2:55–3:20)             | Relatório para o Fundo Clima em PDF ou DOCX editável                            | `/relatorios?exemplo=1`                                          |       8       |
| 9   | Engajamento (3:20–3:40)          | Relatos anônimos (LGPD) e sensores IoT calibrando o modelo                      | `/ciencia-cidada` e `?aba=sensores`                              |    9 e 10     |
| 10  | Continuidade (3:40–3:55)         | Adote uma Ilha Verde: NDVI por satélite, zeladoria preditiva, selo ESG          | `/adote-ilha-verde`                                              |      11       |
| 11  | Diferenciais (3:55–4:05)         | Comparativo com Tree Canopy, Tree Equity Score, ENVI-met e UrbVerde             | Landing › 03 · Diferenciais                                      |       —       |
| 12  | Produto vendável (4:05–4:15)     | Perfis de acesso: prefeitura, técnico, empresa e leitor público                 | Menu do perfil (cabeçalho) e `/acessos`                          |      12       |
| 13  | Plano e investimento (4:15–4:30) | Arquitetura em 4 blocos, piloto de 6 meses, R$ 218.020, impacto esperado        | Landing › 04 · Como funciona, 05 · Impacto, 06 · Adoção e escala |       —       |
| 14  | Chamada                          | "Solicitar piloto"                                                              | Landing › formulário de piloto (`/#piloto`)                      |       —       |

## Dicas de apresentação

- **Teclado:** no tour, → avança, ← volta e Esc encerra. O cartão nunca bloqueia a tela, então dá para mexer no slider de horário ou no simulador durante a fala.
- **Perfis ao vivo:** troque para **Leitor Público** no menu do perfil e mostre o botão "Salvar cenário" desabilitado com o motivo, e Relatórios fora do menu. Troque para **Cliente Corporativo** e mostre que só o relatório ESG fica disponível.
- **Números:** use só os números da landing. Todos têm fonte ou o selo "Estimativas a validar no piloto".
