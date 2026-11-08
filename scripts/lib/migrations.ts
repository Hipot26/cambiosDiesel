import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { getConstructionPlans, getMigrationPlans, type MigrationPartition } from 'pg-boss';
import pgBossPackage from 'pg-boss/package.json' with { type: 'json' };

export const PGBOSS_SCHEMA = 'pgboss';
// Versión del esquema que trae la versión instalada de pg-boss (la misma que usa su Contractor).
export const PGBOSS_SCHEMA_VERSION: number = pgBossPackage.pgboss.schema;

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../src/db/migrations', import.meta.url));

// SEC-68: las migraciones solo corren con el rol de migración. Si la URL apunta al rol de app,
// se aborta antes de tocar nada (el rol de app tampoco podría: no tiene CREATE, SEC-67).
export async function assertMigrateRole(client: pg.ClientBase): Promise<void> {
  const { rows } = await client.query<{ role: string }>('select current_user as role');
  const role = rows[0]?.role ?? '';
  if (!role.endsWith('_migrate')) {
    throw new Error(
      `las migraciones se corren con el rol de migración (dju_<env>_migrate), no con ${role} (SEC-68)`,
    );
  }
}

// Migraciones de Drizzle con el mismo diario que `drizzle-kit migrate` (esquema drizzle).
export async function migrateDrizzle(url: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    const client = await pool.connect();
    try {
      await assertMigrateRole(client);
    } finally {
      client.release();
    }
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: MIGRATIONS_FOLDER,
      migrationsSchema: 'drizzle',
      migrationsTable: '__drizzle_migrations',
    });
  } finally {
    await pool.end();
  }
}

// getMigrationPlans entrega un bloque BEGIN…COMMIT seguido de CREATE INDEX CONCURRENTLY,
// que no pueden ir en el mismo envío que una transacción. Se separan y se corren uno por uno.
export function splitMigrationPlan(plan: string): { transaction: string; concurrent: string[] } {
  const end = plan.lastIndexOf('COMMIT;');
  if (end === -1) throw new Error('el plan de migración de pg-boss no tiene COMMIT');
  const cut = end + 'COMMIT;'.length;
  const concurrent = plan
    .slice(cut)
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  return { transaction: plan.slice(0, cut), concurrent };
}

export type PgBossMigration =
  | { action: 'created'; version: number }
  | { action: 'migrated'; from: number; version: number }
  | { action: 'current'; version: number };

// 03 §8.1 y SEC-68: el esquema de pg-boss lo crea y lo migra el rol de migración con el SQL
// que entrega la librería; la app arranca con migrate: false y no tiene CREATE.
export async function migratePgBoss(
  client: pg.ClientBase,
  schema: string = PGBOSS_SCHEMA,
): Promise<PgBossMigration> {
  const installed = await client.query<{ table: string | null }>(
    'select to_regclass($1)::text as table',
    [`${schema}.version`],
  );
  if (!installed.rows[0]?.table) {
    await client.query(getConstructionPlans(schema));
    return { action: 'created', version: PGBOSS_SCHEMA_VERSION };
  }

  const current = await client.query<{ version: number }>(
    `select version from ${client.escapeIdentifier(schema)}.version`,
  );
  const from = current.rows[0]?.version;
  if (from === undefined) throw new Error(`${schema}.version está vacía`);
  if (from === PGBOSS_SCHEMA_VERSION) return { action: 'current', version: from };
  if (from > PGBOSS_SCHEMA_VERSION) {
    throw new Error(
      `el esquema ${schema} está en la versión ${from}, más nueva que la ${PGBOSS_SCHEMA_VERSION} de pg-boss instalado`,
    );
  }

  // Las colas con tabla propia (partition: true) reciben sus índices nuevos también.
  const partitions = await client.query<MigrationPartition>(
    `select table_name as "tableName", policy from ${client.escapeIdentifier(schema)}.queue where partition`,
  );
  const plan = getMigrationPlans(schema, from, { partitionTables: partitions.rows });
  const { transaction, concurrent } = splitMigrationPlan(plan);
  await client.query(transaction);
  for (const statement of concurrent) await client.query(statement);
  return { action: 'migrated', from, version: PGBOSS_SCHEMA_VERSION };
}
