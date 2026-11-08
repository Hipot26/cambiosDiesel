import { BlockList, isIP } from 'node:net';
import { inspect } from 'node:util';
import { z } from 'zod';
import { KID_PATTERN, SIGNING_SECRET_MIN_BYTES } from '../security/hmac.js';
import {
  KeyedSecretsError,
  type KeyedSecretsOptions,
  parseKeyedSecrets,
} from '../security/keyed-secrets.js';
import { HASH_KEY_ID_PATTERN, HASH_KEY_MIN_BYTES } from '../security/keyring.js';

// "id:secreto,id:secreto" → Map. El objeto env no conserva el texto crudo (SEC-71); el mensaje de
// error nombra la posición y la regla, nunca el valor.
function keyedSecrets(options: KeyedSecretsOptions) {
  return z.string().transform((raw, ctx) => {
    try {
      return parseKeyedSecrets(raw, options);
    } catch (error) {
      if (!(error instanceof KeyedSecretsError)) throw error;
      ctx.addIssue({ code: 'custom', message: error.message });
      return z.NEVER;
    }
  });
}

// Redes donde solo puede vivir el screener falso (01 decisión 24): loopback, "esta red" (0.0.0.0),
// privadas y link-local, en IPv4 e IPv6. BlockList también reconoce el IPv4 mapeado en IPv6
// (::ffff:127.0.0.1, que new URL() normaliza a ::ffff:7f00:1).
const LOCAL_NETWORKS = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['127.0.0.0', 8],
  ['10.0.0.0', 8],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['169.254.0.0', 16],
] as const) {
  LOCAL_NETWORKS.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
] as const) {
  LOCAL_NETWORKS.addSubnet(network, prefix, 'ipv6');
}

// Recibe el hostname tal como lo deja new URL(): en minúsculas, la IPv4 normalizada
// (127.1 → 127.0.0.1, 0x7f000001 → 127.0.0.1) y la IPv6 entre corchetes.
function isLocalHost(hostname: string): boolean {
  const h = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  const family = isIP(h);
  if (family === 0) return false;
  return LOCAL_NETWORKS.check(h, family === 4 ? 'ipv4' : 'ipv6');
}

const EnvSchema = z
  .object({
    // Obligatoria y sin valor por defecto: dice en qué entorno corre la app (01 §5).
    APP_ENV: z.enum(['development', 'test', 'staging', 'production']),
    NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    SCREENER_BASE_URL: z.url({ protocol: /^https?$/ }),
    // Rol de la app (SEC-67). El de migración solo lo leen los scripts de migración.
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    DATABASE_URL_MIGRATE: z.string().optional(),
    // Secretos de firma screener→sitio: uno o dos, cada uno con su kid (SEC-06).
    SCREENER_IN_SECRETS: keyedSecrets({
      idPattern: KID_PATTERN,
      minBytes: SIGNING_SECRET_MIN_BYTES,
    }),
    // Secreto de firma sitio→screener: exactamente uno (SEC-15); nunca igual a uno de entrada.
    SCREENER_OUT_SECRET: keyedSecrets({
      idPattern: KID_PATTERN,
      minBytes: SIGNING_SECRET_MIN_BYTES,
      maxEntries: 1,
    }),
    // Anillo de claves de huellas (SEC-72): las viejas se conservan mientras tengan filas.
    PHONE_HASH_KEYS: keyedSecrets({
      idPattern: HASH_KEY_ID_PATTERN,
      minBytes: HASH_KEY_MIN_BYTES,
    }),
    PHONE_HASH_ACTIVE: z.string().regex(HASH_KEY_ID_PATTERN, 'se espera v1, v2, …'),
  })
  .superRefine((env, ctx) => {
    // SEC-72: la clave activa tiene que existir en el anillo.
    if (env.PHONE_HASH_KEYS instanceof Map && !env.PHONE_HASH_KEYS.has(env.PHONE_HASH_ACTIVE)) {
      ctx.addIssue({
        code: 'custom',
        path: ['PHONE_HASH_ACTIVE'],
        message: 'tiene que ser uno de los ids de PHONE_HASH_KEYS',
      });
    }
    // SEC-15: los dos sentidos nunca comparten secreto, tenga cada uno el kid que tenga.
    if (env.SCREENER_IN_SECRETS instanceof Map && env.SCREENER_OUT_SECRET instanceof Map) {
      const inbound = [...env.SCREENER_IN_SECRETS.values()];
      for (const secret of env.SCREENER_OUT_SECRET.values()) {
        if (inbound.some((candidate) => candidate.equals(secret))) {
          ctx.addIssue({
            code: 'custom',
            path: ['SCREENER_OUT_SECRET'],
            message: 'no puede repetir ningún secreto de SCREENER_IN_SECRETS, con ningún kid',
          });
        }
      }
    }
    // Candado: un proceso con NODE_ENV=production solo puede ser staging o producción.
    if (
      env.NODE_ENV === 'production' &&
      env.APP_ENV !== 'staging' &&
      env.APP_ENV !== 'production'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_ENV'],
        message: 'con NODE_ENV=production solo puede ser staging o production',
      });
    }
    if (env.APP_ENV === 'staging' || env.APP_ENV === 'production') {
      // SEC-68: en el servidor la app no conoce la contraseña del rol de migración.
      if (env.DATABASE_URL_MIGRATE !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['DATABASE_URL_MIGRATE'],
          message: 'no puede estar en el entorno de la app; solo en el paso de despliegue',
        });
      }
      if (new URL(env.DATABASE_URL).username.endsWith('_migrate')) {
        ctx.addIssue({
          code: 'custom',
          path: ['DATABASE_URL'],
          message: 'tiene que usar el rol de app, no el de migración',
        });
      }
      // SEC-77: en el servidor Node solo escucha en 127.0.0.1. Staging vive en el mismo droplet
      // que producción (01 decisión 32), así que la regla vale para los dos.
      if (env.HOST !== '127.0.0.1') {
        ctx.addIssue({
          code: 'custom',
          path: ['HOST'],
          message: 'en staging y producción tiene que ser 127.0.0.1',
        });
      }
    }
    if (env.APP_ENV !== 'production') return;
    // 01 decisión 24: producción se niega a arrancar si apunta al screener falso.
    const url = new URL(env.SCREENER_BASE_URL);
    if (url.protocol !== 'https:' || isLocalHost(url.hostname)) {
      ctx.addIssue({
        code: 'custom',
        path: ['SCREENER_BASE_URL'],
        message: 'en producción tiene que ser https y no puede apuntar a un host local',
      });
    }
  });

export type Env = Readonly<z.infer<typeof EnvSchema>>;

// El mensaje solo nombra variables y reglas; los mensajes de zod no incluyen el valor recibido.
export class EnvError extends Error {
  override name = 'EnvError';
}

// SEC-61 y SEC-70: la app no arranca si falta una variable o no cumple su regla.
// El objeto resultante no se serializa (SEC-71): JSON.stringify e inspect devuelven un marcador.
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new EnvError(`Configuración de entorno inválida:\n${z.prettifyError(result.error)}`);
  }
  const env = { ...result.data };
  Object.defineProperties(env, {
    toJSON: { value: () => '[env]', enumerable: false },
    [inspect.custom]: { value: () => '[env]', enumerable: false },
  });
  return Object.freeze(env);
}
