import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  type DestinationStream,
  type LevelWithSilent,
  type LogFn,
  type LoggerOptions,
  pino,
} from 'pino';
import { isSensitiveKey, REDACTED, scrub, scrubText, serializeError } from './scrub.js';

// Logger de la app con estas capas (SEC-73):
// 1. scrub() limpia, a cualquier profundidad, toda clave sensible por su nombre y toda cadena por
//    su valor (emails, teléfonos, tokens y hashes, credenciales en URL).
// 2. El serializador err deja solo una lista permitida de campos del error (SEC-71).
// 3. El texto del mensaje (msg) pasa por la limpieza por valor en el hook logMethod. Aun así, los
//    datos personales nunca se interpolan en el mensaje: van como campos del objeto.
// 4. redact de pino tapa cabeceras cuyo nombre no delata el contenido.

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["cf-access-jwt-assertion"]',
  'req.headers["x-screenproof-signature"]',
  'headers["cf-access-jwt-assertion"]',
  '*.headers["cf-access-jwt-assertion"]',
];

// Ruta para el log. Con ruta, su plantilla (/r/:token no lleva el token). Sin ruta (404), solo el
// primer segmento del path y "/*" si había más: lo que sigue puede ser un token (SEC-52, SEC-73).
export function logPath(request: FastifyRequest): string {
  const route = request.routeOptions.url;
  if (route !== undefined) return route;
  const path = request.url.split('?')[0] ?? '';
  if (!path.startsWith('/')) return '/*';
  const [, first = '', ...rest] = path.split('/');
  return rest.length > 0 ? `/${first}/*` : `/${first}`;
}

// Solo método, ruta (logPath), IP de request.ip e id.
function serializeRequest(request: FastifyRequest) {
  return {
    method: request.method,
    url: logPath(request),
    ip: request.ip,
    id: request.id,
  };
}

function serializeReply(reply: FastifyReply) {
  return { statusCode: reply.statusCode };
}

// pino aplica formatters.log ANTES que los serializadores, así que las claves con serializador
// no se recorren ahí (serían el request crudo de Fastify): se limpia la salida del serializador.
const serializers = {
  req: (request: FastifyRequest) => scrub(serializeRequest(request)),
  res: (reply: FastifyReply) => scrub(serializeReply(reply)),
  err: (value: unknown) => (value instanceof Error ? serializeError(value) : scrub(value)),
};

const SERIALIZED_KEYS = new Set(Object.keys(serializers));

function scrubFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SERIALIZED_KEYS.has(key)) out[key] = value;
    else out[scrubText(key)] = isSensitiveKey(key) ? REDACTED : scrub(value);
  }
  return out;
}

function errorIn(first: unknown): Error | undefined {
  if (first instanceof Error) return first;
  if (typeof first === 'object' && first !== null) {
    const err = (first as { err?: unknown }).err;
    if (err instanceof Error) return err;
  }
  return undefined;
}

const scrubArg = (value: unknown) => (typeof value === 'string' ? scrubText(value) : scrub(value));

// Argumentos de cada llamada al logger. pino toma err.message como msg cuando no se pasa uno, y
// Fastify pasa error.message como msg en sus logs de error: en los dos casos se usa el mensaje
// del serializador err (limpio, y genérico para PostgreSQL y Drizzle). Toda otra cadena del
// mensaje o de la interpolación pasa por la limpieza por valor.
export function cleanLogArgs(args: readonly unknown[]): unknown[] {
  const [first, ...rest] = args;
  if (typeof first === 'string') return [scrubText(first), ...rest.map(scrubArg)];
  const err = errorIn(first);
  if (err !== undefined && (rest[0] === undefined || rest[0] === err.message)) {
    return [first, serializeError(err).message, ...rest.slice(1).map(scrubArg)];
  }
  return [first, ...rest.map(scrubArg)];
}

export function loggerOptions(level: LevelWithSilent): LoggerOptions {
  return {
    level,
    redact: { paths: REDACT_PATHS, censor: REDACTED },
    serializers,
    formatters: { log: scrubFields, bindings: scrubFields },
    hooks: {
      logMethod(args, method) {
        method.apply(this, cleanLogArgs(args) as Parameters<LogFn>);
      },
    },
  };
}

export function createLogger(level: LevelWithSilent, destination?: DestinationStream) {
  const logger = destination ? pino(loggerOptions(level), destination) : pino(loggerOptions(level));
  // pino no aplica formatters.bindings a los hijos (child() lo reemplaza por la identidad),
  // así que los bindings se limpian aquí. Los hijos heredan este child() por prototipo.
  const child = logger.child;
  logger.child = function (this: typeof logger, bindings, options) {
    return child.call(this, scrubFields(bindings), options);
  } as typeof logger.child;
  return logger;
}
