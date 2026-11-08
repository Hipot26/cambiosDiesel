import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

export interface Database {
  pool: pg.Pool;
  db: ReturnType<typeof drizzle>;
  // Responde si la base contesta; la usa GET /healthz.
  ping: () => Promise<void>;
  close: () => Promise<void>;
}

// Tope por sentencia en el servidor: una consulta colgada no retiene para siempre una de las 10
// conexiones del pool. Ni 02 ni 03 fijan otro valor; las migraciones no usan este pool.
export const STATEMENT_TIMEOUT_MS = 10_000;
// Nombre con el que la conexión aparece en pg_stat_activity y en los logs de PostgreSQL.
export const APPLICATION_NAME = 'dieseljobsusa-app';

// Conexión de la app, siempre con el rol de app (SEC-67). El pool no abre conexiones hasta
// la primera consulta. El mensaje de error de pg no incluye la contraseña de la URL.
export function createDatabase(url: string, onIdleError: (err: Error) => void): Database {
  const pool = new pg.Pool({
    connectionString: url,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    max: 10,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    application_name: APPLICATION_NAME,
  });
  // Sin este manejador, un error de una conexión ociosa (la base se reinicia) tumba el proceso.
  pool.on('error', onIdleError);
  const db = drizzle({ client: pool });
  return {
    pool,
    db,
    ping: async () => {
      await pool.query('select 1');
    },
    close: () => pool.end(),
  };
}
