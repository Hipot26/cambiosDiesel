import { inspect } from 'node:util';
import { describe, expect, it } from 'vitest';
import { testAppUrl } from '../../tests/helpers/db.js';
import { fakeSecretEnv } from '../../tests/helpers/secrets.js';
import { buildApp } from '../app.js';
import { EnvError, parseEnv } from './env.js';

const base = {
  ...fakeSecretEnv,
  APP_ENV: 'development',
  HOST: '127.0.0.1',
  PORT: '3000',
  LOG_LEVEL: 'info',
  SCREENER_BASE_URL: 'http://127.0.0.1:4000',
  DATABASE_URL: 'postgres://dju_dev_app@127.0.0.1:5432/dju_dev',
};

const production = {
  ...base,
  APP_ENV: 'production',
  SCREENER_BASE_URL: 'https://screener.example.com',
  DATABASE_URL: 'postgres://dju_prod_app@127.0.0.1:5432/dju_production',
};

describe('env', () => {
  it('acepta una configuración local completa y aplica valores por defecto', () => {
    const env = parseEnv({
      ...fakeSecretEnv,
      APP_ENV: 'development',
      SCREENER_BASE_URL: base.SCREENER_BASE_URL,
      DATABASE_URL: base.DATABASE_URL,
    });
    expect(env.HOST).toBe('127.0.0.1');
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('SEC-61 env rechaza variables faltantes', () => {
    const { SCREENER_BASE_URL: _omitida, ...sinScreener } = base;
    expect(() => parseEnv(sinScreener)).toThrow(EnvError);
    expect(() => parseEnv(sinScreener)).toThrow(/SCREENER_BASE_URL/);
  });

  it('SEC-61 env rechaza valores con formato inválido sin mostrar el valor', () => {
    const valor = 'valor-que-no-debe-salir-9f3a';
    let mensaje = '';
    try {
      parseEnv({ ...base, PORT: valor, APP_ENV: valor });
    } catch (error) {
      mensaje = (error as Error).message;
    }
    expect(mensaje).toMatch(/PORT/);
    expect(mensaje).toMatch(/APP_ENV/);
    expect(mensaje).not.toContain(valor);
  });

  it('SEC-61 env rechaza DATABASE_URL faltante o que no es postgres', () => {
    const { DATABASE_URL: _omitida, ...sinBase } = base;
    expect(() => parseEnv(sinBase)).toThrow(/DATABASE_URL/);
    for (const url of ['mysql://u@127.0.0.1/dju_dev', 'http://127.0.0.1:5432', 'no-es-url']) {
      expect(() => parseEnv({ ...base, DATABASE_URL: url }), url).toThrow(/DATABASE_URL/);
    }
    expect(parseEnv({ ...base, DATABASE_URL: 'postgresql://u@127.0.0.1/dju_dev' })).toBeTruthy();
  });

  it('SEC-68 producción rechaza DATABASE_URL_MIGRATE en el entorno de la app', () => {
    const migrateUrl = 'postgres://dju_prod_migrate@127.0.0.1:5432/dju_production';
    for (const appEnv of ['production', 'staging']) {
      let mensaje = '';
      try {
        parseEnv({ ...production, APP_ENV: appEnv, DATABASE_URL_MIGRATE: migrateUrl });
      } catch (error) {
        mensaje = (error as Error).message;
      }
      expect(mensaje, appEnv).toMatch(/DATABASE_URL_MIGRATE/);
      expect(mensaje, appEnv).not.toContain(migrateUrl);
    }
    // En local el mismo .env trae las dos URL (npm run db:migrate).
    expect(parseEnv({ ...base, DATABASE_URL_MIGRATE: migrateUrl }).APP_ENV).toBe('development');
  });

  it('SEC-68 producción rechaza DATABASE_URL con un rol _migrate', () => {
    const url = 'postgres://dju_prod_migrate@127.0.0.1:5432/dju_production';
    expect(() => parseEnv({ ...production, DATABASE_URL: url })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...production, APP_ENV: 'staging', DATABASE_URL: url })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('SEC-77 config rechaza HOST 0.0.0.0 en producción', () => {
    expect(() => parseEnv({ ...production, HOST: '0.0.0.0' })).toThrow(/HOST/);
    expect(() => parseEnv({ ...production, HOST: '::' })).toThrow(/HOST/);
    expect(parseEnv(production).HOST).toBe('127.0.0.1');
  });

  it('SEC-77 staging exige HOST 127.0.0.1', () => {
    const staging = { ...production, APP_ENV: 'staging' };
    for (const host of ['0.0.0.0', '::', '10.0.0.5', 'localhost']) {
      expect(() => parseEnv({ ...staging, HOST: host }), host).toThrow(/HOST/);
    }
    expect(parseEnv(staging).HOST).toBe('127.0.0.1');
  });

  it('SEC-77 fuera de staging y producción se permite HOST 0.0.0.0 (pruebas en el celular por la red local)', () => {
    expect(parseEnv({ ...base, HOST: '0.0.0.0' }).HOST).toBe('0.0.0.0');
    expect(parseEnv({ ...base, APP_ENV: 'test', HOST: '0.0.0.0' }).HOST).toBe('0.0.0.0');
  });

  it('SEC-77 el screener en producción rechaza [::ffff:127.0.0.1], 10.0.0.5 y 192.168.1.20', () => {
    for (const url of [
      'https://[::ffff:127.0.0.1]:4000',
      'https://[::ffff:10.0.0.5]',
      'https://10.0.0.5',
      'https://192.168.1.20:4000',
      'https://172.16.0.1',
      'https://172.31.255.254',
      'https://169.254.169.254',
      'https://0.0.0.0',
      'https://127.1',
      'https://0x7f000001',
      'https://[::]',
      'https://[fd00::1]',
      'https://[fe80::1]',
      'https://LOCALHOST.',
    ]) {
      expect(() => parseEnv({ ...production, SCREENER_BASE_URL: url }), url).toThrow(
        /SCREENER_BASE_URL/,
      );
    }
    // Justo fuera de los rangos locales sí se admite.
    for (const url of ['https://172.32.0.1', 'https://203.0.113.10', 'https://[2001:db8::1]']) {
      expect(parseEnv({ ...production, SCREENER_BASE_URL: url }).SCREENER_BASE_URL, url).toBe(url);
    }
  });

  it('decisión 24: producción rechaza un SCREENER_BASE_URL local o http', () => {
    for (const url of [
      'http://screener.example.com',
      'https://localhost:4000',
      'https://127.0.0.1:4000',
      'https://127.10.0.1',
      'https://[::1]:4000',
      'https://fake-screener.local',
    ]) {
      expect(() => parseEnv({ ...production, SCREENER_BASE_URL: url }), url).toThrow(
        /SCREENER_BASE_URL/,
      );
    }
  });

  it('APP_ENV es obligatoria y no tiene valor por defecto', () => {
    const { APP_ENV: _omitida, ...sinAppEnv } = base;
    expect(() => parseEnv(sinAppEnv)).toThrow(/APP_ENV/);
  });

  it('candado: NODE_ENV=production con APP_ENV=development o test no arranca', () => {
    for (const appEnv of ['development', 'test']) {
      expect(() => parseEnv({ ...base, NODE_ENV: 'production', APP_ENV: appEnv }), appEnv).toThrow(
        /APP_ENV/,
      );
    }
  });

  it('candado: NODE_ENV=production con APP_ENV=staging y screener falso arranca', async () => {
    const env = parseEnv({
      ...base,
      NODE_ENV: 'production',
      APP_ENV: 'staging',
      DATABASE_URL: testAppUrl(),
    });
    expect(env.APP_ENV).toBe('staging');
    expect(env.SCREENER_BASE_URL).toBe('http://127.0.0.1:4000');
    const app = await buildApp(env, { logDestination: { write: () => {} } });
    try {
      const res = await app.inject({ method: 'GET', url: '/healthz' });
      expect(res.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it('SEC-71 el objeto env no se serializa', () => {
    const env = parseEnv(production);
    expect(JSON.stringify({ env })).toBe('{"env":"[env]"}');
    expect(inspect(env)).toBe('[env]');
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('SEC-61 .env sin SCREENER_IN_SECRETS → el arranque lanza', () => {
    for (const variable of [
      'SCREENER_IN_SECRETS',
      'SCREENER_OUT_SECRET',
      'PHONE_HASH_KEYS',
      'PHONE_HASH_ACTIVE',
    ] as const) {
      const { [variable]: _omitida, ...sin } = base;
      expect(() => parseEnv(sin), variable).toThrow(EnvError);
      expect(() => parseEnv(sin), variable).toThrow(new RegExp(variable));
    }
  });

  it('SEC-06 y SEC-72 los secretos del .env se parsean a mapas por id y el error no muestra el valor', () => {
    const env = parseEnv(base);
    expect([...env.SCREENER_IN_SECRETS.keys()]).toEqual(['k1', 'k2']);
    expect([...env.SCREENER_OUT_SECRET.keys()]).toEqual(['s1']);
    expect([...env.PHONE_HASH_KEYS.keys()]).toEqual(['v1', 'v2']);
    expect(env.PHONE_HASH_ACTIVE).toBe('v2');
    expect(Buffer.isBuffer(env.PHONE_HASH_KEYS.get('v1'))).toBe(true);

    const corto = 'secreto-corto-9f3a';
    let mensaje = '';
    try {
      parseEnv({ ...base, SCREENER_IN_SECRETS: `k1:${corto}` });
    } catch (error) {
      mensaje = (error as Error).message;
    }
    expect(mensaje).toMatch(/SCREENER_IN_SECRETS/);
    expect(mensaje).toMatch(/32 bytes/);
    expect(mensaje).not.toContain(corto);
  });

  it('SEC-72 PHONE_HASH_ACTIVE tiene que existir en PHONE_HASH_KEYS y los ids son v<n>', () => {
    expect(() => parseEnv({ ...base, PHONE_HASH_ACTIVE: 'v3' })).toThrow(/PHONE_HASH_ACTIVE/);
    expect(() => parseEnv({ ...base, PHONE_HASH_ACTIVE: 'k1' })).toThrow(/PHONE_HASH_ACTIVE/);
    const k1 = fakeSecretEnv.PHONE_HASH_KEYS.replace('v1:', 'k1:');
    expect(() => parseEnv({ ...base, PHONE_HASH_KEYS: k1 })).toThrow(/PHONE_HASH_KEYS/);
  });

  it('SEC-15 SCREENER_OUT_SECRET es exactamente uno y distinto de los de entrada', () => {
    const [k1] = fakeSecretEnv.SCREENER_IN_SECRETS.split(',');
    expect(() => parseEnv({ ...base, SCREENER_OUT_SECRET: k1 })).toThrow(/SCREENER_OUT_SECRET/);
    expect(() =>
      parseEnv({
        ...base,
        SCREENER_OUT_SECRET: `${fakeSecretEnv.SCREENER_OUT_SECRET},s2:${'x'.repeat(40)}`,
      }),
    ).toThrow(/SCREENER_OUT_SECRET/);
    // Mismo kid con otro secreto sí se admite: los kid son por dirección.
    const mismoKid = `k1:${'salida-con-kid-k1-de-prueba-'.padEnd(43, '1')}`;
    expect([
      ...parseEnv({ ...base, SCREENER_OUT_SECRET: mismoKid }).SCREENER_OUT_SECRET.keys(),
    ]).toEqual(['k1']);
  });

  it('SEC-15 el mismo secreto con kid distinto en los dos sentidos se rechaza', () => {
    // Cada secreto de entrada, puesto como secreto de salida con el kid s1.
    for (const entrada of fakeSecretEnv.SCREENER_IN_SECRETS.split(',')) {
      const secreto = entrada.slice(entrada.indexOf(':') + 1);
      let mensaje = '';
      try {
        parseEnv({ ...base, SCREENER_OUT_SECRET: `s1:${secreto}` });
      } catch (error) {
        mensaje = (error as Error).message;
      }
      expect(mensaje, entrada).toMatch(/SCREENER_OUT_SECRET/);
      expect(mensaje, entrada).not.toContain(secreto);
    }
    // Y al revés: el secreto de salida metido como segundo secreto de entrada con otro kid.
    const salida = fakeSecretEnv.SCREENER_OUT_SECRET.slice(
      fakeSecretEnv.SCREENER_OUT_SECRET.indexOf(':') + 1,
    );
    const [k1] = fakeSecretEnv.SCREENER_IN_SECRETS.split(',');
    expect(() => parseEnv({ ...base, SCREENER_IN_SECRETS: `${k1},k9:${salida}` })).toThrow(
      /SCREENER_OUT_SECRET/,
    );
  });
});
