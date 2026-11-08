// Lectura del vocabulario controlado. Los valores nunca se escriben a mano:
// todo oficio y equipo de los datos inventados sale de este archivo.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface VocabularyValue {
  value: string;
  group: string;
  aliases: string[];
}

interface VocabularyList {
  label: string;
  count: number;
  groups?: string[];
  values: VocabularyValue[];
}

interface VocabularyFile {
  name: string;
  version: string;
  lists: Record<string, VocabularyList>;
}

const file = join(import.meta.dirname, '..', '..', 'vocabulary', 'dieseljobsusa_vocabulary.json');

export const vocabulary = JSON.parse(readFileSync(file, 'utf8')) as VocabularyFile;

function list(name: string): VocabularyList {
  const found = vocabulary.lists[name];
  if (!found) throw new Error(`El vocabulario no tiene la lista "${name}"`);
  return found;
}

export const tradeList = list('trade');
export const equipmentList = list('equipment');

export const tradeValues: ReadonlySet<string> = new Set(tradeList.values.map((v) => v.value));
export const equipmentValues: ReadonlySet<string> = new Set(
  equipmentList.values.map((v) => v.value),
);

// Grupos de la lista Trade con sus valores, para el desplegable de oficio
// (39 valores en 12 grupos, 01_arquitectura.md §1 "Registro").
export function tradesByGroup(): ReadonlyMap<string, string[]> {
  const byGroup = new Map<string, string[]>();
  for (const { value, group } of tradeList.values) {
    const entries = byGroup.get(group) ?? [];
    entries.push(value);
    byGroup.set(group, entries);
  }
  return byGroup;
}
