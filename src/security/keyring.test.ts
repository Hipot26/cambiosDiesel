import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  assertKeyringCoversRows,
  createKeyring,
  emailHash,
  hashesForLookup,
  type Keyring,
  KeyringError,
  phoneHash,
  tombstoneHash,
} from './keyring.js';

// Claves inventadas (≥ 32 bytes).
const V1 = Buffer.from('clave-de-huellas-v1-de-prueba-00000000000', 'utf8');
const V2 = Buffer.from('clave-de-huellas-v2-de-prueba-11111111111', 'utf8');
const PHONE = '+15550100123';
const EMAIL = 'tecnico@example.com';
const UUID = '019a1b2c-3d4e-7f80-9a1b-2c3d4e5f6a7b';
const HEX64 = /^[0-9a-f]{64}$/;

const ringV1 = (): Keyring => createKeyring(new Map([['v1', V1]]), 'v1');
const ringV1V2 = (active = 'v2'): Keyring =>
  createKeyring(
    new Map([
      ['v1', V1],
      ['v2', V2],
    ]),
    active,
  );

describe('keyring', () => {
  it('SEC-72 hash con dos claves y arranque falla si falta una clave con filas', () => {
    // Una fila escrita con v1 cuando v1 era la activa.
    const guardado = phoneHash(ringV1(), PHONE);
    expect(guardado.keyId).toBe('v1');
    expect(guardado.hash).toMatch(HEX64);

    // Tras activar v2 las filas nuevas llevan v2, y la vieja se sigue encontrando por (key_id, hash).
    const ring = ringV1V2();
    expect(phoneHash(ring, PHONE).keyId).toBe('v2');
    const candidatos = hashesForLookup(ring, 'phone', PHONE);
    expect(candidatos.map((c) => c.keyId)).toEqual(['v1', 'v2']);
    expect(candidatos).toContainEqual(guardado);
    expect(phoneHash(ring, PHONE, 'v1')).toEqual(guardado);

    // Quitar v1 del .env con filas v1 presentes → el arranque falla con mensaje claro.
    const soloV2 = createKeyring(new Map([['v2', V2]]), 'v2');
    expect(() => assertKeyringCoversRows(soloV2, ['v2', 'v1', 'v1'])).toThrow(KeyringError);
    expect(() => assertKeyringCoversRows(soloV2, ['v1'])).toThrow(/v1/);
    expect(() => assertKeyringCoversRows(soloV2, ['v2'])).not.toThrow();
    expect(() => assertKeyringCoversRows(soloV2, [])).not.toThrow();
    expect(() => assertKeyringCoversRows(ring, ['v1', 'v2'])).not.toThrow();

    // La clave activa tiene que existir; el anillo no puede estar vacío; ids con formato fijo.
    expect(() => ringV1V2('v3')).toThrow(/activa/);
    expect(() => createKeyring(new Map(), 'v1')).toThrow(KeyringError);
    expect(() => createKeyring(new Map([['k1', V1]]), 'k1')).toThrow(/key_id/);
    expect(() => phoneHash(ring, PHONE, 'v9')).toThrow(/key_id/);
  });

  it('SEC-72 separación por uso: la misma entrada da huellas distintas por propósito', () => {
    const ring = ringV1();
    const valor = '+15550100123';
    const deTelefono = phoneHash(ring, valor).hash;
    // No hay un texto que acepten las tres validaciones, así que se comprueba el prefijo de cada
    // uso contra el HMAC calculado a mano, y que sin prefijo la huella es otra.
    const sinPrefijo = createHmac('sha256', V1).update(valor).digest('hex');
    expect(deTelefono).not.toBe(sinPrefijo);
    expect(deTelefono).toBe(createHmac('sha256', V1).update(`phone:${valor}`).digest('hex'));
    expect(emailHash(ring, EMAIL).hash).toBe(
      createHmac('sha256', V1).update(`email:${EMAIL}`).digest('hex'),
    );
    expect(tombstoneHash(ring, UUID).hash).toBe(
      createHmac('sha256', V1).update(`tombstone:${UUID}`).digest('hex'),
    );
    // Claves distintas, huellas distintas.
    expect(phoneHash(ringV1V2(), PHONE).hash).not.toBe(deTelefono);
  });

  it('normaliza la entrada antes del hash y rechaza formas inválidas sin mostrar el valor', () => {
    const ring = ringV1();
    expect(emailHash(ring, '  Tecnico@Example.COM ')).toEqual(emailHash(ring, EMAIL));
    expect(tombstoneHash(ring, UUID.toUpperCase())).toEqual(tombstoneHash(ring, UUID));
    // Determinismo.
    expect(phoneHash(ring, PHONE)).toEqual(phoneHash(ring, PHONE));

    const invalidos: [typeof phoneHash, string][] = [
      [phoneHash, '5550100123'],
      [phoneHash, '+1 555 010 0123'],
      [phoneHash, '+0155501001'],
      [phoneHash, ''],
      [emailHash, 'sin-arroba.example.com'],
      [emailHash, 'con espacio@example.com'],
      [emailHash, ''],
      [tombstoneHash, 'no-es-uuid'],
      [tombstoneHash, '12345'],
    ];
    for (const [fn, valor] of invalidos) {
      let mensaje = '';
      try {
        fn(ring, valor);
      } catch (error) {
        mensaje = (error as Error).message;
      }
      expect(mensaje, valor).not.toBe('');
      if (valor !== '') expect(mensaje, valor).not.toContain(valor);
    }
  });
});
