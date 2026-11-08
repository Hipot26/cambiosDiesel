// Ajustes, estado de la copia en RecruiterFlow, contadores y envíos (03 §1.10).
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { candidates } from './candidates.js';
import { staffUsers } from './staff.js';
import { createdAt, id, timestamptz } from './types.js';

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => staffUsers.id),
});

export const recruiterflowSync = pgTable('recruiterflow_sync', {
  candidateId: uuid('candidate_id')
    .primaryKey()
    .references(() => candidates.id, { onDelete: 'cascade' }),
  recruiterflowId: text('recruiterflow_id'),
  lastSyncedAt: timestamptz('last_synced_at'),
  lastPayloadHash: text('last_payload_hash'),
  consentStateSent: jsonb('consent_state_sent'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  syncedWithoutConsent: boolean('synced_without_consent').notNull().default(false),
});

// Contadores que deben sobrevivir a un despliegue (01 decisión 13).
export const rateWindows = pgTable(
  'rate_windows',
  {
    bucket: text('bucket').notNull(),
    windowStart: timestamptz('window_start').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.bucket, t.windowStart] })],
);

// template sin CHECK: 03 §1.10 nombra cuatro plantillas, pero 03 §5.8 y §6 usan una quinta
// ("tu screen está listo") sin nombre fijo. Se cierra cuando 03 la nombre.
export const emailsSent = pgTable(
  'emails_sent',
  {
    id: id(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    template: text('template').notNull(),
    resendId: text('resend_id'),
    sentAt: timestamptz('sent_at').notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    // FK hacia candidates (SEC-75) y "sin recordatorio en los últimos 14 días" (03 §5.5).
    index('emails_sent_candidate_template_idx').on(t.candidateId, t.template, t.sentAt.desc()),
  ],
);
