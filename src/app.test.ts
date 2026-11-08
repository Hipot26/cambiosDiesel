import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fakeSecretEnv } from '../tests/helpers/secrets.js';
import { buildApp } from './app.js';
import { type Env, parseEnv } from './config/env.js';
import { createReturnToken } from './security/tokens.js';

// Valores inventados y fáciles de buscar en la salida.
const EMAIL = 'marcus-falso@example.com';
const PHONE = '+15550100199';

// Producción de verdad (parseEnv con APP_ENV=production). La base apunta al puerto 1: estas
// pruebas no la consultan, y el pool no abre conexiones hasta la primera consulta.
const production = parseEnv({
  ...fakeSecretEnv,
  APP_ENV: 'production',
  NODE_ENV: 'production',
  SCREENER_BASE_URL: 'https://screener.example.com',
  DATABASE_URL: 'postgres://dju_prod_app@127.0.0.1:1/dju_production',
});

async function appWithCapturedLog(env: Env = production) {
  const lines: string[] = [];
  const app = await buildApp(env, {
    logDestination: { write: (line: string) => lines.push(line) },
  });
  return { app, log: () => lines.join('') };
}

describe('app', () => {
  let close: (() => Promise<unknown>) | undefined;
  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it('SEC-71 un 500 en producción responde { error: "internal" } sin message ni stack', async () => {
    const { app, log } = await appWithCapturedLog();
    close = () => app.close();
    app.get('/prueba/falla', async () => {
      throw new Error(`falló al procesar ${EMAIL} ${PHONE}`);
    });

    const res = await app.inject({ method: 'GET', url: '/prueba/falla' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'internal' });
    for (const prohibido of [EMAIL, PHONE, 'message', 'stack', 'falló al procesar']) {
      expect(res.body).not.toContain(prohibido);
    }
    // El error sí se registra, pero limpio.
    const out = log();
    expect(out).toContain('error interno');
    expect(out).toContain('falló al procesar');
    expect(out).not.toContain(EMAIL);
    expect(out).not.toContain(PHONE);
  });

  it('SEC-71 un 4xx no repite valores de la entrada', async () => {
    const { app, log } = await appWithCapturedLog();
    close = () => app.close();
    app.post(
      '/prueba/eco',
      { schema: { body: z.object({ trade: z.string() }).strict() } },
      async () => ({ ok: true }),
    );

    // 400 de validación: una clave desconocida con un email por nombre.
    const invalido = await app.inject({
      method: 'GET',
      url: `/healthz?${encodeURIComponent(EMAIL)}=1`,
    });
    expect(invalido.statusCode).toBe(400);
    expect(invalido.json()).toEqual({ error: 'invalid_request', in: 'querystring' });

    // 400 de validación del cuerpo con el valor en un campo que no existe.
    const cuerpo = await app.inject({
      method: 'POST',
      url: '/prueba/eco',
      payload: { email: EMAIL },
    });
    expect(cuerpo.statusCode).toBe(400);
    expect(cuerpo.json()).toEqual({ error: 'invalid_request', in: 'body' });

    // JSON mal formado: el mensaje de JSON.parse repetiría un trozo del cuerpo.
    const roto = await app.inject({
      method: 'POST',
      url: '/prueba/eco',
      headers: { 'content-type': 'application/json' },
      payload: `{"trade":"${PHONE}`,
    });
    expect(roto.statusCode).toBe(400);
    expect(roto.json()).toEqual({ error: 'bad_request' });

    // Tipo de contenido no admitido.
    const tipo = await app.inject({
      method: 'POST',
      url: '/prueba/eco',
      headers: { 'content-type': 'text/csv' },
      payload: EMAIL,
    });
    expect(tipo.statusCode).toBe(415);
    expect(tipo.json()).toEqual({ error: 'unsupported_media_type' });

    for (const res of [invalido, cuerpo, roto, tipo]) {
      expect(res.body).not.toContain(EMAIL);
      expect(res.body).not.toContain(PHONE);
    }
    expect(log()).toContain('petición rechazada');
    expect(log()).not.toContain(EMAIL);
    expect(log()).not.toContain(PHONE);
  });

  it('SEC-27 request.ip toma x-forwarded-for solo cuando llega desde 127.0.0.1', async () => {
    // SEC-28 prohíbe leer esta cabecera en el código de la app. Aquí solo se envía como cliente
    // para comprobar trustProxy; el grep planeado en T-23 excluye tests/ y *.test.ts.
    const { app } = await appWithCapturedLog();
    close = () => app.close();
    app.get('/prueba/ip', async (request) => ({ ip: request.ip }));

    const desdeNginx = await app.inject({
      method: 'GET',
      url: '/prueba/ip',
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.9' },
    });
    expect(desdeNginx.json()).toEqual({ ip: '203.0.113.9' });

    const desdeOtraIp = await app.inject({
      method: 'GET',
      url: '/prueba/ip',
      remoteAddress: '10.0.0.5',
      headers: { 'x-forwarded-for': '203.0.113.9' },
    });
    expect(desdeOtraIp.json()).toEqual({ ip: '10.0.0.5' });

    // La forma de 02 (SEC-27): la cabecera enviada desde afuera se ignora.
    const desdeAfuera = await app.inject({
      method: 'GET',
      url: '/prueba/ip',
      remoteAddress: '203.0.113.9',
      headers: { 'x-forwarded-for': '198.51.100.1' },
    });
    expect(desdeAfuera.json()).toEqual({ ip: '203.0.113.9' });
  });

  it('SEC-73 un 404 con un token en el path no escribe el token', async () => {
    const { app, log } = await appWithCapturedLog();
    close = () => app.close();
    const { token } = createReturnToken();

    const res = await app.inject({ method: 'GET', url: `/r/${token}` });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
    // Con un token en el primer segmento lo tapa la limpieza por valor.
    await app.inject({ method: 'POST', url: `/${token}/confirm` });

    const out = log();
    expect(out).toContain('"url":"/r/*"');
    expect(out).not.toContain(token);
  });
});
