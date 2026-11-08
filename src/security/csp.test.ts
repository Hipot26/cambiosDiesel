import helmet from '@fastify/helmet';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { testAppUrl } from '../../tests/helpers/db.js';
import { fakeSecretEnv } from '../../tests/helpers/secrets.js';
import { buildApp } from '../app.js';
import { parseEnv } from '../config/env.js';
import { cspDirectives, helmetOptions, TURNSTILE_ORIGIN } from './csp.js';

const env = parseEnv({
  ...fakeSecretEnv,
  APP_ENV: 'test',
  SCREENER_BASE_URL: 'http://127.0.0.1:4000',
  DATABASE_URL: testAppUrl(),
});

// Parsea "a b c; d e" → { a: ['b', 'c'], d: ['e'] }.
function parseCsp(header: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const directive of header.split(';')) {
    const [name, ...values] = directive.trim().split(/\s+/);
    if (name) out[name] = values;
  }
  return out;
}

const NONCE = /^'nonce-([0-9a-f]{32})'$/;
const nonceIn = (values: string[] = []) => values.map((v) => NONCE.exec(v)?.[1]).find(Boolean);

// Cabeceras que envía la app real (buildApp), no una instancia aparte.
async function realApp() {
  const app = await buildApp(env, { logDestination: { write: () => {} } });
  try {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    return { res, csp: parseCsp(String(res.headers['content-security-policy'])) };
  } finally {
    await app.close();
  }
}

describe('csp', () => {
  it('SEC-65 la app real envía la CSP de csp.ts', async () => {
    const { res, csp } = await realApp();
    const expected = cspDirectives('public');

    // Exactamente las directivas de csp.ts, ni una más (nada de los valores por defecto de helmet:
    // upgrade-insecure-requests, font-src, 'unsafe-inline' en style-src).
    expect(Object.keys(csp).sort()).toEqual(Object.keys(expected).sort());
    for (const [name, values] of Object.entries(expected)) {
      expect(
        csp[name]?.filter((v) => !NONCE.test(v)),
        name,
      ).toEqual(values);
    }
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp['upgrade-insecure-requests']).toBeUndefined();
    expect(csp['style-src']).not.toContain("'unsafe-inline'");
    expect(JSON.stringify(csp)).not.toContain('unsafe-inline');

    // Sitio público: Turnstile en script-src y frame-src, y nonce por petición en script-src
    // y style-src (helmet lo agrega a las dos).
    expect(csp['script-src']).toContain(TURNSTILE_ORIGIN);
    expect(csp['frame-src']).toEqual([TURNSTILE_ORIGIN]);
    const nonce = nonceIn(csp['script-src']);
    expect(nonce).toBeDefined();
    expect(nonceIn(csp['style-src'])).toBeDefined();

    // HSTS con subdominios y Referrer-Policy del sitio.
    expect(res.headers['strict-transport-security']).toContain('includeSubDomains');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

    // Dos peticiones, dos nonces.
    expect(nonceIn((await realApp()).csp['script-src'])).not.toBe(nonce);
  });

  it('helmetOptions del panel: sin Turnstile (la app del panel todavía no existe)', async () => {
    const server = Fastify();
    await server.register(helmet, helmetOptions('panel'));
    server.get('/', async () => 'ok');
    const res = await server.inject({ method: 'GET', url: '/' });
    await server.close();
    const csp = parseCsp(String(res.headers['content-security-policy']));
    expect(csp['script-src']).not.toContain(TURNSTILE_ORIGIN);
    expect(csp['frame-src']).toEqual(["'none'"]);
    expect(JSON.stringify(csp)).not.toContain('cloudflare');
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
  });

  it('las directivas puras no comparten arreglos entre apps', () => {
    const a = cspDirectives('public');
    const b = cspDirectives('panel');
    expect(a['script-src']).not.toBe(b['script-src']);
    expect(b['script-src']).toEqual(["'self'"]);
  });
});
