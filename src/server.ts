import { buildApp } from './app.js';
import { EnvError, parseEnv } from './config/env.js';
import {
  classifyStartupError,
  closeWithin,
  SHUTDOWN_TIMEOUT_MS,
  STARTUP_MESSAGES,
} from './config/startup.js';
import { assertKeyringCoversDatabase } from './db/keyring-check.js';
import { createKeyring } from './security/keyring.js';

function loadEnvOrExit() {
  try {
    return parseEnv(process.env);
  } catch (error) {
    if (error instanceof EnvError) {
      // El mensaje solo nombra variables y reglas, nunca valores.
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

const env = loadEnvOrExit();
const app = await buildApp(env);

// Cierra la app y sale con el código pedido. Si app.close() falla o no termina en 10 s, sale con 1
// en vez de quedarse vivo esperando a que systemd lo mate.
async function closeAndExit(code: number): Promise<never> {
  const result = await closeWithin(() => app.close(), SHUTDOWN_TIMEOUT_MS);
  if (result !== 'closed') {
    app.log.error({ result }, 'el cierre no terminó bien; se sale con código 1');
    process.exit(1);
  }
  process.exit(code);
}

// SEC-72: la app no arranca si una tabla con huellas usa un key_id que ya no está en
// PHONE_HASH_KEYS. Un fallo de conexión a la base se reporta como tal, no como un problema del
// anillo. El mensaje solo nombra key_id, nunca claves ni huellas.
try {
  const keyring = createKeyring(env.PHONE_HASH_KEYS, env.PHONE_HASH_ACTIVE);
  await assertKeyringCoversDatabase(app.database, keyring);
} catch (error) {
  const failure = classifyStartupError(error);
  app.log.fatal({ err: error, failure }, STARTUP_MESSAGES[failure]);
  await closeAndExit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'cerrando');
    void closeAndExit(0);
  });
}

try {
  // SEC-77: en staging y producción env.HOST solo puede ser 127.0.0.1 (lo exige parseEnv).
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.fatal({ err: error }, 'no se pudo abrir el puerto');
  await closeAndExit(1);
}
