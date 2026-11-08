// Crea o migra el esquema pgboss con el rol de migración (03 §8.1, SEC-68).
// Corre después de `drizzle-kit migrate` en `npm run db:migrate` y en el paso de despliegue.
import pg from 'pg';
import { z } from 'zod';
import { assertMigrateRole, migratePgBoss } from './lib/migrations.js';

const parsed = z
  .object({ DATABASE_URL_MIGRATE: z.url({ protocol: /^postgres(ql)?$/ }) })
  .safeParse(process.env);
if (!parsed.success) {
  // El mensaje de zod nombra la variable, nunca su valor.
  console.error(`pgboss-migrate: ${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: parsed.data.DATABASE_URL_MIGRATE });
try {
  await client.connect();
  await assertMigrateRole(client);
  const result = await migratePgBoss(client);
  if (result.action === 'created') {
    console.log(`pgboss: esquema creado en la versión ${result.version}`);
  } else if (result.action === 'migrated') {
    console.log(`pgboss: migrado de la versión ${result.from} a la ${result.version}`);
  } else {
    console.log(`pgboss: ya está en la versión ${result.version}, nada que hacer`);
  }
} catch (error) {
  console.error(`pgboss-migrate: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
