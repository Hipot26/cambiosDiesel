// Solo local: borra lo que crearon las migraciones y vuelve a migrar (Drizzle y pg-boss).
// Se niega si APP_ENV no es development o test, o si la base no es dju_dev o dju_test.
import pg from 'pg';
import { z } from 'zod';
import {
  assertResettableDatabase,
  assertResettableEnv,
  dropMigratedObjects,
} from './lib/db-reset.js';
import { assertMigrateRole, migrateDrizzle, migratePgBoss } from './lib/migrations.js';

try {
  assertResettableEnv(process.env.APP_ENV);
} catch (error) {
  console.error(`db-reset: ${(error as Error).message}`);
  process.exit(1);
}

const parsed = z
  .object({ DATABASE_URL_MIGRATE: z.url({ protocol: /^postgres(ql)?$/ }) })
  .safeParse(process.env);
if (!parsed.success) {
  console.error(`db-reset: ${z.prettifyError(parsed.error)}`);
  process.exit(1);
}
const url = parsed.data.DATABASE_URL_MIGRATE;

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  await assertMigrateRole(client);
  const { rows } = await client.query<{ name: string }>('select current_database() as name');
  const database = rows[0]?.name ?? '';
  assertResettableDatabase(database);
  await dropMigratedObjects(client);
  await migrateDrizzle(url);
  const pgboss = await migratePgBoss(client);
  console.log(`db-reset: ${database} reiniciada; pgboss en la versión ${pgboss.version}`);
} catch (error) {
  console.error(`db-reset: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
