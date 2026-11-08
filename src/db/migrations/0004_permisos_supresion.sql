-- Permisos de las listas de supresión y de las lápidas para el rol de app (SEC-10, SEC-12,
-- SEC-67; 03 §1.4 y §8.1). Creada con drizzle-kit generate --custom, como 0002_permisos.
-- Estas tres tablas son lo único que sobrevive al borrado del candidato: la lápida impide
-- revivirlo con un webhook (SEC-10) y la supresión impide escribirle a un número o a un correo
-- dado de baja (SEC-12, SEC-57). Borrar una fila la saca de la lista, y cambiar su huella con un
-- UPDATE también, así que el rol de app pierde DELETE y UPDATE. 03 solo describe inserciones
-- (§3.4, §3.5, §5.7), salvo el ON CONFLICT DO UPDATE last_seen_at de phone_suppression (§3.4),
-- que queda como el único UPDATE, por columna.
-- Mismo método que 0002: el rol de app se deriva del rol de migración que ejecuta la migración
-- (dju_<env>_migrate → dju_<env>_app) y, si no la ejecuta un rol de migración, falla sin aplicar
-- nada.
DO $$
DECLARE
  app_role text;
BEGIN
  IF current_user !~ '_migrate$' THEN
    RAISE EXCEPTION 'la migración de permisos tiene que correr con el rol de migración (dju_<env>_migrate), no con %', current_user;
  END IF;
  app_role := regexp_replace(current_user, '_migrate$', '_app');
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    RAISE EXCEPTION 'no existe el rol de app % (aplicar infra/db/roles.sql)', app_role;
  END IF;
  EXECUTE format(
    'REVOKE UPDATE, DELETE ON phone_suppression, email_suppression, tombstones FROM %I',
    app_role
  );
  -- 03 §3.4: INSERT … ON CONFLICT DO UPDATE last_seen_at, y nada más.
  EXECUTE format('GRANT UPDATE (last_seen_at) ON phone_suppression TO %I', app_role);
END
$$;
