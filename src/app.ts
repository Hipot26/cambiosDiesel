import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from '@fastify/type-provider-zod';
import Fastify from 'fastify';
import type { DestinationStream } from 'pino';
import type { Env } from './config/env.js';
import { createDatabase, type Database } from './db/client.js';
import { createLogger } from './logging/pino.js';
import { healthRoutes } from './public-site/routes/health.js';
import { helmetOptions } from './security/csp.js';
import { errorHandler } from './security/error-handler.js';

declare module 'fastify' {
  interface FastifyInstance {
    // Conexión de la app (rol de app, SEC-67); server.ts la usa para la comprobación de SEC-72.
    database: Database;
  }
}

export interface BuildAppOptions {
  // Destino del log; las pruebas lo capturan en memoria.
  logDestination?: DestinationStream;
  // Base ya creada (las pruebas usan una inalcanzable). La app la cierra al cerrarse.
  database?: Database;
}

// Crea la app sin abrir puerto, para que las pruebas usen inject().
export async function buildApp(env: Env, options: BuildAppOptions = {}) {
  const app = Fastify({
    loggerInstance: createLogger(env.LOG_LEVEL, options.logDestination),
    // SEC-27: la IP del visitante que pone Nginx solo se acepta cuando la conexión llega desde
    // 127.0.0.1 (Nginx en el mismo servidor). Desde cualquier otra dirección, request.ip es la del
    // socket. La app nunca lee esa cabecera a mano: usa request.ip (SEC-28).
    trustProxy: '127.0.0.1',
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // SEC-71: va antes de registrar plugins y rutas, porque Fastify fija el manejador de cada ruta
  // al registrarla.
  app.setErrorHandler(errorHandler);

  // SEC-65: la CSP propia de csp.ts (nonce por petición, frame-ancestors 'none', sin
  // 'unsafe-inline' ni upgrade-insecure-requests). Por ahora la app es solo el sitio público; el
  // panel registrará helmetOptions('panel') en su propia app.
  await app.register(helmet, helmetOptions('public'));
  await app.register(cookie);

  // El 404 por defecto de Fastify escribe "Route GET:<url completa> not found" en el mensaje,
  // con la query incluida (SEC-73). El serializador req registra solo el primer segmento del path.
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'not_found' }));

  const database =
    options.database ??
    createDatabase(env.DATABASE_URL, (err) =>
      app.log.error({ err }, 'error en una conexión ociosa de la base'),
    );
  app.decorate('database', database);
  app.addHook('onClose', () => database.close());

  await app.register(healthRoutes, { ping: database.ping });

  return app;
}
