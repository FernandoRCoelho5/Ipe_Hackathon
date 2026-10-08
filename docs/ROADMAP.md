# Roadmap

## Entrega do MVP (hackathon)

| Fase              | Escopo                                                                                               | Status       |
| ----------------- | ---------------------------------------------------------------------------------------------------- | ------------ |
| 1 · Fundação      | Tokens da marca, Poppins, logotipo, app shell, tema claro/escuro, i18n, CI, docs iniciais            | ✅ Concluída |
| 2 · Domínio       | Zod, UTCI, IVTU, motor prescritivo, simulador, ESG (testados); seed demonstrativo; repositórios mock | ✅ Concluída |
| 3 · API           | `/api/v1/*`, `docs/openapi.yaml`, `db/schema.sql` (PostGIS), `docker-compose.yml`                    | ✅ Concluída |
| 4 · Telas 1–3     | Mapa de calor (MapLibre), Prescrição/IVTU, Simulador what-if                                         | ✅ Concluída |
| 5 · Telas 4–6     | Relatórios (PDF/DOCX), Ciência cidadã e IoT, Adote uma Ilha Verde                                    | ✅ Concluída |
| 6 · Venda         | Landing/pitch, perfis de acesso (RF08), Modo Apresentação (`?demo=1`)                                | ✅ Concluída |
| 7 · Endurecimento | Acessibilidade (axe), Lighthouse ≥ 90, e2e Playwright, revisão visual completa                       | ⏳ Próxima   |

## Do MVP ao piloto real

1. **Pipeline de dados:** Google Earth Engine / Planetary Computer (Landsat 8/9 e Sentinel-2: LST, NDVI, NDWI), estações INMET (Volta Redonda, Resende, Valença), OpenStreetMap e IVS (IBGE/Ipea).
2. **Backend:** FastAPI + Celery implementando `docs/openapi.yaml` sobre PostgreSQL 16 + PostGIS 3.4 (`db/schema.sql`); `DATA_SOURCE=postgis`.
3. **Calibração:** 10 nós IoT (ESP32 + SHT31) via MQTT; comparação satélite × sensor × modelo UTCI.
4. **Ciência cidadã:** chatbot de WhatsApp (Evolution API / Z-API) com anonimização e filtro antispam.
5. **Autenticação:** troca da sessão de demonstração por OIDC (gov.br ou IdP do cliente), mantendo a matriz de permissões.
