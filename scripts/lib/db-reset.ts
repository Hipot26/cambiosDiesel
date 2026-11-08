import type pg from 'pg';

const RESETTABLE_ENVS = ['development', 'test'];
const RESETTABLE_DATABASES = ['dju_dev', 'dju_test'];

// Solo local: el reinicio borra todo. Se niega en staging, en producción y sin APP_ENV.
export function assertResettableEnv(appEnv: string | undefined): void {
  if (!appEnv || !RESETTABLE_ENVS.includes(appEnv)) {
    throw new Error('db-reset solo corre con APP_ENV=development o APP_ENV=test');
  }
}

// Segunda llave: aunque APP_ENV diga development, la URL puede apuntar a otra base.
export function assertResettableDatabase(database: string): void {
  if (!RESETTABLE_DATABASES.includes(database)) {
    throw new Error(`db-reset solo corre sobre ${RESETTABLE_DATABASES.join(' o ')}`);
  }
}

// Borra lo que crearon las migraciones, como rol de migración. No toca lo que instaló el
// superusuario (PostGIS, los esquemas public y drizzle, los permisos de roles.sql).
// Los nombres salen del catálogo y van con %I; nada viene de la entrada (SEC-62).
const RESET_SQL = `
DROP SCHEMA IF EXISTS pgboss CASCADE;
DROP TABLE IF EXISTS drizzle.__drizzle_migrations;
DO $$
DECLARE
  stmt text;
BEGIN
  FOR stmt IN
    SELECT format(
      'DROP %s IF EXISTS %I.%I CASCADE',
      CASE c.relkind WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW'
        WHEN 'S' THEN 'SEQUENCE' WHEN 'f' THEN 'FOREIGN TABLE' ELSE 'TABLE' END,
      n.nspname, c.relname)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
      AND c.relowner = current_user::regrole
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
  LOOP
    EXECUTE stmt;
  END LOOP;

  FOR stmt IN
    SELECT format('DROP TYPE IF EXISTS %I.%I CASCADE', n.nspname, t.typname)
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype IN ('e', 'd', 'r', 'm')
      AND t.typowner = current_user::regrole
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e')
  LOOP
    EXECUTE stmt;
  END LOOP;

  FOR stmt IN
    SELECT format('DROP ROUTINE IF EXISTS %s CASCADE', p.oid::regprocedure)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proowner = current_user::regrole
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE stmt;
  END LOOP;
END
$$;
`;

export async function dropMigratedObjects(client: pg.ClientBase): Promise<void> {
  await client.query(RESET_SQL);
}
