import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// En local, TEST_DATABASE_URL y TEST_DATABASE_URL_MIGRATE vienen del .env; en CI, del entorno.
// loadEnvFile no reemplaza variables que ya estén definidas.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // Migra dju_test (Drizzle y pg-boss) con el rol de migración antes de las pruebas.
    globalSetup: ['tests/setup/db.ts'],
  },
});
