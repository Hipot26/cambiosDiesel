import pg from 'pg';

// Las pruebas de base corren contra PostgreSQL real (dju_test), nunca simulado.
// Si falta la variable, fallan con un mensaje claro en vez de saltarse en silencio.
function requireEnv(name: 'TEST_DATABASE_URL' | 'TEST_DATABASE_URL_MIGRATE'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} no está definida: agrégala al .env (ver .env.example) y corre docker compose up -d`,
    );
  }
  return value;
}

// Rol de app sobre dju_test.
export const testAppUrl = (): string => requireEnv('TEST_DATABASE_URL');
// Rol de migración sobre dju_test.
export const testMigrateUrl = (): string => requireEnv('TEST_DATABASE_URL_MIGRATE');

// La misma URL con otra base: sirve para intentar entrar a dju_dev con un rol de test (SEC-69).
export function withDatabase(url: string, database: string): string {
  const u = new URL(url);
  u.pathname = `/${database}`;
  return u.toString();
}

export async function withClient<T>(
  url: string,
  fn: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// Corre fn dentro de una transacción que siempre se deshace: la prueba no deja filas en la base
// compartida y no depende de las que dejen otras.
export async function withRollback<T>(
  url: string,
  fn: (client: pg.Client) => Promise<T>,
): Promise<T> {
  return withClient(url, async (client) => {
    await client.query('begin');
    try {
      return await fn(client);
    } finally {
      await client.query('rollback');
    }
  });
}
