import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// En local las variables vienen del .env; en el paso de despliegue, del entorno (SEC-68).
if (existsSync('.env')) process.loadEnvFile('.env');

// Las migraciones corren con el rol de migración, dueño de los esquemas (SEC-68).
// La app nunca usa esta URL: solo conoce DATABASE_URL (rol de app, SEC-67).
const url = process.env.DATABASE_URL_MIGRATE;

export default defineConfig({
  dialect: 'postgresql',
  // El índice reexporta cada tabla una sola vez (con la carpeta, drizzle-kit las vería dos veces).
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  // El esquema drizzle lo crea infra/db/roles.sql sin permisos para el rol de app.
  migrations: { schema: 'drizzle', table: '__drizzle_migrations' },
  ...(url ? { dbCredentials: { url } } : {}),
  strict: true,
  verbose: true,
});
