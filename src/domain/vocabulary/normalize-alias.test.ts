import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { normalizeAlias } from './normalize-alias.js';

// El archivo real del repositorio (03 §7.3). El esquema zod completo llega en T-05; aquí solo
// se usa lo necesario para la prueba.
interface VocabularyLike {
  lists: Record<string, { values: { value: string; aliases?: string[] }[] }>;
  alias_index: Record<string, Record<string, string>>;
}

const vocabulary = JSON.parse(
  await readFile(
    new URL('../../../vocabulary/dieseljobsusa_vocabulary.json', import.meta.url),
    'utf8',
  ),
) as VocabularyLike;

describe('normalizeAlias', () => {
  it('normalizeAlias contra todas las claves del alias_index real', () => {
    const lists = Object.keys(vocabulary.alias_index);
    expect(lists).toHaveLength(9);
    let claves = 0;
    for (const list of lists) {
      const index = vocabulary.alias_index[list] ?? {};
      // Toda clave ya está normalizada: la función la deja igual.
      for (const key of Object.keys(index)) {
        claves++;
        expect(normalizeAlias(key), `${list}: ${key}`).toBe(key);
      }
      // Cada value y cada alias de la lista, normalizados, existen como clave de su índice.
      for (const { value, aliases = [] } of vocabulary.lists[list]?.values ?? []) {
        for (const text of [value, ...aliases]) {
          expect(index, `${list}: ${text}`).toHaveProperty(normalizeAlias(text));
        }
      }
    }
    expect(claves).toBeGreaterThan(1000);
  });

  it.each([
    ['Cummins ISX', 'cummins isx'],
    ['6.7 Cummins', '6 7 cummins'],
    ['EC-60', 'ec 60'],
    ['  Thermo   King ', 'thermo king'],
    ['S+R', 's r'],
    ['Mercedes-Benz', 'mercedes benz'],
    ["don't have one", 'don t have one'],
    ['1910.178', '1910 178'],
    ['A/C', 'a c'],
    ['Hitachi Dr. ZX', 'hitachi dr zx'],
    ['Certified Data Centre Professional (CDCP)', 'certified data centre professional cdcp'],
    ['Sherman + Reilly', 'sherman reilly'],
    ['snap_on\tzeus', 'snap on zeus'],
    ['Señal 6', 'señal 6'],
    ['', ''],
    ['---', ''],
  ])('%j → %j', (entrada, esperado) => {
    expect(normalizeAlias(entrada)).toBe(esperado);
  });
});
