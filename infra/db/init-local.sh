#!/bin/sh
# Solo local: lo corre la imagen de PostgreSQL la primera vez, con el volumen vacío.
# Crea dju_dev y dju_test (dos entornos simulados, SEC-69) y pone contraseñas de desarrollo.
# Para repetirlo: docker compose down -v && docker compose up -d
set -eu

for env in dev test; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
    -v env="$env" -v db="dju_$env" -f /dju/roles.sql
done

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'
ALTER ROLE dju_dev_app PASSWORD 'dev_local_only_app';
ALTER ROLE dju_dev_migrate PASSWORD 'dev_local_only_migrate';
ALTER ROLE dju_test_app PASSWORD 'test_local_only_app';
ALTER ROLE dju_test_migrate PASSWORD 'test_local_only_migrate';
SQL
