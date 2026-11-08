// Anillo de claves para huellas de teléfono, email y lápidas (SEC-10, SEC-72).
// Una huella es HMAC-SHA256(clave, prefijo + valor normalizado) en hex minúsculo. Se guarda
// junto con su key_id; para buscar se calcula una huella por cada clave vigente y se consulta
// por (key_id, hash). Una clave nunca se retira mientras queden filas con su key_id.
//
// Separación por uso: el prefijo ("phone:", "email:", "tombstone:") hace que una huella de una
// tabla no sirva en otra. Fijado en T-03; cambiarlo obligaría a recalcular huellas que no se
// pueden recalcular.
import { createHmac } from 'node:crypto';
import type { KeyedSecrets } from './keyed-secrets.js';

// key_id con formato fijo: v1, v2, …, v999.
export const HASH_KEY_ID_PATTERN = /^v[1-9][0-9]{0,2}$/;
export const HASH_KEY_MIN_BYTES = 32;

export type HashKind = 'phone' | 'email' | 'tombstone';

export interface Fingerprint {
  keyId: string;
  hash: string;
}

export interface Keyring {
  readonly keys: KeyedSecrets;
  readonly activeKeyId: string;
}

export class KeyringError extends Error {
  override name = 'KeyringError';
}

const E164 = /^\+[1-9][0-9]{6,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function createKeyring(keys: KeyedSecrets, activeKeyId: string): Keyring {
  if (keys.size === 0) throw new KeyringError('el anillo no tiene claves');
  for (const keyId of keys.keys()) {
    if (!HASH_KEY_ID_PATTERN.test(keyId)) {
      throw new KeyringError(`key_id con formato inválido en el anillo (se espera v1, v2, …)`);
    }
  }
  if (!keys.has(activeKeyId)) {
    throw new KeyringError('la clave activa no existe en el anillo');
  }
  return { keys, activeKeyId };
}

// Entrada normalizada antes del hash. Los errores no incluyen el valor (SEC-71, SEC-73).
export function normalizeForHash(kind: HashKind, value: string): string {
  switch (kind) {
    case 'phone': {
      // El teléfono llega ya en E.164 (SEC-47); aquí solo se comprueba.
      if (!E164.test(value)) throw new KeyringError('el teléfono no está en E.164');
      return value;
    }
    case 'email': {
      const email = value.trim().toLowerCase();
      if (!EMAIL.test(email)) throw new KeyringError('el email no tiene forma válida');
      return email;
    }
    case 'tombstone': {
      const id = value.trim().toLowerCase();
      if (!UUID.test(id)) throw new KeyringError('la lápida necesita un UUID');
      return id;
    }
  }
}

export function fingerprint(
  ring: Keyring,
  kind: HashKind,
  value: string,
  keyId: string = ring.activeKeyId,
): Fingerprint {
  const key = ring.keys.get(keyId);
  if (key === undefined) throw new KeyringError('key_id desconocido en el anillo');
  const message = `${kind}:${normalizeForHash(kind, value)}`;
  return { keyId, hash: createHmac('sha256', key).update(message, 'utf8').digest('hex') };
}

export const phoneHash = (ring: Keyring, phoneE164: string, keyId?: string): Fingerprint =>
  fingerprint(ring, 'phone', phoneE164, keyId);

export const emailHash = (ring: Keyring, email: string, keyId?: string): Fingerprint =>
  fingerprint(ring, 'email', email, keyId);

export const tombstoneHash = (ring: Keyring, candidateId: string, keyId?: string): Fingerprint =>
  fingerprint(ring, 'tombstone', candidateId, keyId);

// Una huella por cada clave vigente, para buscar por (key_id, hash) sin importar con cuál se
// escribió la fila (SEC-72).
export function hashesForLookup(ring: Keyring, kind: HashKind, value: string): Fingerprint[] {
  return [...ring.keys.keys()].map((keyId) => fingerprint(ring, kind, value, keyId));
}

// Regla "nunca retirar una clave con filas vivas": recibe los key_id que aún existen en las
// tablas y lanza si alguno ya no está en el anillo. T-04 la cablea al arranque con una consulta.
export function assertKeyringCoversRows(ring: Keyring, keyIdsInUse: Iterable<string>): void {
  const missing = [...new Set(keyIdsInUse)].filter((keyId) => !ring.keys.has(keyId)).sort();
  if (missing.length > 0) {
    throw new KeyringError(
      `PHONE_HASH_KEYS no incluye claves que todavía tienen filas: ${missing.join(', ')}. ` +
        'Una clave de hash solo se retira cuando no queda ninguna fila con su key_id (SEC-72).',
    );
  }
}
