// Eventos recibidos de sistemas externos (03 §1.8).
import { check, index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { eventStatusEnum } from './enums.js';
import { bytea, id, inList, timestamptz } from './types.js';

// Los cuatro eventos del screener (03 §1.8 y §3.0, paso 3): un evento con otro nombre no pasa
// la validación de zod y nunca llega a la tabla.
export const SCREENER_EVENT_TYPES = [
  'screen.completed',
  'screen.abandoned',
  'resume.generated',
  'sms.opted_out',
] as const;

export const screenerEvents = pgTable(
  'screener_events',
  {
    id: id(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    eventType: text('event_type').notNull(),
    specVersion: text('spec_version').notNull(),
    kid: text('kid').notNull(),
    // Sin FK a propósito: puede ser un candidato borrado o desconocido (SEC-10). La cadena de
    // borrado limpia estas filas a mano (03 §1.11 grupo 2).
    djuCandidateId: uuid('dju_candidate_id'),
    // NULL en los eventos descartados y vaciado en sms.opted_out al procesar (03 §1.8).
    payload: jsonb('payload'),
    rawBody: bytea('raw_body'),
    receivedAt: timestamptz('received_at').notNull().defaultNow(),
    status: eventStatusEnum('status').notNull(),
    processedAt: timestamptz('processed_at'),
    error: text('error'),
  },
  (t) => [
    // El paso 4 de la cadena de borrado y la fusión buscan por esta columna (03 §4.7, §5.7).
    index('screener_events_dju_candidate_id_idx').on(t.djuCandidateId),
    check('screener_events_event_type_check', inList(t.eventType, SCREENER_EVENT_TYPES)),
  ],
);

// Solo webhook_id como idempotencia (03 §3.5, paso 2). Sin columna para el cuerpo: el webhook
// de Resend trae el email del destinatario y no debe sobrevivir al borrado (0003).
export const resendEvents = pgTable('resend_events', {
  webhookId: text('webhook_id').primaryKey(),
  type: text('type').notNull(),
  receivedAt: timestamptz('received_at').notNull().defaultNow(),
  processedAt: timestamptz('processed_at'),
});
