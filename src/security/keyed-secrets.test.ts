import { describe, expect, it } from 'vitest';
import { KeyedSecretsError, parseKeyedSecrets } from './keyed-secrets.js';

// Valores inventados y fáciles de buscar en un mensaje de error.
const S1 = 'secreto-de-prueba-uno-7c1e-'.padEnd(40, 'x');
const S2 = 'secreto-de-prueba-dos-41ab-'.padEnd(40, 'y');
const options = { idPattern: /^[A-Za-z0-9_-]{1,32}$/, minBytes: 32 };

function errorMessage(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return (error as Error).message;
  }
  return '';
}

describe('parseKeyedSecrets', () => {
  it('separa entradas por "," y cada una por la primera ":"', () => {
    const secrets = parseKeyedSecrets(`k1:${S1},k2:${S2}`, options);
    expect([...secrets.keys()]).toEqual(['k1', 'k2']);
    expect(secrets.get('k1')?.toString('utf8')).toBe(S1);
    expect(secrets.get('k2')?.toString('utf8')).toBe(S2);
  });

  it('el secreto puede contener ":" (texto opaco)', () => {
    const conDosPuntos = `a:b:${S1}`;
    const secrets = parseKeyedSecrets(`k1:${conDosPuntos}`, options);
    expect(secrets.get('k1')?.toString('utf8')).toBe(conDosPuntos);
  });

  it('rechaza un secreto de menos de 32 bytes sin mostrarlo', () => {
    const corto = 'corto-7c1e-'.padEnd(31, 'z');
    const mensaje = errorMessage(() => parseKeyedSecrets(`k1:${corto}`, options));
    expect(mensaje).toMatch(/32 bytes/);
    expect(mensaje).not.toContain(corto);
    expect(() => parseKeyedSecrets(`k1:${'z'.repeat(32)}`, options)).not.toThrow();
  });

  it('rechaza id repetido, id inválido, entrada sin ":" y texto vacío, sin mostrar secretos', () => {
    for (const raw of [`k1:${S1},k1:${S2}`, `k 1:${S1}`, `${S1}`, '', '   ', `k1:${S1},`]) {
      const mensaje = errorMessage(() => parseKeyedSecrets(raw, options));
      expect(mensaje, raw).not.toBe('');
      expect(mensaje, raw).not.toContain(S1);
      expect(mensaje, raw).not.toContain(S2);
      expect(() => parseKeyedSecrets(raw, options), raw).toThrow(KeyedSecretsError);
    }
  });

  it('respeta el máximo de entradas', () => {
    expect(() => parseKeyedSecrets(`k1:${S1},k2:${S2}`, { ...options, maxEntries: 1 })).toThrow(
      /máximo 1/,
    );
    expect(parseKeyedSecrets(`k1:${S1}`, { ...options, maxEntries: 1 }).size).toBe(1);
  });

  it('aplica el patrón del id', () => {
    const hashOptions = { idPattern: /^v[1-9][0-9]{0,2}$/, minBytes: 32 };
    expect(parseKeyedSecrets(`v1:${S1},v12:${S2}`, hashOptions).size).toBe(2);
    for (const id of ['k1', 'v0', 'v', 'v1000', 'V1']) {
      expect(() => parseKeyedSecrets(`${id}:${S1}`, hashOptions), id).toThrow(/entrada 1/);
    }
  });
});
