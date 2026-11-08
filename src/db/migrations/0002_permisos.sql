-- Permisos por tabla y por columna para el rol de app (SEC-67, SEC-39, SEC-40; 03 §8.1).
-- Los privilegios por defecto de infra/db/roles.sql dan SELECT, INSERT, UPDATE y DELETE sobre
-- toda tabla nueva. Aquí se quita lo que 03 marca como solo inserción. El nombre del rol de app
-- se deriva del rol de migración que ejecuta la migración (dju_<env>_migrate → dju_<env>_app),
-- así el mismo SQL sirve en dev, test, staging y producción. Si no la ejecuta un rol de
-- migración, falla y no aplica nada.
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
  -- Solo inserción: la historia nunca se corrige ni se borra a mano; las filas caen por la
  -- cascada al borrar el candidato (las acciones de integridad corren como dueño de la tabla).
  EXECUTE format(
    'REVOKE UPDATE, DELETE ON consent_events, visibility_events, screens, staff_audit_log, level_overrides FROM %I',
    app_role
  );
  -- SEC-39: un screen posterior que discrepa llena superseded_by_screen_id y nada más.
  EXECUTE format('GRANT UPDATE (superseded_by_screen_id) ON level_overrides TO %I', app_role);
END
$$;
