import { describe, expect, it } from 'vitest';
import { testAppUrl, withClient, withDatabase } from '../../tests/helpers/db.js';
import { createDatabase } from '../db/client.js';
import { assertKeyringCoversRows, createKeyring, KeyringError } from '../security/keyring.js';
import { classifyStartupError, closeWithin, STARTUP_MESSAGES } from './startup.js';

// Captura el error que lanza fn; falla la prueba si no lanza.
async function errorOf(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('se esperaba un error');
}

describe('arranque', () => {
  it('SEC-72 arranque: un KeyringError se distingue de un error de conexión', async () => {
    const ring = createKeyring(new Map([['v2', Buffer.alloc(32, 1)]]), 'v2');
    let keyringError: unknown;
    try {
      assertKeyringCoversRows(ring, ['v1', 'v2']);
    } catch (error) {
      keyringError = error;
    }
    expect(keyringError).toBeInstanceOf(KeyringError);
    expect(classifyStartupError(keyringError)).toBe('keyring');

    // Base inalcanzable: ECONNREFUSED real de pg (nada escucha en el puerto 1).
    const unreachable = createDatabase('postgres://dju_test_app@127.0.0.1:1/dju_test', () => {});
    try {
      const refused = await errorOf(() => unreachable.ping());
      expect(classifyStartupError(refused)).toBe('database_connection');
    } finally {
      await unreachable.close();
    }

    // Base inexistente: 3D000 real de PostgreSQL.
    const missingDb = await errorOf(() =>
      withClient(withDatabase(testAppUrl(), 'dju_base_que_no_existe'), async () => {}),
    );
    expect((missingDb as { code?: string }).code).toBe('3D000');
    expect(classifyStartupError(missingDb)).toBe('database_connection');

    // Los mensajes de cada caso son distintos.
    expect(new Set(Object.values(STARTUP_MESSAGES)).size).toBe(3);
  });

  it('arranque: un error de la consulta que no es de conexión no culpa ni al anillo ni a la red', async () => {
    // 42P01 real: tabla inexistente (por ejemplo, migraciones sin aplicar).
    const undefinedTable = await errorOf(() =>
      withClient(testAppUrl(), (client) => client.query('select 1 from tabla_que_no_existe')),
    );
    expect((undefinedTable as { code?: string }).code).toBe('42P01');
    expect(classifyStartupError(undefinedTable)).toBe('unknown');
    expect(classifyStartupError(new Error('otra cosa'))).toBe('unknown');
    expect(classifyStartupError('texto')).toBe('unknown');
    // Formas sin code que también son de conexión: tiempo vencido de pg-pool y AggregateError.
    expect(classifyStartupError(new Error('timeout exceeded when trying to connect'))).toBe(
      'database_connection',
    );
    const aggregate = new AggregateError([Object.assign(new Error('a'), { code: 'ECONNREFUSED' })]);
    expect(classifyStartupError(aggregate)).toBe('database_connection');
  });

  it('apagado: closeWithin corta a los 10 s (aquí, unos milisegundos) si close() no termina', async () => {
    expect(await closeWithin(() => new Promise(() => {}), 20)).toBe('timeout');
    expect(await closeWithin(async () => {}, 1000)).toBe('closed');
    expect(await closeWithin(() => Promise.reject(new Error('falló')), 1000)).toBe('failed');
    expect(
      await closeWithin(() => {
        throw new Error('falló sin promesa');
      }, 1000),
    ).toBe('failed');
  });
});
