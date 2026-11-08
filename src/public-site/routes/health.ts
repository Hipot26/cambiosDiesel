import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';

export interface HealthOptions {
  // Consulta mínima a la base (select 1).
  ping: () => Promise<void>;
}

// GET /healthz: Nginx lo consulta por 127.0.0.1 y no lo expone por el túnel (SEC-77).
// 200 si la base responde (03 §2.1); 503 si no, sin detalle del error en la respuesta.
export const healthRoutes: FastifyPluginAsyncZod<HealthOptions> = async (app, { ping }) => {
  app.get(
    '/healthz',
    {
      schema: {
        querystring: z.object({}).strict(),
        response: {
          200: z.object({ status: z.literal('ok') }).strict(),
          503: z.object({ status: z.literal('unavailable') }).strict(),
        },
      },
    },
    async (request, reply) => {
      try {
        await ping();
        return { status: 'ok' as const };
      } catch (err) {
        // El error de pg no trae la contraseña; el serializador err lo limpia igual (SEC-73).
        request.log.warn({ err }, 'la base de datos no responde');
        return reply.code(503).send({ status: 'unavailable' as const });
      }
    },
  );
};
