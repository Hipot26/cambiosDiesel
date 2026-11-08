import { assertMigrateRole, migrateDrizzle, migratePgBoss } from '../../scripts/lib/migrations.js';
import { testMigrateUrl, withClient } from '../helpers/db.js';

// globalSetup de Vitest: deja dju_test migrada antes de las pruebas, con el rol de migración.
export default async function setup(): Promise<void> {
  const url = testMigrateUrl();
  await migrateDrizzle(url);
  await withClient(url, async (client) => {
    await assertMigrateRole(client);
    await migratePgBoss(client);
  });
}
