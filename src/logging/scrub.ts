// Limpieza de datos sensibles antes de escribir un log (SEC-73). Tres piezas que se aplican juntas:
// 1. Por nombre de clave: isSensitiveKey() (fragmentos y claves exactas), a cualquier profundidad.
// 2. Por valor: scrubText() sobre toda cadena (emails, teléfonos, tokens y hashes, credenciales
//    dentro de una URL), también en el mensaje y el stack de un error.
// 3. Errores por lista permitida: serializeError() deja solo campos que no llevan datos de filas.
// La lista de claves y scrubText() se reutilizan en el beforeSend de Sentry (SEC-74).
import pg from 'pg';

// Una clave es sensible si, en minúsculas, contiene alguno de estos fragmentos:
// "phone" cubre phone_e164 y phoneE164; "token" cubre csrfToken; "body" cubre rawBody y
// responseBody a cualquier profundidad (SEC-13). Los nombres compuestos van con y sin guion bajo:
// displayName en minúsculas es displayname, que no contiene display_name.
export const SENSITIVE_KEY_FRAGMENTS = [
  'phone',
  'email',
  'token',
  'password',
  'secret',
  'cookie',
  'authorization',
  'signature',
  'first_name',
  'firstname',
  'last_name',
  'lastname',
  'fullname',
  'full_name',
  'displayname',
  'display_name',
  'body',
  'connectionstring',
  'connection_string',
  'otp',
  'verificationcode',
  'verification_code',
  'smscode',
  'sms_code',
  'recipient',
  'address',
] as const;

// Claves sensibles solo cuando el nombre completo es ese (en minúsculas). Como fragmento
// romperían to_date, from_cache, hostname o statusCode. "To" y "From" son los campos de Twilio.
export const SENSITIVE_EXACT_KEYS = ['to', 'from', 'name', 'code'] as const;

export const REDACTED = '[redacted]';
export const TRUNCATED = '[truncated]';
export const CIRCULAR = '[circular]';
export const BUFFER = '[buffer]';

// Límite de seguridad: lo que esté más abajo se reemplaza, nunca se deja pasar.
export const MAX_DEPTH = 10;

const EXACT_KEYS: ReadonlySet<string> = new Set(SENSITIVE_EXACT_KEYS);

export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    EXACT_KEYS.has(lower) || SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment))
  );
}

// --- Limpieza por valor ---------------------------------------------------------------------

// Credenciales dentro de una URL (postgres://usuario:clave@host): se conserva el usuario.
const URL_CREDENTIALS = /\b([a-z][a-z0-9+.-]*:\/\/)([^\s/?#@:]*):[^\s/?#@]*@/gi;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
// Secuencias de 32 o más caracteres base64url (tokens, hashes en hex, claves, JWT por partes).
const LONG_RUN = /(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{32,}(?![A-Za-z0-9_-])/g;
const HEX_RUN = /[0-9a-fA-F]{32}/;
// Lo que se salva de LONG_RUN: identificadores en snake_case o kebab-case de un solo caso
// (nombres de constraint como candidates_phone_hash_key_check, UUID). Un token aleatorio casi
// nunca cumple esto: tiene mayúsculas y minúsculas mezcladas y ningún separador obligatorio.
const IDENTIFIER = /^(?:[a-z0-9]+(?:[_-][a-z0-9]+)+|[A-Z0-9]+(?:[_-][A-Z0-9]+)+)$/;
// E.164: + y de 7 a 15 dígitos.
const PHONE_E164 = /(?<![\w+])\+[1-9]\d{6,14}(?!\d)/g;
// EE. UU., 10 dígitos con o sin separadores y con +1 o 1 opcional: 2145550147, 214-555-0147,
// 214.555.0147, (214) 555-0147, +1 214 555 0147.
const PHONE_US = /(?<![\w+])(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.-]?)\d{3}[\s.-]?\d{4}(?!\w)/g;

function looksLikeSecret(run: string): boolean {
  return HEX_RUN.test(run) || !IDENTIFIER.test(run);
}

// Segunda capa por valor: reemplaza por [redacted] lo que parezca email, teléfono, token, hash o
// credencial en una URL, venga en la clave que venga. El orden importa: primero lo que contiene
// a lo demás (una URL con clave, un email), después los tokens y al final los teléfonos, para no
// partir un token en dos pedazos.
export function scrubText(text: string): string {
  return text
    .replace(URL_CREDENTIALS, `$1$2:${REDACTED}@`)
    .replace(EMAIL, REDACTED)
    .replace(LONG_RUN, (run) => (looksLikeSecret(run) ? REDACTED : run))
    .replace(PHONE_E164, REDACTED)
    .replace(PHONE_US, REDACTED);
}

// --- Errores por lista permitida ------------------------------------------------------------

// Campos de un error que se conservan. Todos son metadatos (código SQLSTATE o de Node, nombres
// del catálogo de la base), nunca valores de una fila. Nunca detail, where, hint, internalQuery,
// internalPosition ni parameters, ni las propiedades query y params de Drizzle.
const ERROR_FIELDS = ['code', 'constraint', 'table', 'column', 'schema', 'routine'] as const;

const SQLSTATE = /^[0-9A-Z]{5}$/;

function isPgDatabaseError(error: Error): boolean {
  if (error instanceof pg.DatabaseError) return true;
  // Por si llega de otra copia de pg-protocol: la forma de un error de PostgreSQL.
  const fields = error as Error & { severity?: unknown; code?: unknown };
  return (
    typeof fields.severity === 'string' &&
    typeof fields.code === 'string' &&
    SQLSTATE.test(fields.code)
  );
}

function errorType(error: Error): string {
  const ctor = (error as { constructor?: unknown }).constructor;
  return typeof ctor === 'function' && ctor.name ? ctor.name : error.name;
}

// El mensaje de PostgreSQL puede llevar valores de la fila (invalid input syntax for type uuid:
// "<valor>") y el de Drizzle lleva los params de la consulta: los dos se reemplazan.
function errorMessage(error: Error, type: string): string {
  if (isPgDatabaseError(error)) {
    const { code, constraint } = error as Error & { code?: unknown; constraint?: unknown };
    const where = typeof constraint === 'string' ? ` (${constraint})` : '';
    return scrubText(`error de PostgreSQL ${typeof code === 'string' ? code : '?'}${where}`);
  }
  const raw = typeof error.message === 'string' ? error.message : '';
  if (type === 'DrizzleQueryError' || raw.startsWith('Failed query:')) {
    return 'falló una consulta a la base; el error de PostgreSQL va en cause';
  }
  return scrubText(raw);
}

// El stack de V8 repite el mensaje en su primera línea: se rehace con el mensaje ya limpio y
// solo las líneas "at …" (también limpias).
function errorStack(stack: unknown, header: string): string | undefined {
  if (typeof stack !== 'string') return undefined;
  const frames = stack
    .split('\n')
    .filter((line) => /^\s+at /.test(line))
    .map(scrubText);
  return [header, ...frames].join('\n');
}

function errorToLog(error: Error, depth: number, seen: WeakSet<object>): Record<string, unknown> {
  const type = errorType(error);
  const message = errorMessage(error, type);
  const out: Record<string, unknown> = { type, message };
  const fields = error as unknown as Record<string, unknown>;
  for (const field of ERROR_FIELDS) {
    const value = fields[field];
    if (typeof value === 'string') out[field] = scrubText(value);
    else if (typeof value === 'number') out[field] = value;
  }
  const stack = errorStack(error.stack, `${type}: ${message}`);
  if (stack !== undefined) out.stack = stack;
  if (error.cause !== undefined) {
    seen.add(error);
    try {
      out.cause = walk(error.cause, depth + 1, seen);
    } finally {
      seen.delete(error);
    }
  }
  return out;
}

// Serializador err del logger (SEC-71, SEC-73): type, message y stack limpios por valor, los
// campos de ERROR_FIELDS y la causa con la misma regla. Nada más del error sale.
export function serializeError(error: Error): Record<string, unknown> {
  return errorToLog(error, 0, new WeakSet());
}

// --- Recorrido ------------------------------------------------------------------------------

export function scrub(value: unknown): unknown {
  return walk(value, 0, new WeakSet());
}

function walk(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (value === null || typeof value !== 'object') return value;
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    return BUFFER;
  }
  if (value instanceof Date) return value;
  if (depth >= MAX_DEPTH) return TRUNCATED;
  if (seen.has(value)) return CIRCULAR;

  // Un error en cualquier clave sigue la misma lista permitida que el serializador err.
  if (value instanceof Error) return errorToLog(value, depth, seen);

  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1, seen));

    // Se respeta toJSON (por ejemplo, el objeto env responde "[env]"), igual que JSON.stringify.
    if (typeof (value as { toJSON?: unknown }).toJSON === 'function') {
      return walk((value as { toJSON: () => unknown }).toJSON(), depth, seen);
    }

    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      out[scrubText(key)] = isSensitiveKey(key)
        ? REDACTED
        : walk((value as Record<string, unknown>)[key], depth + 1, seen);
    }
    return out;
  } finally {
    // Solo un ciclo real se marca como circular; un objeto repetido en dos ramas se recorre dos veces.
    seen.delete(value);
  }
}
