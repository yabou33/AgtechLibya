-- =====================================================================
--  AgriTech Libya — Educational Platform · SQLite schema
--  EU4Skills / Skills4EU · Smart Agriculture & Water Management
--  Versionnable sur GitHub. Créer la base :  sqlite3 agritech.db < schema.sql
-- =====================================================================
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
--  RÔLES & UTILISATEURS  (gestion des profils)
--  4 profils : admin · professeur · etudiant · agriculteur
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  code        TEXT PRIMARY KEY,           -- admin | professeur | etudiant | agriculteur
  label_fr    TEXT NOT NULL,
  label_ar    TEXT NOT NULL,
  label_en    TEXT NOT NULL,
  rank        INTEGER NOT NULL            -- 100=admin, 60=prof, 30=etudiant, 20=agriculteur
);
INSERT INTO roles (code, label_fr, label_ar, label_en, rank) VALUES
  ('admin',       'Administrateur', 'مدير النظام',  'Administrator', 100),
  ('professeur',  'Professeur',     'أستاذ',        'Teacher',        60),
  ('etudiant',    'Étudiant',       'طالب',         'Student',        30),
  ('agriculteur', 'Agriculteur',    'مزارع',        'Farmer',         20);

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,            -- password_hash() PHP (bcrypt)
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL REFERENCES roles(code),
  lang          TEXT NOT NULL DEFAULT 'fr' CHECK (lang IN ('fr','ar','en')),
  organisation  TEXT,                     -- université / exploitation
  phone         TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  created_by    INTEGER REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login    TEXT
);
CREATE INDEX idx_users_role ON users(role);

-- Identifiants API par utilisateur (profil)
--  Sentinel Hub (clientId/secret) + fournisseur météo.
--  En mode serveur : secret jamais renvoyé au client, utilisé par api/sh_token.php.
--  En mode local   : stocké dans localStorage (avertissement affiché).
CREATE TABLE user_credentials (
  user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sh_client_id      TEXT,
  sh_client_secret  TEXT,                 -- à chiffrer au repos en production
  sh_instance_id    TEXT,                 -- optionnel (configuration Sentinel Hub)
  weather_provider  TEXT DEFAULT 'open-meteo', -- open-meteo | openweather | agromonitoring | tomorrow
  weather_api_key   TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Classes / groupes (prof → étudiants)
CREATE TABLE classes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  teacher_id  INTEGER NOT NULL REFERENCES users(id),
  year        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE enrollments (
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  PRIMARY KEY (class_id, student_id)
);

-- ---------------------------------------------------------------------
--  MODULES PÉDAGOGIQUES  (M1..M9 du programme EU4Skills)
-- ---------------------------------------------------------------------
CREATE TABLE modules (
  code        TEXT PRIMARY KEY,           -- M1..M9
  title_fr    TEXT NOT NULL, title_ar TEXT NOT NULL, title_en TEXT NOT NULL,
  app_url     TEXT,                       -- app HTML rattachée dans /public/apps
  icon        TEXT,
  ord         INTEGER NOT NULL
);
INSERT INTO modules (code,title_fr,title_ar,title_en,app_url,icon,ord) VALUES
 ('M1','Introduction à l''Agriculture Intelligente','مقدمة في الزراعة الذكية','Introduction to Smart Agriculture','apps/m1-intro.html','🌱',1),
 ('M2','Télédétection & Observation de la Terre','الاستشعار عن بُعد','Remote Sensing & Earth Observation','apps/m2-agrimap.html','🛰️',2),
 ('M3','IoT — Capteurs de sol & Réseaux','إنترنت الأشياء وأجهزة استشعار التربة','IoT — Soil Sensors & Networks','apps/m3-iot.html','📡',3),
 ('M4','Stations météo, ET₀ & Bilan hydrique','المحطات الجوية والميزان المائي','Weather Stations, ET0 & Water Balance','apps/m4-meteo.html','🌦️',4),
 ('M5','Irrigation intelligente & Pilotage','الري الذكي','Smart Irrigation & Control','apps/m5-irrigation.html','💧',5),
 ('M6','FMIS — Gestion de l''exploitation','نظام إدارة المزرعة','FMIS — Farm Management','apps/m6-fmis.html','🗂️',6),
 ('M7','Intelligence Artificielle en agriculture','الذكاء الاصطناعي في الزراعة','AI for Agriculture','apps/m7-ai.html','🤖',7),
 ('M8','Analyse des écarts','تحليل الفجوات','Gap Analysis','apps/m8-gap.html','📊',8),
 ('M9','Plan d''action curriculaire','خطة عمل المنهج','Curriculum Action Plan','apps/m9-plan.html','🎯',9);

-- Passerelle Géologie × Agronomie (transversale)
INSERT INTO modules (code,title_fr,title_ar,title_en,app_url,icon,ord) VALUES
 ('G0','Passerelle Géologie × Hydrogéologie','جسر الجيولوجيا','Geology × Hydrogeology Bridge','apps/geology.html','🌍',10);

-- ---------------------------------------------------------------------
--  EXPLOITATIONS · PROJETS · PARCELLES · ÉQUIPEMENTS
--  Un « projet » = format export 'agrimanager-irrigation' (moteur carto partagé)
-- ---------------------------------------------------------------------
CREATE TABLE farms (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id    INTEGER NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  region      TEXT,
  country     TEXT DEFAULT 'Libye',
  center_lat  REAL, center_lng REAL, zoom INTEGER DEFAULT 13,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id    INTEGER NOT NULL REFERENCES users(id),
  farm_id     INTEGER REFERENCES farms(id) ON DELETE SET NULL,
  module_code TEXT REFERENCES modules(code),
  name        TEXT NOT NULL,
  format      TEXT NOT NULL DEFAULT 'agrimanager-irrigation',
  version     INTEGER NOT NULL DEFAULT 1,
  center_lat  REAL, center_lng REAL, zoom INTEGER,
  data_json   TEXT,                       -- payload complet (parcels+equipment+planning)
  is_template INTEGER NOT NULL DEFAULT 0, -- projet démo prof
  visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','class','public')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_projects_owner ON projects(owner_id);

CREATE TABLE parcels (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  farm_id     INTEGER REFERENCES farms(id)    ON DELETE CASCADE,
  name        TEXT NOT NULL,
  crop        TEXT,                        -- olivier, tomate, blé, palmier...
  soil        TEXT,                        -- sableux, argileux...
  shape       TEXT NOT NULL DEFAULT 'polygon' CHECK (shape IN ('polygon','pivot','rectangle')),
  area_ha     REAL,
  geometry    TEXT NOT NULL,               -- GeoJSON Geometry (Polygon), CRS84 lon,lat
  props_json  TEXT,                        -- Kc, seuils, équipements liés...
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_parcels_project ON parcels(project_id);

CREATE TABLE equipment (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  parcel_id   INTEGER REFERENCES parcels(id)  ON DELETE SET NULL,
  type        TEXT NOT NULL,               -- probe, valve, weather, pump, borehole, marker...
  lat         REAL NOT NULL, lng REAL NOT NULL,
  props_json  TEXT
);

-- ---------------------------------------------------------------------
--  DONNÉES CAPTEURS SOL (M3)  — format import : soil-sensor JSON
-- ---------------------------------------------------------------------
CREATE TABLE sensor_sites (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ext_site_id TEXT,                        -- site_id source
  name        TEXT NOT NULL,
  lat         REAL, lng REAL,
  owner_id    INTEGER REFERENCES users(id)
);
CREATE TABLE sensor_readings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id     INTEGER REFERENCES sensor_sites(id) ON DELETE CASCADE,
  probe_id    TEXT,
  measure     TEXT NOT NULL,               -- 'Soil Moisture 30cm', 'Soil Salinity 20cm'...
  depth_cm    INTEGER,
  value       REAL NOT NULL,
  unit        TEXT,                        -- %VWC, µS/cm, ºC
  ts          TEXT NOT NULL                -- ISO local_time
);
CREATE INDEX idx_readings_site_ts ON sensor_readings(site_id, ts);

-- ---------------------------------------------------------------------
--  STATIONS MÉTÉO (M4)  — format import : CSV logger (A1-WS1, A1-T1...)
-- ---------------------------------------------------------------------
CREATE TABLE weather_stations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  lat         REAL, lng REAL,
  owner_id    INTEGER REFERENCES users(id)
);
CREATE TABLE weather_readings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id  INTEGER REFERENCES weather_stations(id) ON DELETE CASCADE,
  ts          TEXT NOT NULL,
  wind_speed  REAL, wind_gust REAL, wind_dir REAL,
  humidity    REAL, temp REAL, rain REAL, pressure REAL, volt REAL,
  raw_json    TEXT
);
CREATE INDEX idx_wx_station_ts ON weather_readings(station_id, ts);

-- Séries d'indices satellitaires (M2) — export/import NDVI & co
CREATE TABLE index_series (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  parcel_id   INTEGER REFERENCES parcels(id) ON DELETE CASCADE,
  index_name  TEXT NOT NULL,               -- NDVI, NDRE, NDMI...
  obs_date    TEXT NOT NULL,
  mean REAL, min REAL, max REAL, std REAL,
  p10 REAL, p50 REAL, p90 REAL,
  cloud_pct   REAL, source TEXT DEFAULT 'sentinel-2-l2a'
);
CREATE INDEX idx_series_parcel ON index_series(parcel_id, index_name, obs_date);

-- ---------------------------------------------------------------------
--  PÉDAGOGIE : TP (travaux pratiques), rendus, notes
-- ---------------------------------------------------------------------
CREATE TABLE assignments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  module_code TEXT REFERENCES modules(code),
  teacher_id  INTEGER NOT NULL REFERENCES users(id),
  class_id    INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  brief       TEXT,
  template_project_id INTEGER REFERENCES projects(id),
  due_at      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    INTEGER REFERENCES projects(id),
  data_json     TEXT,
  grade         REAL,
  feedback      TEXT,
  submitted_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Journal d'audit (traçabilité admin)
CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id),
  action      TEXT NOT NULL,
  entity      TEXT, entity_id INTEGER,
  ts          TEXT NOT NULL DEFAULT (datetime('now')),
  meta_json   TEXT
);

-- ---------------------------------------------------------------------
--  SEED — compte admin par défaut (mot de passe à régénérer !)
--  hash bcrypt de 'ChangeMe!2026' — REMPLACER en production
-- ---------------------------------------------------------------------
INSERT INTO users (email, password_hash, full_name, role, lang, organisation) VALUES
 ('admin@agritech.ly', '$2y$10$w0Xq6f0Zr8m3sP1uQ2vJ9eT5nH7kL4cB6dR8fA0gC2iE4kM6oP8u',
  'Administrateur', 'admin', 'fr', 'EU4Skills');
