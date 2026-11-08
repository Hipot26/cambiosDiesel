// Consentimientos, visibilidad y supresiones (03 §1.4). consent_events y visibility_events son
// de solo inserción para el rol de app (0002_permisos; SEC-67). phone_suppression, tombstones y
// email_suppression no guardan ninguna referencia al candidato: sobreviven al borrado (SEC-75); el
// rol de app no las borra ni las edita, salvo last_seen_at de phone_suppression (0004; SEC-10,
// SEC-12, SEC-67).
import { check, index, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { candidates } from './candidates.js';
import { consentActionEnum, consentKindEnum, visibilityEnum } from './enums.js';
import { screenerEvents } from './events.js';
import { staffUsers } from './staff.js';
import { createdAt, id, inList, timestamptz } from './types.js';

// Desde dónde llegó cada evento de consentimiento (03 §1.4).
export const CONSENT_SOURCES = [
  'signup',
  'late_capture',
  'profile',
  'staff',
  'screener_webhook',
  'unsubscribe_link',
] as const;
// Quién cambió la visibilidad (03 §1.4); 'candidate' y 'application' llegan en el Sprint 2.
export const VISIBILITY_SOURCES = ['signup_default', 'candidate', 'staff', 'application'] as const;
export const PHONE_SUPPRESSION_REASONS = ['sms_stop', 'deleted'] as const;
export const EMAIL_SUPPRESSION_REASONS = ['bounced', 'complained'] as const;

export const consentEvents = pgTable(
  'consent_events',
  {
    id: id(),
    // NULL solo en sms_opted_out sin registro con ese teléfono (SEC-12).
    candidateId: uuid('candidate_id').references(() => candidates.id, { onDelete: 'cascade' }),
    kind: consentKindEnum('kind').notNull(),
    action: consentActionEnum('action').notNull(),
    wordingText: text('wording_text').notNull(),
    wordingVersion: text('wording_version').notNull(),
    source: text('source').notNull(),
    screenerEventId: uuid('screener_event_id').references(() => screenerEvents.id, {
      onDelete: 'set null',
    }),
    occurredAt: timestamptz('occurred_at').notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    // FK hacia candidates (SEC-75) y la "vista actual": último evento por (candidate_id, kind).
    index('consent_events_candidate_kind_idx').on(t.candidateId, t.kind, t.occurredAt.desc()),
    check('consent_events_source_check', inList(t.source, CONSENT_SOURCES)),
  ],
);

export const visibilityEvents = pgTable(
  'visibility_events',
  {
    id: id(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    fromState: visibilityEnum('from_state').notNull(),
    toState: visibilityEnum('to_state').notNull(),
    source: text('source').notNull(),
    staffUserId: uuid('staff_user_id').references(() => staffUsers.id),
    occurredAt: timestamptz('occurred_at').notNull().defaultNow(),
  },
  (t) => [
    index('visibility_events_candidate_id_idx').on(t.candidateId),
    check('visibility_events_source_check', inList(t.source, VISIBILITY_SOURCES)),
  ],
);

export const phoneSuppression = pgTable(
  'phone_suppression',
  {
    keyId: text('key_id').notNull(),
    phoneHash: text('phone_hash').notNull(),
    reason: text('reason').notNull(),
    firstSeenAt: timestamptz('first_seen_at').notNull().defaultNow(),
    // La única columna que el rol de app puede actualizar (ON CONFLICT DO UPDATE, 03 §3.4).
    lastSeenAt: timestamptz('last_seen_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.keyId, t.phoneHash] }),
    check('phone_suppression_reason_check', inList(t.reason, PHONE_SUPPRESSION_REASONS)),
  ],
);

export const tombstones = pgTable(
  'tombstones',
  {
    keyId: text('key_id').notNull(),
    idHash: text('id_hash').notNull(),
    deletedAt: timestamptz('deleted_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.keyId, t.idHash] })],
);

export const emailSuppression = pgTable(
  'email_suppression',
  {
    keyId: text('key_id').notNull(),
    emailHash: text('email_hash').notNull(),
    reason: text('reason').notNull(),
    occurredAt: timestamptz('occurred_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.keyId, t.emailHash] }),
    check('email_suppression_reason_check', inList(t.reason, EMAIL_SUPPRESSION_REASONS)),
  ],
);
