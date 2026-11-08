-- Migración cero (03 §8.1). Corre con el rol de migración (SEC-68).
-- PostGIS no es una extensión "trusted": la instala infra/db/roles.sql como superusuario.
-- Aquí IF NOT EXISTS no hace nada si ya está; si falta, falla con "permission denied to
-- create extension" y avisa que roles.sql no se aplicó en esta base.
-- uuidv7() es nativa en PostgreSQL 18: no hace falta pgcrypto ni uuid-ossp.
CREATE EXTENSION IF NOT EXISTS postgis;
