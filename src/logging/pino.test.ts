import { describe, expect, it } from 'vitest';
import { testAppUrl, withClient } from '../../tests/helpers/db.js';
import { createDatabase } from '../db/client.js';
import { candidates } from '../db/schema/candidates.js';
import { createReturnToken } from '../security/tokens.js';
import { createLogger } from './pino.js';
import {
  BUFFER,
  CIRCULAR,
  MAX_DEPTH,
  REDACTED,
  scrub,
  scrubText,
  serializeError,
  TRUNCATED,
} from './scrub.js';

// Valores inventados y fáciles de buscar en la salida.
const PHONE = '+15550100123';
const EMAIL = 'tecnico@example.com';
const COOKIE = 'dju_cand=cookie-falsa-7c1e';
const AUTH = 'Bearer token-falso-41ab';

function captureLogger() {
  const lines: string[] = [];
  const logger = createLogger('info', { write: (line: string) => lines.push(line) });
  return {
    logger,
    output: () => lines.join(''),
    last: () => JSON.parse(lines.at(-1) ?? '{}') as Record<string, unknown>,
  };
}

function nest(levels: number, leaf: Record<string, unknown>): Record<string, unknown> {
  let obj = leaf;
  for (let i = 0; i < levels - 1; i++) obj = { [`nivel${levels - 1 - i}`]: obj };
  return obj;
}

describe('SEC-73 logger', () => {
  it('SEC-73 pino redacta phone, email, cookie, authorization', () => {
    const { logger, output } = captureLogger();
    logger.info({
      phone: PHONE,
      email: EMAIL,
      headers: { cookie: COOKIE, authorization: AUTH },
      candidate: { contact: { phone: PHONE, email: EMAIL } },
    });
    const out = output();
    for (const value of [PHONE, EMAIL, COOKIE, AUTH]) expect(out).not.toContain(value);
    expect(out).toContain(REDACTED);
  });

  it.each([1, 3, 6])('SEC-73 redacta phone y email a %i nivel(es) de profundidad', (levels) => {
    const { logger, output, last } = captureLogger();
    logger.info(nest(levels, { phone: PHONE, email: EMAIL, trade: 'diesel' }));
    expect(output()).not.toContain(PHONE);
    expect(output()).not.toContain(EMAIL);
    // Lo que no es sensible sigue saliendo.
    expect(JSON.stringify(last())).toContain('diesel');
  });

  it('SEC-73 redacta dentro de un array', () => {
    const { logger, output } = captureLogger();
    logger.info({ candidates: [{ phone: PHONE }, { contact: { email: EMAIL } }] });
    expect(output()).not.toContain(PHONE);
    expect(output()).not.toContain(EMAIL);
  });

  it('SEC-73 redacta claves que contienen el fragmento: phone_e164 y phoneE164', () => {
    const { logger, output, last } = captureLogger();
    logger.info({ phone_e164: PHONE, nested: { phoneE164: PHONE, PrimaryEmail: EMAIL } });
    expect(output()).not.toContain(PHONE);
    expect(output()).not.toContain(EMAIL);
    expect(last().phone_e164).toBe(REDACTED);
  });

  it('SEC-73 limpia las propiedades propias de un Error', () => {
    const { logger, output, last } = captureLogger();
    const error = Object.assign(new Error('falló el envío'), { email: EMAIL, code: 'E_SEND' });
    logger.error({ err: error, context: { cause: error } }, 'error de prueba');
    expect(output()).not.toContain(EMAIL);
    const err = last().err as Record<string, unknown>;
    expect(err.message).toBe('falló el envío');
    expect(err.code).toBe('E_SEND');
    // Lista permitida (SEC-71): una propiedad propia que no está en la lista ni siquiera sale.
    expect(err).not.toHaveProperty('email');
  });

  it('SEC-73 limpia un Error pasado directamente al logger', () => {
    const { logger, output } = captureLogger();
    logger.error(Object.assign(new Error('falló'), { phone: PHONE }));
    expect(output()).not.toContain(PHONE);
  });

  it('SEC-73 un objeto circular no rompe el logger y se limpia', () => {
    const { logger, output, last } = captureLogger();
    const candidate: Record<string, unknown> = { email: EMAIL };
    candidate.self = candidate;
    logger.info({ candidate });
    expect(output()).not.toContain(EMAIL);
    expect((last().candidate as Record<string, unknown>).self).toBe(CIRCULAR);
  });

  it('SEC-73 redact y la limpieza recursiva actúan en la misma línea', () => {
    const { logger, output, last } = captureLogger();
    const jwt = 'jwt-falso-de-access-0d9e';
    const rawBody = '{"dju_candidate_id":"x","phone":"+15550100999"}';
    logger.info({
      upstream: { headers: { 'cf-access-jwt-assertion': jwt }, body: rawBody },
      candidate: { contact: { email: EMAIL } },
    });
    const out = output();
    expect(out).not.toContain(jwt); // lo tapa redact (el nombre no tiene fragmento sensible)
    expect(out).not.toContain('dju_candidate_id'); // redact sobre *.body (SEC-13)
    expect(out).not.toContain(EMAIL); // lo tapa la limpieza recursiva
    const upstream = last().upstream as Record<string, Record<string, unknown>>;
    expect(upstream.headers?.['cf-access-jwt-assertion']).toBe(REDACTED);
    expect(upstream.body).toBe(REDACTED);
  });

  it('SEC-73 los bindings de un logger hijo también se limpian', () => {
    const { logger, output } = captureLogger();
    logger.child({ candidate: { email: EMAIL } }).info('hijo');
    logger.child({ reqId: 'r1' }).child({ phone: PHONE }).info('nieto');
    expect(output()).not.toContain(EMAIL);
    expect(output()).not.toContain(PHONE);
    expect(output()).toContain('"reqId":"r1"');
  });
});

// Una fila inventada de candidates con travel_pct = 101: viola candidates_travel_pct_check, y
// PostgreSQL pone la fila entera en el campo detail del error.
const FILA = {
  firstName: 'Zebulon',
  lastName: 'Pruebanombre',
  email: 'sec73-falso@example.com',
  phoneE164: '+15550100173',
  zip: '75201',
  tradeClaimed: 'diesel',
  visibility: 'hidden' as const,
  travelPct: 101,
};
const VALORES_DE_LA_FILA = [FILA.firstName, FILA.lastName, FILA.email, FILA.phoneE164];

describe('SEC-73 errores y limpieza por valor', () => {
  it('SEC-73 un DatabaseError real de PostgreSQL no vuelca la fila', async () => {
    let caught: unknown;
    await withClient(testAppUrl(), async (client) => {
      await client.query('begin');
      try {
        await client.query(
          `insert into candidates
             (first_name, last_name, email, phone_e164, zip, trade_claimed, visibility, travel_pct)
           values ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            FILA.firstName,
            FILA.lastName,
            FILA.email,
            FILA.phoneE164,
            FILA.zip,
            FILA.tradeClaimed,
            FILA.visibility,
            FILA.travelPct,
          ],
        );
      } catch (error) {
        caught = error;
      } finally {
        await client.query('rollback');
      }
    });
    // El error crudo sí trae la fila: si no, esta prueba no probaría nada.
    const raw = caught as Error & { code?: string; detail?: string };
    expect(raw.code).toBe('23514');
    expect(raw.detail).toContain(FILA.email);

    const { logger, output, last } = captureLogger();
    logger.error({ err: caught }, 'falló el insert');
    logger.error(caught); // msg tomado del error
    logger.error({ err: caught }, raw.message); // como lo hace Fastify
    const out = output();
    for (const value of VALORES_DE_LA_FILA) expect(out).not.toContain(value);
    expect(out).not.toContain('Failing row');

    const err = last().err as Record<string, unknown>;
    expect(err.type).toBe('DatabaseError');
    expect(err.code).toBe('23514');
    expect(err.table).toBe('candidates');
    // Hoy es candidates_travel_pct_check; se compara con el error crudo por si otra migración
    // agrega un CHECK que PostgreSQL evalúe antes (los evalúa por orden alfabético).
    const constraint = (caught as { constraint?: string }).constraint;
    expect(constraint).toMatch(/^candidates_\w+_check$/);
    expect(err.constraint).toBe(constraint);
    expect(err.message).toBe(`error de PostgreSQL 23514 (${constraint})`);
    expect(err).not.toHaveProperty('detail');
  });

  it('SEC-73 un error de Drizzle no vuelca los params de la consulta', async () => {
    const database = createDatabase(testAppUrl(), () => {});
    let caught: unknown;
    try {
      // La transacción hace rollback sola al lanzar.
      await database.db.transaction(async (tx) => {
        await tx.insert(candidates).values(FILA);
      });
    } catch (error) {
      caught = error;
    } finally {
      await database.close();
    }
    // Drizzle pone los params en el mensaje: "Failed query: …\nparams: Zebulon,…".
    expect((caught as Error).message).toContain(FILA.email);

    const { logger, output, last } = captureLogger();
    logger.error({ err: caught }, 'falló el insert');
    logger.error(caught);
    const out = output();
    for (const value of VALORES_DE_LA_FILA) expect(out).not.toContain(value);
    const err = last().err as Record<string, unknown>;
    expect(err.type).toBe('DrizzleQueryError');
    expect(err).not.toHaveProperty('params');
    expect(err).not.toHaveProperty('query');
    expect((err.cause as Record<string, unknown>).code).toBe('23514');
  });

  it('SEC-73 el serializador err solo deja la lista permitida', () => {
    const error = Object.assign(new Error('falló'), {
      code: '23505',
      constraint: 'candidates_email_lower_idx',
      table: 'candidates',
      schema: 'public',
      routine: '_bt_check_unique',
      detail: `Key (lower(email))=(${EMAIL}) already exists.`,
      where: 'PL/pgSQL function x',
      hint: 'pista',
      internalQuery: 'select 1',
      internalPosition: '3',
      parameters: [EMAIL],
      statusCode: 500,
    });
    const out = serializeError(error);
    expect(Object.keys(out).sort()).toEqual(
      ['code', 'constraint', 'message', 'routine', 'schema', 'stack', 'table', 'type'].sort(),
    );
    expect(JSON.stringify(out)).not.toContain(EMAIL);
  });

  it('SEC-73 body anidado a 3 niveles', () => {
    const { logger, output, last } = captureLogger();
    const phone = '+15550100777';
    logger.info({
      upstream: { response: { body: `{"phone":"${phone}"}` } },
      webhook: { request: { rawBody: { dju_candidate_id: 'x', trade: 'diesel' } } },
      a: { b: { c: { responseBody: { note: 'texto libre' } } } },
      trade: 'diesel',
    });
    const out = output();
    expect(out).not.toContain(phone);
    expect(out).not.toContain('dju_candidate_id');
    expect(out).not.toContain('texto libre');
    const upstream = last().upstream as { response: { body: unknown } };
    expect(upstream.response.body).toBe(REDACTED);
    expect(last().trade).toBe('diesel');
  });

  it('SEC-73 claves To, name, code y connectionString', () => {
    const { logger, output, last } = captureLogger();
    const to = '+15550100888';
    const nombre = 'Zebulon Pruebanombre';
    const codigo = '482913';
    const clave = 'clave-falsa-xyz';
    logger.info({
      twilio: { request: { To: to, From: '+15550100889' } },
      candidate: { name: nombre, full_name: nombre, displayName: nombre, code: codigo },
      sms: { otp: codigo, verificationCode: codigo, recipient: to },
      db: { connectionString: `postgres://dju_test_app:${clave}@127.0.0.1/dju_test` },
      databaseUrl: `postgres://dju_test_app:${clave}@127.0.0.1/dju_test`,
      // Claves parecidas que no son sensibles: siguen saliendo.
      to_date: '2026-10-30',
      from_cache: true,
      hostname: 'servidor-1',
      statusCode: 200,
    });
    const out = output();
    for (const value of [to, '+15550100889', nombre, codigo, clave]) {
      expect(out, value).not.toContain(value);
    }
    const line = last();
    expect(line.to_date).toBe('2026-10-30');
    expect(line.from_cache).toBe(true);
    expect(line.hostname).toBe('servidor-1');
    expect(line.statusCode).toBe(200);
    // La URL conserva el usuario y pierde la clave.
    expect(line.databaseUrl).toBe(`postgres://dju_test_app:${REDACTED}@127.0.0.1/dju_test`);
  });

  it('SEC-73 limpieza por valor en message y stack', () => {
    const { logger, output, last } = captureLogger();
    const { token, tokenHash } = createReturnToken();
    const texto = `falló para ${EMAIL}, (214) 555-0147 y ${PHONE}; token ${token}; hash ${tokenHash}`;
    const error = new Error(texto);
    logger.error({ err: error, context: { cause: error } }, 'error de prueba');
    logger.error(error);
    logger.error({ err: error }, error.message);
    logger.info(`mensaje con ${EMAIL} y %s`, PHONE);
    logger.info({ note: `llamar al 214.555.0147 o escribir a ${EMAIL}` });
    const out = output();
    for (const value of [EMAIL, PHONE, '555-0147', '555.0147', token, tokenHash]) {
      expect(out, value).not.toContain(value);
    }
    const err = (JSON.parse(out.split('\n')[0] ?? '{}') as { err: Record<string, unknown> }).err;
    expect(String(err.message)).toContain('falló para [redacted]');
    expect(String(err.stack)).toMatch(/^Error: falló para \[redacted\]/);
    expect(String(err.stack)).toContain('    at ');
    expect(last().note).toBe(`llamar al ${REDACTED} o escribir a ${REDACTED}`);
  });
});

describe('scrubText', () => {
  it('tapa emails, teléfonos, tokens, hashes y credenciales en URL', () => {
    const { token, tokenHash } = createReturnToken();
    for (const value of [
      EMAIL,
      'Nombre.Apellido+tag@sub.example.co',
      PHONE,
      '+12145550147',
      '2145550147',
      '214-555-0147',
      '214.555.0147',
      '(214) 555-0147',
      '+1 214 555 0147',
      '1-214-555-0147',
      token,
      tokenHash,
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9',
      'AC0123456789abcdef0123456789abcdef',
    ]) {
      expect(scrubText(`antes ${value} después`), value).toBe(`antes ${REDACTED} después`);
    }
    expect(scrubText('postgres://dju_app:clave@127.0.0.1:5432/dju')).toBe(
      `postgres://dju_app:${REDACTED}@127.0.0.1:5432/dju`,
    );
  });

  it('deja pasar lo que no es dato personal ni secreto', () => {
    for (const value of [
      'candidates_travel_pct_check',
      'duplicate_signup_attempts_phone_e164_check',
      '0b7f8a52-3c1d-4e2f-9a6b-1c2d3e4f5a6b',
      '203.0.113.9',
      '2026-10-30T12:00:00.000Z',
      '/r/:token',
      'req-1',
      'error de PostgreSQL 23514',
      'connect ECONNREFUSED 127.0.0.1:5432',
      'node_modules/@fastify/helmet/index.js',
    ]) {
      expect(scrubText(value), value).toBe(value);
    }
  });
});

describe('scrub', () => {
  it('deja pasar null, primitivos y fechas', () => {
    const date = new Date('2026-10-29T00:00:00Z');
    expect(scrub(null)).toBeNull();
    expect(scrub(42)).toBe(42);
    expect(scrub('texto')).toBe('texto');
    expect(scrub(undefined)).toBeUndefined();
    expect(scrub({ at: date })).toEqual({ at: date });
  });

  it('reemplaza Buffer y vistas binarias', () => {
    expect(scrub({ file: Buffer.from('contenido'), bytes: new Uint8Array(3) })).toEqual({
      file: BUFFER,
      bytes: BUFFER,
    });
  });

  it('corta en el límite de profundidad con [truncated] en vez de dejar pasar', () => {
    const deep = nest(MAX_DEPTH + 3, { note: 'abajo' });
    const out = JSON.stringify(scrub(deep));
    expect(out).toContain(TRUNCATED);
    expect(out).not.toContain('abajo');
  });

  it('un objeto repetido en dos ramas no se marca como circular', () => {
    const shared = { trade: 'diesel' };
    expect(scrub({ a: shared, b: shared })).toEqual({ a: shared, b: shared });
  });

  it('respeta toJSON (el objeto env no se expande)', () => {
    const env = Object.defineProperty({ HOST: '127.0.0.1' }, 'toJSON', { value: () => '[env]' });
    expect(scrub({ env })).toEqual({ env: '[env]' });
  });
});
