-- ─────────────────────────────────────────────────────────────────────────────
-- Ipê · Inteligência Térmica Urbana — esquema PostgreSQL 16 + PostGIS 3.4
--
-- Espelha os contratos de src/server/repositories/types.ts e o domínio de src/domain.
-- Coordenadas em WGS 84 (EPSG:4326). Áreas e distâncias em metros (cast para geography).
-- Validado em CI com PGlite (src/server/db/schema.test.ts).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS ipe;
SET search_path TO ipe, public;

-- ───────────────────────────── Acesso (RF08) ─────────────────────────────

CREATE TABLE roles (
  id          text PRIMARY KEY,
  label       text NOT NULL
);

INSERT INTO roles (id, label) VALUES
  ('admin-municipal', 'Administrador Municipal'),
  ('tecnico', 'Técnico/Analista'),
  ('cliente-corporativo', 'Cliente Corporativo (B2B)'),
  ('leitor-publico', 'Leitor Público');

-- ───────────────────────────── Territórios ─────────────────────────────

CREATE TABLE municipalities (
  id               text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  name             text NOT NULL,
  state            char(2) NOT NULL,
  ibge_code        char(7) NOT NULL UNIQUE CHECK (ibge_code ~ '^\d{7}$'),
  population       integer NOT NULL CHECK (population > 0),
  population_year  smallint NOT NULL,
  center           geometry(Point, 4326) NOT NULL,
  bbox             geometry(Polygon, 4326) NOT NULL,
  default_zoom     numeric(4, 1) NOT NULL CHECK (default_zoom BETWEEN 1 AND 20),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT center_inside_bbox CHECK (ST_Contains(bbox, center))
);
COMMENT ON TABLE municipalities IS
  'Escala territorial orientada a dados: um novo município é uma nova linha (nome + bbox + centro + zoom).';

CREATE TABLE users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL UNIQUE,
  display_name     text NOT NULL,
  role_id          text NOT NULL REFERENCES roles (id),
  municipality_id  text REFERENCES municipalities (id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE users IS 'Usuários internos (servidores e clientes B2B). Cidadãos nunca são cadastrados.';

-- Dia meteorológico de referência por município (estação INMET de referência).
CREATE TABLE weather_reference_days (
  municipality_id  text NOT NULL REFERENCES municipalities (id) ON DELETE CASCADE,
  date             date NOT NULL,
  station_name     text NOT NULL,
  t_min            numeric(4, 1) NOT NULL,
  t_max            numeric(4, 1) NOT NULL CHECK (t_max >= t_min),
  rh_at_min        numeric(4, 3) NOT NULL CHECK (rh_at_min BETWEEN 0.1 AND 1),
  wind_mean        numeric(4, 2) NOT NULL CHECK (wind_mean >= 0),
  solar_peak       numeric(6, 1) NOT NULL CHECK (solar_peak BETWEEN 0 AND 1200),
  PRIMARY KEY (municipality_id, date)
);

-- ───────────────────────────── Quarteirões ─────────────────────────────

CREATE TABLE blocks (
  id                   text PRIMARY KEY,
  municipality_id      text NOT NULL REFERENCES municipalities (id) ON DELETE CASCADE,
  code                 text NOT NULL UNIQUE,
  neighborhood         text NOT NULL,
  street               text NOT NULL,
  zone                 text NOT NULL CHECK (zone IN ('comercial', 'residencial', 'misto', 'industrial', 'verde')),
  geom                 geometry(Polygon, 4326) NOT NULL CHECK (ST_IsValid(geom)),
  centroid             geometry(Point, 4326) NOT NULL,
  area_m2              numeric(12, 1) NOT NULL CHECK (area_m2 > 0),
  perimeter_m          numeric(10, 1) NOT NULL CHECK (perimeter_m > 0),
  -- Superfície (sensoriamento remoto + OSM)
  canopy_cover         numeric(4, 3) NOT NULL CHECK (canopy_cover BETWEEN 0 AND 1),
  street_canopy        numeric(4, 3) NOT NULL CHECK (street_canopy BETWEEN 0 AND 1),
  building_shade       numeric(4, 3) NOT NULL CHECK (building_shade BETWEEN 0 AND 1),
  imperviousness       numeric(4, 3) NOT NULL CHECK (imperviousness BETWEEN 0 AND 1),
  roof_metal_share     numeric(4, 3) NOT NULL CHECK (roof_metal_share BETWEEN 0 AND 1),
  roof_area_m2         numeric(12, 1) NOT NULL CHECK (roof_area_m2 >= 0),
  free_soil_share      numeric(4, 3) NOT NULL CHECK (free_soil_share BETWEEN 0 AND 1),
  sidewalk_width_m     numeric(4, 1) NOT NULL CHECK (sidewalk_width_m BETWEEN 0 AND 15),
  wind_exposure        numeric(3, 2) NOT NULL CHECK (wind_exposure BETWEEN 0.2 AND 1.3),
  -- Drenagem
  distance_to_river_m  numeric(8, 1) NOT NULL CHECK (distance_to_river_m >= 0),
  slope_pct            numeric(4, 1) NOT NULL CHECK (slope_pct BETWEEN 0 AND 60),
  -- Mobilidade e vulnerabilidade social (setores censitários IBGE/Ipea)
  pedestrian_flow      integer NOT NULL CHECK (pedestrian_flow >= 0),
  population           integer NOT NULL CHECK (population >= 0),
  density_per_km2      integer NOT NULL CHECK (density_per_km2 >= 0),
  elderly_share        numeric(4, 3) NOT NULL CHECK (elderly_share BETWEEN 0 AND 1),
  income_per_capita    integer NOT NULL CHECK (income_per_capita >= 0),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blocks_geom_gist ON blocks USING gist (geom);
CREATE INDEX blocks_centroid_gist ON blocks USING gist (centroid);
CREATE INDEX blocks_municipality_neighborhood ON blocks (municipality_id, neighborhood);

-- Composições de temperatura de superfície (Landsat 8/9, passagem ~10h local).
CREATE TABLE lst_observations (
  block_id     text NOT NULL REFERENCES blocks (id) ON DELETE CASCADE,
  period       text NOT NULL,            -- ex.: 'verao-2025-2026' (composição sazonal sem nuvens)
  sensor       text NOT NULL CHECK (sensor IN ('Landsat 8/9', 'Sentinel-3', 'Composição')),
  lst_c        numeric(4, 1) NOT NULL CHECK (lst_c BETWEEN 10 AND 75),
  ndvi         numeric(4, 3) NOT NULL CHECK (ndvi BETWEEN -0.2 AND 1),
  scenes       smallint NOT NULL DEFAULT 1 CHECK (scenes >= 1),
  PRIMARY KEY (block_id, period)
);

-- Série de NDVI (revisita de 5–8 dias), usada no monitoramento das áreas adotadas.
CREATE TABLE ndvi_timeseries (
  block_id     text NOT NULL REFERENCES blocks (id) ON DELETE CASCADE,
  observed_on  date NOT NULL,
  sensor       text NOT NULL CHECK (sensor IN ('Sentinel-2', 'Landsat 8/9')),
  ndvi         numeric(4, 3) NOT NULL CHECK (ndvi BETWEEN -0.2 AND 1),
  cloudy       boolean NOT NULL DEFAULT false,
  PRIMARY KEY (block_id, observed_on, sensor)
);

-- Sensação térmica estimada por hora (saída do modelo; uma linha por quarteirão e hora).
CREATE TABLE utci_estimates (
  block_id          text NOT NULL,
  municipality_id   text NOT NULL,
  reference_date    date NOT NULL,
  hour              smallint NOT NULL CHECK (hour BETWEEN 0 AND 23),
  model_version     text NOT NULL,
  air_temp_c        numeric(4, 1) NOT NULL,
  mean_radiant_c    numeric(4, 1) NOT NULL,
  utci_c            numeric(4, 1) NOT NULL,
  stress_category   text NOT NULL,
  PRIMARY KEY (block_id, reference_date, hour, model_version),
  FOREIGN KEY (block_id) REFERENCES blocks (id) ON DELETE CASCADE,
  FOREIGN KEY (municipality_id, reference_date) REFERENCES weather_reference_days (municipality_id, date)
);

-- ───────────────────────────── IVTU ─────────────────────────────

CREATE TABLE ivtu_configs (
  version             text PRIMARY KEY,
  is_default          boolean NOT NULL DEFAULT false,
  w_thermal           numeric(4, 3) NOT NULL CHECK (w_thermal >= 0),
  w_pedestrian        numeric(4, 3) NOT NULL CHECK (w_pedestrian >= 0),
  w_social            numeric(4, 3) NOT NULL CHECK (w_social >= 0),
  utci_weight         numeric(4, 3) NOT NULL,
  lst_weight          numeric(4, 3) NOT NULL,
  utci_min            numeric(4, 1) NOT NULL,
  utci_max            numeric(4, 1) NOT NULL,
  lst_min             numeric(4, 1) NOT NULL,
  lst_max             numeric(4, 1) NOT NULL,
  max_pedestrian_flow integer NOT NULL CHECK (max_pedestrian_flow > 0),
  income_weight       numeric(4, 3) NOT NULL,
  density_weight      numeric(4, 3) NOT NULL,
  elderly_weight      numeric(4, 3) NOT NULL,
  income_min          numeric(8, 1) NOT NULL,
  income_max          numeric(8, 1) NOT NULL,
  density_min         numeric(8, 1) NOT NULL,
  density_max         numeric(8, 1) NOT NULL,
  elderly_min         numeric(4, 3) NOT NULL,
  elderly_max         numeric(4, 3) NOT NULL,
  threshold_medium    numeric(5, 2) NOT NULL,
  threshold_high      numeric(5, 2) NOT NULL,
  threshold_critical  numeric(5, 2) NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (w_thermal + w_pedestrian + w_social > 0),
  CHECK (threshold_medium < threshold_high AND threshold_high < threshold_critical),
  CHECK (utci_max > utci_min AND lst_max > lst_min AND income_max > income_min
         AND density_max > density_min AND elderly_max > elderly_min)
);
CREATE UNIQUE INDEX ivtu_configs_single_default ON ivtu_configs (is_default) WHERE is_default;

-- Configuração padrão (idêntica a DEFAULT_IVTU_CONFIG em src/domain/ivtu/ivtu.ts).
INSERT INTO ivtu_configs VALUES (
  'padrao-v1', true,
  0.45, 0.25, 0.30,
  0.7, 0.3, 32, 46, 30, 50,
  1500,
  0.40, 0.25, 0.35, 600, 4500, 1000, 15000, 0.05, 0.25,
  50, 64, 72,
  now()
);

-- Normalização min–max com saturação em [0, 1].
CREATE FUNCTION norm01(v numeric, lo numeric, hi numeric) RETURNS numeric
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  RETURN CASE WHEN hi = lo THEN 0 ELSE least(1, greatest(0, (v - lo) / (hi - lo))) END;

-- IVTU (0–100): mesma fórmula de computeIvtu() no domínio TypeScript.
CREATE FUNCTION ivtu_score(
  utci_peak numeric, lst numeric, pedestrian_flow numeric,
  income numeric, density numeric, elderly numeric, c ivtu_configs
) RETURNS numeric
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  RETURN 100 * (
      c.w_thermal * (
        (c.utci_weight * norm01(utci_peak, c.utci_min, c.utci_max)
         + c.lst_weight * norm01(lst, c.lst_min, c.lst_max))
        / nullif(c.utci_weight + c.lst_weight, 0))
    + c.w_pedestrian * least(1, greatest(0, ln(1 + greatest(pedestrian_flow, 0)) / ln(1 + c.max_pedestrian_flow)))
    + c.w_social * (
        (c.income_weight * (1 - norm01(income, c.income_min, c.income_max))
         + c.density_weight * norm01(density, c.density_min, c.density_max)
         + c.elderly_weight * norm01(elderly, c.elderly_min, c.elderly_max))
        / nullif(c.income_weight + c.density_weight + c.elderly_weight, 0))
  ) / (c.w_thermal + c.w_pedestrian + c.w_social);

CREATE FUNCTION ivtu_level(score numeric, c ivtu_configs) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  RETURN CASE
    WHEN score >= c.threshold_critical THEN 'critico'
    WHEN score >= c.threshold_high THEN 'alto'
    WHEN score >= c.threshold_medium THEN 'medio'
    ELSE 'baixo'
  END;

-- IVTU por quarteirão com a configuração padrão e o UTCI de pico (11h–15h) mais recente.
CREATE VIEW v_block_ivtu AS
WITH cfg AS (
  SELECT c FROM ivtu_configs c WHERE c.is_default
),
latest_day AS (
  SELECT municipality_id, max(date) AS date FROM weather_reference_days GROUP BY municipality_id
),
peak AS (
  SELECT u.block_id, max(u.utci_c) AS utci_peak
  FROM utci_estimates u
  JOIN latest_day d ON d.municipality_id = u.municipality_id AND d.date = u.reference_date
  WHERE u.hour BETWEEN 11 AND 15
  GROUP BY u.block_id
),
latest_lst AS (
  SELECT DISTINCT ON (block_id) block_id, lst_c FROM lst_observations ORDER BY block_id, period DESC
),
scored AS (
  SELECT
    b.id AS block_id, b.municipality_id, b.code, b.neighborhood, b.street, b.zone, b.geom,
    p.utci_peak, l.lst_c,
    ivtu_score(p.utci_peak, l.lst_c, b.pedestrian_flow, b.income_per_capita,
               b.density_per_km2, b.elderly_share, (SELECT c FROM cfg)) AS ivtu
  FROM blocks b
  JOIN peak p ON p.block_id = b.id
  JOIN latest_lst l ON l.block_id = b.id
)
SELECT s.*, ivtu_level(s.ivtu, (SELECT c FROM cfg)) AS ivtu_level
FROM scored s;
COMMENT ON VIEW v_block_ivtu IS
  'Índice de Vulnerabilidade Térmica Urbana com a configuração padrão. Pré-diagnóstico automatizado.';

-- Histórico de índices calculados (auditoria das priorizações publicadas).
CREATE TABLE ivtu_scores (
  block_id        text NOT NULL REFERENCES blocks (id) ON DELETE CASCADE,
  config_version  text NOT NULL REFERENCES ivtu_configs (version),
  computed_at     timestamptz NOT NULL DEFAULT now(),
  score           numeric(5, 2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  level           text NOT NULL CHECK (level IN ('baixo', 'medio', 'alto', 'critico')),
  thermal         numeric(4, 3) NOT NULL,
  pedestrian      numeric(4, 3) NOT NULL,
  social          numeric(4, 3) NOT NULL,
  PRIMARY KEY (block_id, config_version, computed_at)
);

-- ───────────────────────────── Prescrição e simulação ─────────────────────────────

CREATE TABLE interventions (
  id                 text PRIMARY KEY,
  block_id           text NOT NULL REFERENCES blocks (id) ON DELETE CASCADE,
  type               text NOT NULL CHECK (type IN ('arborizacao', 'pavimento-permeavel', 'telhado-frio')),
  variant            text NOT NULL,
  level              text NOT NULL CHECK (level IN ('tatico', 'estruturante')),
  title              text NOT NULL,
  priority           numeric(5, 1) NOT NULL CHECK (priority BETWEEN 0 AND 100),
  confidence         numeric(3, 2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  rationale          text[] NOT NULL,
  actions            text[] NOT NULL,
  potential_sites    text[] NOT NULL DEFAULT '{}',
  suggested_species  text[] NOT NULL DEFAULT '{}',
  status             text NOT NULL DEFAULT 'recomendada'
                     CHECK (status IN ('recomendada', 'validada-campo', 'aprovada', 'em-execucao', 'concluida', 'descartada')),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX interventions_block ON interventions (block_id);

CREATE TABLE field_checklists (
  block_id    text PRIMARY KEY REFERENCES blocks (id) ON DELETE CASCADE,
  items       jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(items) = 'object'),
  notes       text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES users (id)
);

CREATE TABLE simulations (
  id               text PRIMARY KEY,
  municipality_id  text NOT NULL REFERENCES municipalities (id),
  block_id         text NOT NULL REFERENCES blocks (id),
  name             text NOT NULL CHECK (length(name) BETWEEN 3 AND 80),
  scenario         jsonb NOT NULL,
  summary          jsonb NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES users (id)
);
CREATE INDEX simulations_municipality ON simulations (municipality_id, created_at DESC);

CREATE TABLE reports (
  id                text PRIMARY KEY,
  municipality_id   text NOT NULL REFERENCES municipalities (id),
  program_id        text NOT NULL CHECK (program_id IN ('fundo-clima', 'ambiente-resiliente-rj', 'fecam', 'esg-corporativo')),
  project_name      text NOT NULL,
  department        text NOT NULL,
  estimated_budget  numeric(14, 2) NOT NULL CHECK (estimated_budget > 0),
  neighborhoods     text[] NOT NULL,
  scenario_ids      text[] NOT NULL DEFAULT '{}',
  document          jsonb NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES users (id)
);

-- ───────────────────────────── Ciência cidadã (LGPD) ─────────────────────────────

CREATE TABLE citizen_reports (
  id               text PRIMARY KEY,
  municipality_id  text NOT NULL REFERENCES municipalities (id),
  block_id         text REFERENCES blocks (id) ON DELETE SET NULL,
  geom             geometry(Point, 4326) NOT NULL,
  category         text NOT NULL CHECK (category IN (
                     'ponto-onibus-sem-sombra', 'asfalto-derretendo', 'calcada-sem-arvores',
                     'praca-sem-sombra', 'calor-equipamento-publico', 'alagamento', 'arvore-precisa-cuidado')),
  text             varchar(500) NOT NULL,
  created_at       timestamptz NOT NULL,
  anon_id          text NOT NULL CHECK (anon_id ~ '^anon-[0-9a-f]{6}$'),
  channel          text NOT NULL CHECK (channel IN ('whatsapp', 'web')),
  spam_score       numeric(3, 2) NOT NULL CHECK (spam_score BETWEEN 0 AND 1),
  status           text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'validado', 'descartado', 'spam')),
  has_photo        boolean NOT NULL DEFAULT false
);
COMMENT ON TABLE citizen_reports IS
  'LGPD: apenas texto, coordenadas e categoria. O remetente é um identificador anônimo irreversível; telefone e nome nunca são armazenados.';
CREATE INDEX citizen_reports_geom_gist ON citizen_reports USING gist (geom);
CREATE INDEX citizen_reports_feed ON citizen_reports (municipality_id, status, created_at DESC);

-- ───────────────────────────── Sensores IoT ─────────────────────────────

CREATE TABLE iot_nodes (
  id               text PRIMARY KEY,
  code             text NOT NULL UNIQUE,
  municipality_id  text NOT NULL REFERENCES municipalities (id),
  block_id         text NOT NULL REFERENCES blocks (id),
  label            text NOT NULL,
  geom             geometry(Point, 4326) NOT NULL,
  hardware         text NOT NULL,
  connectivity     text NOT NULL CHECK (connectivity IN ('wifi', '4g')),
  installed_at     timestamptz NOT NULL
);

CREATE TABLE iot_readings (
  node_id        text NOT NULL REFERENCES iot_nodes (id) ON DELETE CASCADE,
  ts             timestamptz NOT NULL,
  temperature_c  numeric(4, 2) NOT NULL CHECK (temperature_c BETWEEN -10 AND 60),
  humidity       numeric(4, 3) NOT NULL CHECK (humidity BETWEEN 0 AND 1),
  battery_pct    numeric(4, 1) NOT NULL CHECK (battery_pct BETWEEN 0 AND 100),
  signal_dbm     smallint NOT NULL CHECK (signal_dbm BETWEEN -120 AND 0),
  PRIMARY KEY (node_id, ts)
);

-- Última leitura por nó (status operacional derivado na aplicação).
CREATE VIEW v_iot_latest AS
SELECT DISTINCT ON (r.node_id) r.*
FROM iot_readings r
ORDER BY r.node_id, r.ts DESC;

-- ───────────────────────────── Alertas ─────────────────────────────

CREATE TABLE heat_alerts (
  id                text PRIMARY KEY,
  municipality_ids  text[] NOT NULL CHECK (cardinality(municipality_ids) > 0),
  level             text NOT NULL CHECK (level IN ('atencao', 'alerta', 'emergencia')),
  title             text NOT NULL,
  message           text NOT NULL,
  max_temp_c        numeric(4, 1) NOT NULL,
  starts_at         timestamptz NOT NULL,
  ends_at           timestamptz NOT NULL CHECK (ends_at > starts_at),
  source            text NOT NULL
);

-- ───────────────────────────── Adote uma Ilha Verde ─────────────────────────────

CREATE TABLE adoptions (
  id               text PRIMARY KEY,
  municipality_id  text NOT NULL REFERENCES municipalities (id),
  block_id         text NOT NULL REFERENCES blocks (id),
  area_name        text NOT NULL,
  partner_name     text NOT NULL,
  partner_type     text NOT NULL CHECK (partner_type IN ('industria', 'comercio', 'construtora', 'shopping', 'logistica', 'servicos')),
  status           text NOT NULL CHECK (status IN ('ativa', 'em-implantacao')),
  adopted_at       date NOT NULL,
  commitments      jsonb NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE maintenance_tasks (
  id           text PRIMARY KEY,
  adoption_id  text NOT NULL REFERENCES adoptions (id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('irrigacao', 'poda', 'adubacao', 'reposicao-muda', 'vistoria-pavimento', 'limpeza-jardim-chuva')),
  due_date     date NOT NULL,
  status       text NOT NULL CHECK (status IN ('concluida', 'pendente', 'atrasada')),
  predicted    boolean NOT NULL DEFAULT false,
  reason       text NOT NULL
);
CREATE INDEX maintenance_tasks_schedule ON maintenance_tasks (adoption_id, due_date);
