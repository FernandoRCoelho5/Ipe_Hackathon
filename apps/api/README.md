# apps/api — backend de dados (roadmap, não implementado)

Este diretório vai receber o backend **FastAPI + Celery** que substitui os dados demonstrativos pelo pipeline real. Nada aqui é necessário para rodar o MVP.

## Contrato que o backend implementa

O contrato é [`docs/openapi.yaml`](../../docs/openapi.yaml), gerado a partir de [`src/lib/api/contracts.ts`](../../src/lib/api/contracts.ts). Os mesmos 22 endpoints `/api/v1/*` já existem no Next.js. O backend Python os implementa com as mesmas formas de resposta, então o frontend não muda.

Para manter Python e TypeScript alinhados:

- gerar modelos Pydantic a partir do OpenAPI (`datamodel-code-generator --input docs/openapi.yaml --input-file-type openapi`);
- validar as respostas da API Python com os testes de contrato do repositório, apontando para o servidor FastAPI.

## Arquitetura prevista

```
          ┌──────────────┐   tarefas agendadas    ┌──────────────────────────┐
          │ Celery beat  │ ─────────────────────► │ Workers Celery (Python)  │
          └──────────────┘                        │                          │
                                                  │ • GEE / Planetary Comp.  │──► Landsat 8/9, Sentinel-2/3
                                                  │ • INMET (estações)       │──► API do INMET
                                                  │ • OSM (Overpass)         │──► quarteirões e calçadas
                                                  │ • IBGE/Ipea              │──► setores censitários, IVS
                                                  │ • UTCI oficial           │    (pythermalcomfort)
                                                  │ • IVTU + prescrição      │
                                                  └───────────┬──────────────┘
                                                              │ grava
  Next.js (frontend + BFF) ──HTTP──► FastAPI ──SQL──► PostgreSQL 16 + PostGIS 3.4 (db/schema.sql)
                                        ▲
                     MQTT (nós IoT) ────┘   WhatsApp (Evolution API / Z-API) ── webhooks ──┘
```

## Como pluga no que já existe

| Peça    | Hoje (MVP)                                                          | Com o backend                                                                                                            |
| ------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Dados   | `src/server/repositories/mock` (JSON demonstrativo)                 | Implementação `postgis` dos mesmos contratos de `src/server/repositories/types.ts` **ou** BFF que repassa para o FastAPI |
| Seleção | `DATA_SOURCE=mock`                                                  | `DATA_SOURCE=postgis`                                                                                                    |
| Banco   | `db/schema.sql` validado com PGlite nos testes                      | Mesmo esquema, com migrações (Alembic)                                                                                   |
| UTCI    | Modelo simplificado (`src/domain/thermal/utci.ts`)                  | UTCI oficial no worker; o modelo simplificado vira referência de calibração                                              |
| IVTU    | `src/domain/ivtu/ivtu.ts` e `ipe.ivtu_score()` (SQL, mesma fórmula) | View `ipe.v_block_ivtu` como fonte; TypeScript para simulações no cliente                                                |

## Tarefas do pipeline (ordem de implementação)

1. **`ingest_osm(municipality_id)`**: baixa a malha viária via Overpass no `bbox` do município, poligoniza os quarteirões e grava em `ipe.blocks`.
2. **`ingest_landsat_lst(municipality_id, period)`**: composição de verão sem nuvens (LST e NDVI), agregada por quarteirão, gravada em `ipe.lst_observations`.
3. **`ingest_sentinel2(municipality_id)`**: NDVI, uso do solo e super-resolução para copa e impermeabilização; série em `ipe.ndvi_timeseries` (revisita de 5–8 dias).
4. **`ingest_inmet(station)`**: dia de referência em `ipe.weather_reference_days`.
5. **`compute_utci(municipality_id, date)`**: UTCI horário oficial em `ipe.utci_estimates` (`model_version = 'utci-oficial-v1'`).
6. **`compute_prescriptions(municipality_id)`**: regras do motor prescritivo, gravadas em `ipe.interventions` e `ipe.ivtu_scores`.
7. **`ingest_iot`** (MQTT) e **`ingest_whatsapp`** (webhook com anonimização e antispam).

Escalar para outro município = inserir uma linha em `ipe.municipalities` e rodar as tarefas 1–6 para o novo `bbox`.
