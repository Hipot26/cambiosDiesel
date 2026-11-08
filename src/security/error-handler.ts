// Manejador de errores de la app (SEC-71, SEC-54). Ningún cuerpo de error lleva el mensaje, el
// stack ni un valor de la entrada: el manejador por defecto de Fastify devuelve error.message, y
// ese texto puede traer datos de PostgreSQL, de un cliente externo o un trozo del JSON recibido.
// El error completo va al log, limpio por el serializador err (SEC-73).
import { STATUS_CODES } from 'node:http';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

// Lista permitida de la respuesta de error: un código fijo y, en un 400 de validación, en qué
// parte de la petición falló (lo pone Fastify, no el cliente).
export const ErrorBody = z
  .object({
    error: z.string().regex(/^[a-z_]+$/),
    in: z.enum(['body', 'querystring', 'params', 'headers']).optional(),
  })
  .strict();

export type ErrorBody = z.infer<typeof ErrorBody>;

const INTERNAL: ErrorBody = { error: 'internal' };

// 413 → payload_too_large. Sale de la tabla de Node, nunca del error.
function slugFor(status: number): string {
  const slug = (STATUS_CODES[status] ?? 'client error')
    .toLowerCase()
    .replace(/[^a-z]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'client_error';
}

// Error del cliente: el que trae statusCode 4xx, que es como Fastify y sus plugins marcan la
// validación, el JSON mal formado, el cuerpo demasiado grande o el tipo no admitido. Un cliente
// externo (Twilio, Resend, R2) tiene que envolver su error sin copiar el status de la respuesta
// remota (SEC-71); si no, un 404 remoto llegaría como 404 al visitante.
function clientStatus(error: FastifyError): number | undefined {
  // Un valor lanzado que no es objeto (throw null) también termina en 500.
  const status = (error as Partial<FastifyError> | null)?.statusCode;
  return typeof status === 'number' && status >= 400 && status <= 499 ? status : undefined;
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const status = clientStatus(error);
  if (status === undefined) {
    request.log.error({ err: error }, 'error interno');
    return reply.code(500).send(INTERNAL);
  }
  request.log.info({ err: error }, 'petición rechazada');
  const body = error?.validation
    ? { error: 'invalid_request', in: error.validationContext }
    : { error: slugFor(status) };
  // Nunca se lanza desde aquí: si este manejador fallara, Fastify respondería con su manejador
  // de respaldo, que sí devuelve el mensaje.
  const parsed = ErrorBody.safeParse(body);
  if (!parsed.success) return reply.code(500).send(INTERNAL);
  return reply.code(status).send(parsed.data);
}
