import { describe, expect, it } from 'vitest';
import { testAppUrl, testMigrateUrl, withClient } from '../../tests/helpers/db.js';
import { createKeyring, type Keyring, KeyringError } from '../security/keyring.js';
import { createDatabase } from './client.js';
import {
  assertKeyringCoversDatabase,
  assertKeyringCoversReader,
  KEY_ID_COLUMNS,
  KeyringError as KeyringErrorFromCheck,
  loadKeyIdsInUse,
} from './keyring-check.js';

const KEY = Buffer.from('clave-de-huellas-de-prueba-0000000000000', 'utf8');

// Un anillo con esos key_id, todos con la misma clave inventada (aquí solo cuentan los id).
function ringWith(keyIds: readonly string[]): Keyring {
  const ids = [...new Set(['v1', 'v2', ...keyIds])];
  return createKeyring(new Map(ids.map((keyId) => [keyId, KEY])), 'v2');
}

// Un key_id que no está en uso en la base compartida: v900, v901, …
function unusedKeyId(inUse: readonly string[], from: number): string {
  let n = from;
  while (inUse.includes(`v${n}`)) n += 1;
  return `v${n}`;
}

describe('SEC-72 anillo de claves contra la base', () => {
  it('KEY_ID_COLUMNS cubre toda columna que termina en key_id y nombra su huella real', async () => {
    await withClient(testMigrateUrl(), async (client) => {
      const keyIds = await client.query<{ table_name: string; column_name: string }>(`
        select table_name, column_name from information_schema.columns
        where table_schema = 'public' and column_name like '%key\\_id'
        order by table_name`);
      expect(keyIds.rows.map((r) => [r.table_name, r.column_name])).toEqual(
        KEY_ID_COLUMNS.map(([table, keyIdColumn]) => [table, keyIdColumn]).sort(),
      );

      for (const [table, , hashColumn] of KEY_ID_COLUMNS) {
        const { rows } = await client.query(
          `select 1 from information_schema.columns
           where table_schema = 'public' and table_name = $1 and column_name = $2`,
          [table, hashColumn],
        );
        expect(rows, `${table}.${hashColumn}`).toHaveLength(1);
      }
    });
  });

  it('SEC-72 el arranque falla si una tabla tiene un key_id que no está en PHONE_HASH_KEYS', async () => {
    // Todo dentro de una transacción que se deshace: no deja filas y no depende de las filas que
    // otras pruebas tengan en la base compartida (el anillo de partida cubre lo que ya hay).
    await withClient(testAppUrl(), async (client) => {
      await client.query('begin');
      try {
        const inUse = await loadKeyIdsInUse(client);
        const ring = ringWith(inUse);
        await expect(assertKeyringCoversReader(client, ring)).resolves.toBeUndefined();

        // Una supresión escrita con una clave retirada del .env → no arranca y la nombra.
        const retired = unusedKeyId(inUse, 900);
        await client.query(
          `insert into phone_suppression (key_id, phone_hash, reason) values ($1, 'huella-t04b', 'sms_stop')`,
          [retired],
        );
        expect(await loadKeyIdsInUse(client)).toContain(retired);
        await expect(assertKeyringCoversReader(client, ring)).rejects.toThrow(KeyringError);
        await expect(assertKeyringCoversReader(client, ring)).rejects.toThrow(
          new RegExp(`\\b${retired}\\b`),
        );

        // La lápida que guarda candidate_deletions al cerrar la cadena también cuenta.
        const retiredTombstone = unusedKeyId([...inUse, retired], 950);
        await client.query(
          `insert into candidate_deletions (requested_by, tombstone_hash, tombstone_hash_key_id, finished_at)
           values ('candidate', 'huella-t04b', $1, now())`,
          [retiredTombstone],
        );
        expect(await loadKeyIdsInUse(client)).toContain(retiredTombstone);

        // Con las claves de vuelta en el anillo, arranca.
        const restored = ringWith([...inUse, retired, retiredTombstone]);
        await expect(assertKeyringCoversReader(client, restored)).resolves.toBeUndefined();
      } finally {
        await client.query('rollback');
      }
    });
  });

  it('SEC-72 assertKeyringCoversDatabase lee con el pool de la app; KeyringError sale de keyring-check', async () => {
    // server.ts distingue este error de un fallo de conexión con instanceof.
    expect(KeyringErrorFromCheck).toBe(KeyringError);
    const database = createDatabase(testAppUrl(), () => {});
    try {
      const inUse = await loadKeyIdsInUse(database.pool);
      await expect(assertKeyringCoversDatabase(database, ringWith(inUse))).resolves.toBeUndefined();
    } finally {
      await database.close();
    }
  });
});
