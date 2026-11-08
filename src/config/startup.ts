// Piezas del arranque y del apagado de server.ts, aparte para poder probarlas sin abrir un
// proceso (R1 H-11 y H-16).
import { KeyringError } from '../security/keyring.js';

// Tope del apagado: si app.close() no termina en este tiempo, el proceso sale con código 1.
export const SHUTDOWN_TIMEOUT_MS = 10_000;

// Qué falló en la comprobación del anillo de claves contra la base (SEC-72).
export type StartupFailure = 'keyring' | 'database_connection' | 'unknown';

// Mensajes del log fatal. Ninguno lleva valores: el error va aparte, por el serializador err.
export const STARTUP_MESSAGES: Readonly<Record<StartupFailure, string>> = {
  keyring: 'el anillo de claves de hash no cubre las filas de la base (SEC-72)',
  database_connection: 'no se pudo conectar a la base de datos al arrancar',
  unknown: 'falló la comprobación del anillo de claves contra la base',
};

// Errores de conexión, por su code: de Node (red y DNS) y de PostgreSQL (contraseña, rol o base
// inexistente, servidor arrancando, sin conexiones libres). Toda la clase 08 de SQLSTATE es de
// conexión.
const CONNECTION_CODES: ReadonlySet<string> = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  '28000',
  '28P01',
  '3D000',
  '57P03',
  '53300',
]);

// pg y pg-pool lanzan estos sin code cuando se vence el tiempo de conexión o se corta el socket.
const CONNECTION_MESSAGES = ['timeout exceeded when trying to connect', 'Connection terminated'];

function isConnectionError(error: unknown, depth = 0): boolean {
  if (typeof error !== 'object' || error === null || depth > 3) return false;
  const { code, message, errors, cause } = error as {
    code?: unknown;
    message?: unknown;
    errors?: unknown;
    cause?: unknown;
  };
  if (typeof code === 'string' && (CONNECTION_CODES.has(code) || /^08[0-9A-Z]{3}$/.test(code))) {
    return true;
  }
  if (typeof message === 'string' && CONNECTION_MESSAGES.some((m) => message.includes(m))) {
    return true;
  }
  // Node junta en un AggregateError los intentos a cada dirección de un host.
  if (Array.isArray(errors) && errors.some((inner) => isConnectionError(inner, depth + 1))) {
    return true;
  }
  return isConnectionError(cause, depth + 1);
}

export function classifyStartupError(error: unknown): StartupFailure {
  if (error instanceof KeyringError) return 'keyring';
  if (isConnectionError(error)) return 'database_connection';
  return 'unknown';
}

export type CloseResult = 'closed' | 'failed' | 'timeout';

// Espera a close() como mucho timeoutMs. Nunca rechaza: dice cómo terminó.
export function closeWithin(
  close: () => Promise<unknown>,
  timeoutMs: number,
): Promise<CloseResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('timeout'), timeoutMs);
    Promise.resolve()
      .then(close)
      .then(
        () => resolve('closed'),
        () => resolve('failed'),
      )
      .finally(() => clearTimeout(timer));
  });
}
