import { describe, expect, it } from 'vitest';
import { assertResettableDatabase, assertResettableEnv } from '../../scripts/lib/db-reset.js';

describe('db-reset', () => {
  it('db-reset se niega fuera de development y test', () => {
    for (const appEnv of ['staging', 'production', undefined, '', 'Development']) {
      expect(() => assertResettableEnv(appEnv), String(appEnv)).toThrow(/APP_ENV/);
    }
    expect(() => assertResettableEnv('development')).not.toThrow();
    expect(() => assertResettableEnv('test')).not.toThrow();
  });

  it('db-reset se niega con una base que no es dju_dev ni dju_test', () => {
    for (const database of ['dju_production', 'dju_staging', 'postgres', 'dju_dev2']) {
      expect(() => assertResettableDatabase(database), database).toThrow(/dju_dev o dju_test/);
    }
    expect(() => assertResettableDatabase('dju_dev')).not.toThrow();
    expect(() => assertResettableDatabase('dju_test')).not.toThrow();
  });
});
