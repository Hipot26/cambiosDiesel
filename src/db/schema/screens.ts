// Historial del screen (03 §1.3). screens es de solo inserción para el rol de app
// (migración de permisos, SEC-67); la fusión copia, no mueve (03 §4.7).
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { candidates } from './candidates.js';
import { levelEnum } from './enums.js';
import { screenerEvents } from './events.js';
import { staffUsers } from './staff.js';
import { createdAt, id, inList, timestamptz } from './types.js';

export const screens = pgTable(
  'screens',
  {
    id: id(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    // La cadena de borrado borra screener_events (paso 4) antes que el candidato (paso 6):
    // con cascade el screen cae con su evento. La fusión reasigna los eventos al superviviente
    // para que sus copias no caigan con la cadena del absorbido (03 §4.7).
    screenerEventId: uuid('screener_event_id')
      .notNull()
      .references(() => screenerEvents.id, { onDelete: 'cascade' }),
    screenedAt: timestamp('screened_at', { withTimezone: true }).notNull(),
    level: levelEnum('level'),
    rubricVersion: text('rubric_version'),
    payload: jsonb('payload').notNull(),
    applied: boolean('applied').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('screens_candidate_screened_at_idx').on(t.candidateId, t.screenedAt.desc())],
);

// Quién inició el screen (03 §1.3): solo los de 'candidate' cuentan para el límite de 30 días.
export const SCREEN_STARTED_BY = ['candidate', 'staff'] as const;

export const screenStarts = pgTable(
  'screen_starts',
  {
    id: id(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    startedBy: text('started_by').notNull(),
    staffUserId: uuid('staff_user_id').references(() => staffUsers.id),
    sessionId: text('session_id'),
    screenUrl: text('screen_url'),
    startedAt: timestamptz('started_at').notNull().defaultNow(),
  },
  (t) => [
    // FK hacia candidates (SEC-75) y el límite de 30 días (03 §4.5).
    index('screen_starts_candidate_started_at_idx').on(t.candidateId, t.startedAt.desc()),
    check('screen_starts_started_by_check', inList(t.startedBy, SCREEN_STARTED_BY)),
  ],
);

// Los ocho campos S/E que el candidato puede editar en el sitio (03 §1.2 y §3.1).
export const CANDIDATE_EDITABLE_FIELDS = [
  'pay_wanted',
  'shifts',
  'travel_pct',
  'will_relocate',
  'commute_radius_mi',
  'available_from',
  'current_employer_text',
  'hide_from_employers',
] as const;

export const candidateFieldEdits = pgTable(
  'candidate_field_edits',
  {
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    field: text('field').notNull(),
    editedAt: timestamptz('edited_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.candidateId, t.field] }),
    // Misma lista que CANDIDATE_EDITABLE_FIELDS (la prueba del esquema las compara).
    check(
      'candidate_field_edits_field_check',
      sql`${t.field} in ('pay_wanted', 'shifts', 'travel_pct', 'will_relocate', 'commute_radius_mi', 'available_from', 'current_employer_text', 'hide_from_employers')`,
    ),
  ],
);
