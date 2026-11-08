-- Roles y permisos de una base por entorno (SEC-67, SEC-68, SEC-69).
-- Lo corre un superusuario, una vez por entorno, y se puede repetir sin daño:
--   psql -v ON_ERROR_STOP=1 -v env=prod -v db=dju_production -f infra/db/roles.sql
-- env: dev, test, staging o prod. db: dju_dev, dju_test, dju_staging o dju_production.
-- No pone contraseñas. En el servidor se ponen después con \password dju_<env>_app y
-- \password dju_<env>_migrate (psql manda el hash, así que no queda en el historial ni en logs).
-- En local las pone infra/db/init-local.sh.

\set ON_ERROR_STOP on
\set app_role 'dju_' :env '_app'
\set migrate_role 'dju_' :env '_migrate'

-- 1. Roles sin poderes especiales. El de migración es dueño de los esquemas (SEC-68);
--    el de app solo lee y escribe filas (SEC-67).
SELECT format('CREATE ROLE %I LOGIN', :'migrate_role')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'migrate_role') \gexec
SELECT format('CREATE ROLE %I LOGIN', :'app_role')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_role') \gexec
ALTER ROLE :"migrate_role" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE :"app_role" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- 2. La base. Su dueño es el superusuario, no el rol de migración.
SELECT format('CREATE DATABASE %I', :'db')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db') \gexec

-- SEC-69: sin CONNECT para PUBLIC, los roles de otro entorno no entran a esta base.
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO :"app_role", :"migrate_role";
-- CREATE para los esquemas drizzle y pgboss; TEMPORARY para la carga de ZIP (03 §8.3).
GRANT CREATE, TEMPORARY ON DATABASE :"db" TO :"migrate_role";

\connect :db

-- 3. PostGIS no es una extensión "trusted": solo un superusuario la instala.
--    La migración 0000 repite CREATE EXTENSION IF NOT EXISTS y no hace nada si ya está.
CREATE EXTENSION IF NOT EXISTS postgis;

-- 4. public: dueño el rol de migración; nadie más crea objetos (SEC-67).
ALTER SCHEMA public OWNER TO :"migrate_role";
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO :"app_role";

-- 5. El diario de migraciones de Drizzle vive en su propio esquema, creado antes de los
--    privilegios por defecto para que el rol de app no reciba USAGE sobre él.
CREATE SCHEMA IF NOT EXISTS drizzle AUTHORIZATION :"migrate_role";

-- 6. Privilegios por defecto: todo esquema, tabla o secuencia que cree el rol de migración
--    (las tablas de T-04, el esquema pgboss) queda disponible para la app sin repetir GRANT.
--    Sin TRUNCATE, REFERENCES, TRIGGER ni CREATE.
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrate_role"
  GRANT USAGE ON SCHEMAS TO :"app_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrate_role"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrate_role"
  GRANT USAGE, SELECT ON SEQUENCES TO :"app_role";
