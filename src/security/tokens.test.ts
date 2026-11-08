import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  createReturnToken,
  hashReturnToken,
  TOKEN_PURPOSES,
  TOKEN_TTL_SECONDS,
  type TokenPurpose,
  tokenExpiresAt,
} from './tokens.js';

describe('tokens', () => {
  it('SEC-49 token no se guarda en claro', () => {
    const { token, tokenHash } = createReturnToken();
    // 32 bytes aleatorios en base64url: 43 caracteres sin relleno.
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    // Lo que va a la base es el SHA-256 del token, no el token.
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    // El mismo token siempre da el mismo hash (búsqueda por token_hash); dos tokens difieren.
    expect(hashReturnToken(token)).toBe(tokenHash);
    const otro = createReturnToken();
    expect(otro.token).not.toBe(token);
    expect(otro.tokenHash).not.toBe(tokenHash);
  });

  it('hashReturnToken rechaza lo que no tiene la forma de un token nuestro', () => {
    for (const malo of [
      '',
      'abc',
      'a'.repeat(42),
      'a'.repeat(44),
      `${'a'.repeat(42)}=`,
      'a'.repeat(43).replace('a', '/'),
      42,
      null,
      undefined,
      ['a'.repeat(43)],
    ]) {
      expect(hashReturnToken(malo), String(malo)).toBeNull();
    }
    expect(hashReturnToken('a'.repeat(43))).toMatch(/^[0-9a-f]{64}$/);
  });

  it('SEC-49 cada propósito tiene vigencia y ninguna vigencia sobra', () => {
    for (const purpose of TOKEN_PURPOSES) {
      const ttl = TOKEN_TTL_SECONDS[purpose];
      expect(Number.isInteger(ttl) && ttl > 0, purpose).toBe(true);
      expect(tokenExpiresAt(purpose).getTime(), purpose).toBeGreaterThan(Date.now());
    }
    expect(Object.keys(TOKEN_TTL_SECONDS).sort()).toEqual([...TOKEN_PURPOSES].sort());
  });

  it('SEC-49 vence cuando fijan 02 SEC-49 y 03 §1.9', () => {
    const ahora = new Date('2026-10-29T12:00:00Z');
    const vence = (purpose: TokenPurpose) => tokenExpiresAt(purpose, ahora).toISOString();
    // 02 SEC-49 y 03 §1.9: "vuelve y termina", 72 h.
    expect(vence('return')).toBe('2026-11-01T12:00:00.000Z');
    // 02 SEC-49 y 03 §1.9: verificación de email, 1 h y un solo uso.
    expect(vence('email_verify')).toBe('2026-10-29T13:00:00.000Z');
    // 03 §1.9: confirmación de borrado, 1 h y un solo uso.
    expect(vence('delete_confirm')).toBe('2026-10-29T13:00:00.000Z');
    // 03 §1.9: baja de email, 1 año (365 días).
    expect(vence('unsubscribe')).toBe('2027-10-29T12:00:00.000Z');
  });
});
