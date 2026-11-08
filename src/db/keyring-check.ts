// Regla "nunca retirar una clave de hash con filas vivas" (SEC-72), cableada a la base: al
// arrancar se leen los key_id distintos de todas las tablas con huellas y la app no arranca si
// alguno falta en PHONE_HASH_KEYS. La función pura está en src/security/keyring.ts (T-03).
import { escapeIdentifier, type QueryResult, type QueryResultRow } from 'pg';
import { assertKeyringCoversRows, type Keyring } from '../security/keyring.js';
import type { Database } from './client.js';

// KeyringError sale de aquí también: server.ts distingue con instanceof un anillo que no cubre
// las filas (no arrancar y decir qué key_id falta) de una base que no responde.
export { KeyringError } from '../security/keyring.js';

// Toda tabla con huellas: su columna de key_id y la huella que esa clave produjo (03 §1). La
// prueba del esquema comprueba que esta lista coincide con las columnas reales, para que una
// tabla nueva no se quede fuera, y que cada par va junto (NOT NULL o CHECK).
export const KEY_ID_COLUMNS: readonly (readonly [
  table: string,
  keyIdColumn: string,
  hashColumn: string,
])[] = [
  ['candidates', 'phone_hash_key_id', 'phone_hash'],
  ['phone_suppression', 'key_id', 'phone_hash'],
  ['tombstones', 'key_id', 'id_hash'],
  ['email_suppression', 'key_id', 'email_hash'],
  ['sms_sends', 'key_id', 'phone_hash'],
  ['duplicate_signup_attempts', 'key_id', 'email_hash'],
  ['candidate_deletions', 'tombstone_hash_key_id', 'tombstone_hash'],
];

// SQL fijo armado solo con las constantes de arriba, nunca con datos de entrada (SEC-62); aun
// así, cada nombre va escapado como identificador.
const KEY_IDS_IN_USE_SQL = KEY_ID_COLUMNS.map(([table, column]) => {
  const t = escapeIdentifier(table);
  const c = escapeIdentifier(column);
  return `select distinct ${c} as key_id from ${t} where ${c} is not null`;
}).join(' union ');

// Lo único que hace falta para leer: el pool de la app al arrancar, o un cliente dentro de una
// transacción (las pruebas, para no depender de lo que otras dejaron en la base).
export interface SqlReader {
  query<R extends QueryResultRow>(text: string): Promise<QueryResult<R>>;
}

export async function loadKeyIdsInUse(reader: SqlReader): Promise<string[]> {
  const { rows } = await reader.query<{ key_id: string }>(KEY_IDS_IN_USE_SQL);
  return rows.map((row) => row.key_id).sort();
}

// Lanza KeyringError nombrando los key_id que faltan; el mensaje no lleva claves ni huellas.
export async function assertKeyringCoversReader(reader: SqlReader, ring: Keyring): Promise<void> {
  assertKeyringCoversRows(ring, await loadKeyIdsInUse(reader));
}

// La que llama server.ts al arrancar.
export async function assertKeyringCoversDatabase(
  database: Pick<Database, 'pool'>,
  ring: Keyring,
): Promise<void> {
  await assertKeyringCoversReader(database.pool, ring);
}
