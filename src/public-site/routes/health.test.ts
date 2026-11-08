import { afterEach, describe, expect, it } from 'vitest';
import { testAppUrl } from '../../../tests/helpers/db.js';
import { fakeSecretEnv } from '../../../tests/helpers/secrets.js';
import { buildApp } from '../../app.js';
import { parseEnv } from '../../config/env.js';
import { createDatabase } from '../../db/client.js';

const env = parseEnv({
  ...fakeSecretEnv,
  APP_ENV: 'test',
  SCREENER_BASE_URL: 'http://127.0.0.1:4000',
  DATABASE_URL: testAppUrl(),
});

async function appWithCapturedLog(options: { databaseUrl?: string } = {}) {
  const lines: string[] = [];
  const app = await buildApp(env, {
    logDestination: { write: (line: string) => lines.push(line) },
    ...(options.databaseUrl ? { database: createDatabase(options.databaseUrl, () => {}) } : {}),
  });
  return { app, log: () => lines.join('') };
}

describe('GET /healthz', () => {
  let close: (() => Promise<unknown>) | undefined;
  afterEach(async () => {
    await close?.();
  });

  it('responde 200 con { status: "ok" } cuando la base responde', async () => {
    const { app } = await appWithCapturedLog();
    close = () => app.close();
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('responde 503 sin detalle cuando la base no responde, y SEC-73 sin la contraseña en el log', async () => {
    // Puerto 1: nada escucha ahí, la conexión se rechaza al instante.
    const claveFalsa = 'clave_falsa_de_prueba';
    const { app, log } = await appWithCapturedLog({
      databaseUrl: `postgres://dju_test_app:${claveFalsa}@127.0.0.1:1/dju_test`,
    });
    close = () => app.close();
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'unavailable' });
    expect(log()).toContain('la base de datos no responde');
    expect(log()).not.toContain(claveFalsa);
  });

  it('SEC-61 rechaza parámetros de query desconocidos con 400', async () => {
    const { app } = await appWithCapturedLog();
    close = () => app.close();
    const res = await app.inject({ method: 'GET', url: '/healthz?extra=1' });
    expect(res.statusCode).toBe(400);
  });

  it('SEC-73 ruta: ?token=abc no deja abc en el log', async () => {
    const { app, log } = await appWithCapturedLog();
    close = () => app.close();
    const token = 'abc-token-falso-5e2f';
    await app.inject({ method: 'GET', url: `/healthz?token=${token}` });
    const out = log();
    expect(out).toContain('incoming request'); // el log de la petición sí se escribió
    expect(out).toContain('"url":"/healthz"');
    expect(out).not.toContain(token);
  });

  it('SEC-73 ruta: un 404 no deja la query en el log', async () => {
    const { app, log } = await appWithCapturedLog();
    close = () => app.close();
    const token = 'token-404-falso-3c7d';
    const res = await app.inject({ method: 'GET', url: `/no-existe?token=${token}` });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
    expect(log()).toContain('"url":"/no-existe"');
    expect(log()).not.toContain(token);
  });

  it('SEC-73 ruta: cookie y authorization no llegan al log', async () => {
    const { app, log } = await appWithCapturedLog();
    close = () => app.close();
    await app.inject({
      method: 'GET',
      url: '/healthz',
      headers: { cookie: 'dju_cand=cookie-falsa-88aa', authorization: 'Bearer falso-77bb' },
    });
    expect(log()).not.toContain('cookie-falsa-88aa');
    expect(log()).not.toContain('falso-77bb');
  });
});
