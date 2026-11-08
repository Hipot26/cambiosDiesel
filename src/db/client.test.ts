import { describe, expect, it } from 'vitest';
import { testAppUrl } from '../../tests/helpers/db.js';
import { APPLICATION_NAME, createDatabase } from './client.js';

describe('pool de la app', () => {
  it('cada conexión del pool lleva statement_timeout de 10 s y application_name', async () => {
    const database = createDatabase(testAppUrl(), () => {});
    try {
      const timeout = await database.pool.query<{ statement_timeout: string }>(
        'show statement_timeout',
      );
      expect(timeout.rows[0]?.statement_timeout).toBe('10s');
      const name = await database.pool.query<{ application_name: string }>('show application_name');
      expect(name.rows[0]?.application_name).toBe(APPLICATION_NAME);
    } finally {
      await database.close();
    }
  });
});
