import { randomBytes } from 'node:crypto';
import { PgBoss } from 'pg-boss';
import { describe, expect, it } from 'vitest';
import { assertMigrateRole, PGBOSS_SCHEMA } from '../../scripts/lib/migrations.js';
import { testAppUrl, testMigrateUrl, withClient, withDatabase } from '../helpers/db.js';

// insufficient_privilege: lo que PostgreSQL responde a "permission denied" y "must be owner".
const DENIED = { code: '42501' };

// Los dos entornos locales que simulan staging y producción (SEC-69).
const OTHER_DATABASE = 'dju_dev';
const OTHER_ROLES = ['dju_dev_app', 'dju_dev_migrate'];

const uniqueName = (prefix: string) => `${prefix}_${randomBytes(4).toString('hex')}`;

describe('roles de base de datos', () => {
  it('SEC-67 rol de app sin CREATE', async () => {
    await withClient(testAppUrl(), async (app) => {
      await expect(app.query('CREATE TABLE x()')).rejects.toMatchObject({
        ...DENIED,
        message: expect.stringMatching(/permission denied/),
      });
      await expect(app.query(`CREATE SCHEMA ${uniqueName('s')}`)).rejects.toMatchObject(DENIED);
      await expect(app.query(`CREATE TABLE ${PGBOSS_SCHEMA}.x()`)).rejects.toMatchObject(DENIED);

      const { rows } = await app.query(
        `select
           has_database_privilege(current_user, current_database(), 'CREATE') as db_create,
           has_database_privilege(current_user, current_database(), 'TEMPORARY') as db_temp,
           has_schema_privilege(current_user, 'public', 'CREATE') as public_create,
           has_schema_privilege(current_user, $1, 'CREATE') as pgboss_create,
           has_schema_privilege(current_user, 'public', 'USAGE') as public_usage,
           has_schema_privilege(current_user, $1, 'USAGE') as pgboss_usage,
           r.rolsuper, r.rolbypassrls, r.rolcreatedb, r.rolcreaterole, r.rolreplication
         from pg_roles r where r.rolname = current_user`,
        [PGBOSS_SCHEMA],
      );
      expect(rows[0]).toEqual({
        db_create: false,
        db_temp: false,
        public_create: false,
        pgboss_create: false,
        public_usage: true,
        pgboss_usage: true,
        rolsuper: false,
        rolbypassrls: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolreplication: false,
      });
    });
  });

  it('SEC-67 una tabla creada por el rol de migración la puede usar el rol de app, sin DDL', async () => {
    const table = uniqueName('t02_privilegios');
    await withClient(testMigrateUrl(), async (migrate) => {
      const name = `public.${migrate.escapeIdentifier(table)}`;
      // Sin GRANT: los permisos llegan por ALTER DEFAULT PRIVILEGES de infra/db/roles.sql.
      await migrate.query(
        `CREATE TABLE ${name} (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, nota text)`,
      );
      try {
        await withClient(testAppUrl(), async (app) => {
          await app.query(`INSERT INTO ${name} (nota) VALUES ('uno'), ('dos')`);
          await app.query(`UPDATE ${name} SET nota = 'tres' WHERE nota = 'dos'`);
          await app.query(`DELETE FROM ${name} WHERE nota = 'uno'`);
          const { rows } = await app.query(`SELECT nota FROM ${name}`);
          expect(rows).toEqual([{ nota: 'tres' }]);

          await expect(app.query(`ALTER TABLE ${name} ADD COLUMN x int`)).rejects.toMatchObject(
            DENIED,
          );
          await expect(app.query(`TRUNCATE ${name}`)).rejects.toMatchObject(DENIED);
          await expect(app.query(`DROP TABLE ${name}`)).rejects.toMatchObject(DENIED);
        });
      } finally {
        await migrate.query(`DROP TABLE IF EXISTS ${name}`);
      }
    });
  });

  it('SEC-67 el rol de app no lee ni escribe el diario de migraciones', async () => {
    await withClient(testAppUrl(), async (app) => {
      await expect(app.query('SELECT * FROM drizzle.__drizzle_migrations')).rejects.toMatchObject(
        DENIED,
      );
      await expect(app.query('DELETE FROM drizzle.__drizzle_migrations')).rejects.toMatchObject(
        DENIED,
      );
    });
  });

  it('SEC-69 rol de test sin CONNECT a dev, y al revés', async () => {
    // Intento real de conexión con los roles de test a la base del otro entorno.
    for (const url of [testAppUrl(), testMigrateUrl()]) {
      await expect(
        withClient(withDatabase(url, OTHER_DATABASE), async () => undefined),
      ).rejects.toMatchObject({
        ...DENIED,
        message: expect.stringMatching(/permission denied for database/),
      });
    }

    await withClient(testAppUrl(), async (app) => {
      const testRoles = [new URL(testAppUrl()).username, new URL(testMigrateUrl()).username];
      const { rows: here } = await app.query<{ name: string }>('select current_database() as name');
      const testDatabase = here[0]?.name;
      expect(testDatabase).toBe('dju_test');

      const pairs = [
        ...testRoles.map((role) => [role, OTHER_DATABASE]),
        ...OTHER_ROLES.map((role) => [role, testDatabase]),
      ];
      for (const [role, database] of pairs) {
        const { rows } = await app.query<{ allowed: boolean }>(
          `select has_database_privilege($1, $2, 'CONNECT') as allowed`,
          [role, database],
        );
        expect(rows[0]?.allowed, `${role} → ${database}`).toBe(false);
      }
    });
  });

  it('SEC-68 el script de migración se niega con el rol de app', async () => {
    await withClient(testAppUrl(), async (app) => {
      await expect(assertMigrateRole(app)).rejects.toThrow(/SEC-68/);
    });
    await withClient(testMigrateUrl(), async (migrate) => {
      await expect(assertMigrateRole(migrate)).resolves.toBeUndefined();
    });
  });

  it('SEC-68 la app arranca pg-boss con migrate: false y usa colas sobre el esquema del rol de migración', async () => {
    const errors: Error[] = [];
    const boss = new PgBoss({
      connectionString: testAppUrl(),
      schema: PGBOSS_SCHEMA,
      migrate: false,
      createSchema: false,
      schedule: false,
      supervise: false,
      // Sin dueño de los índices no hay REINDEX; se apaga para no intentarlo (SEC-67).
      reindex: false,
    });
    boss.on('error', (error: Error) => errors.push(error));
    await boss.start();
    const queue = uniqueName('t02-cola');
    try {
      // Una cola normal (tabla compartida) solo inserta una fila en pgboss.queue: sin DDL.
      await boss.createQueue(queue, { policy: 'singleton' });
      const id = await boss.send(queue, { prueba: true });
      expect(id).toBeTruthy();
      const [job] = await boss.fetch<{ prueba: boolean }>(queue);
      expect(job?.id).toBe(id);
      await boss.complete(queue, id as string);
      // El mantenimiento del supervisor también corre como rol de app.
      await boss.supervise(queue);

      // Una cola con tabla propia exige DDL y el rol de app no lo tiene (SEC-67).
      await expect(
        boss.createQueue(uniqueName('t02-particion'), { partition: true }),
      ).rejects.toMatchObject(DENIED);
    } finally {
      await boss.deleteQueue(queue);
      await boss.stop({ graceful: false });
    }
    expect(errors).toEqual([]);
  });
});
