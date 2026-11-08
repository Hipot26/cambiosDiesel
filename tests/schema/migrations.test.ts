import { getConstructionPlans, getRollbackPlans } from 'pg-boss';
import { describe, expect, it } from 'vitest';
import {
  migratePgBoss,
  PGBOSS_SCHEMA,
  PGBOSS_SCHEMA_VERSION,
  splitMigrationPlan,
} from '../../scripts/lib/migrations.js';
import journal from '../../src/db/migrations/meta/_journal.json' with { type: 'json' };
import { testAppUrl, testMigrateUrl, withClient } from '../helpers/db.js';

describe('migración cero', () => {
  it('PostGIS instalado y uuidv7() nativa de PostgreSQL 18', async () => {
    await withClient(testAppUrl(), async (app) => {
      const { rows } = await app.query(
        `select postgis_version() is not null as postgis,
                uuid_extract_version(uuidv7()) as uuid_version,
                current_setting('server_version_num')::int / 10000 as pg_major`,
      );
      expect(rows[0]).toEqual({ postgis: true, uuid_version: 7, pg_major: 18 });
    });
  });

  it('el diario de Drizzle tiene exactamente las migraciones de _journal.json, en orden', async () => {
    // Drizzle guarda en created_at el "when" de cada entrada del journal: así se compara una a
    // una, no solo cuántas hay. Una migración sin aplicar o una de más hace fallar la prueba.
    await withClient(testMigrateUrl(), async (migrate) => {
      const { rows } = await migrate.query<{ created_at: string }>(
        'select created_at from drizzle.__drizzle_migrations order by id',
      );
      expect(rows.map((r) => Number(r.created_at))).toEqual(
        journal.entries.map((entry) => entry.when),
      );
    });
  });

  it('SEC-68 el esquema pgboss existe, es del rol de migración y está en la versión de la librería', async () => {
    await withClient(testMigrateUrl(), async (migrate) => {
      const { rows } = await migrate.query(
        `select n.nspowner::regrole::text as owner, v.version
         from pg_namespace n, ${PGBOSS_SCHEMA}.version v where n.nspname = $1`,
        [PGBOSS_SCHEMA],
      );
      expect(rows[0]).toEqual({
        owner: new URL(testMigrateUrl()).username,
        version: PGBOSS_SCHEMA_VERSION,
      });
      // Repetir la migración no hace nada.
      expect(await migratePgBoss(migrate)).toEqual({
        action: 'current',
        version: PGBOSS_SCHEMA_VERSION,
      });
    });
  });

  it('SEC-68 pgboss-migrate sube un esquema de la versión anterior a la actual', async () => {
    // Un esquema aparte, en la versión anterior, para probar el camino de migración real.
    const schema = 'pgboss_t02_upgrade';
    await withClient(testMigrateUrl(), async (migrate) => {
      await migrate.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      try {
        await migrate.query(getConstructionPlans(schema));
        await migrate.query(getRollbackPlans(schema, PGBOSS_SCHEMA_VERSION));
        const before = await migrate.query(`select version from ${schema}.version`);
        expect(before.rows[0]?.version).toBe(PGBOSS_SCHEMA_VERSION - 1);

        expect(await migratePgBoss(migrate, schema)).toEqual({
          action: 'migrated',
          from: PGBOSS_SCHEMA_VERSION - 1,
          version: PGBOSS_SCHEMA_VERSION,
        });
        const after = await migrate.query(`select version from ${schema}.version`);
        expect(after.rows[0]?.version).toBe(PGBOSS_SCHEMA_VERSION);
      } finally {
        await migrate.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      }
    });
  });

  it('splitMigrationPlan separa la transacción de los CREATE INDEX CONCURRENTLY', () => {
    const plan = `
    BEGIN;
    SELECT 1;
    COMMIT;

-- inlined from x (migration v46, command: a)
CREATE INDEX CONCURRENTLY IF NOT EXISTS i1 ON x.job_common (name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS i2 ON x.j1 (name);`;
    const { transaction, concurrent } = splitMigrationPlan(plan);
    expect(transaction.trim().endsWith('COMMIT;')).toBe(true);
    expect(concurrent).toEqual([
      '-- inlined from x (migration v46, command: a)\nCREATE INDEX CONCURRENTLY IF NOT EXISTS i1 ON x.job_common (name)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS i2 ON x.j1 (name)',
    ]);
    expect(splitMigrationPlan('BEGIN; SELECT 1; COMMIT;').concurrent).toEqual([]);
  });
});
