// Staff, overrides, tareas y auditoría (03 §1.10). level_overrides y staff_audit_log son de solo
// inserción para el rol de app; level_overrides admite UPDATE solo de superseded_by_screen_id
// (migración de permisos, SEC-39, SEC-40, SEC-67).
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  index,
  inet,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { candidates } from './candidates.js';
import { companies } from './companies.js';
import { levelEnum, staffRoleEnum, taskKindEnum } from './enums.js';
import { screens } from './screens.js';
import { createdAt, id, inList, lower, timestamptz } from './types.js';

// Estado de una tarea del staff (03 §1.10).
export const STAFF_TASK_STATUSES = ['open', 'done', 'dismissed'] as const;

export const staffUsers = pgTable(
  'staff_users',
  {
    id: id(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    // argon2id (SEC-33).
    passwordHash: text('password_hash').notNull(),
    role: staffRoleEnum('role').notNull(),
    createdAt: createdAt(),
    passwordChangedAt: timestamptz('password_changed_at'),
    // Los usuarios se desactivan, no se borran (SEC-32).
    disabledAt: timestamptz('disabled_at'),
    createdBy: uuid('created_by').references((): AnyPgColumn => staffUsers.id),
  },
  (t) => [uniqueIndex('staff_users_email_lower_idx').on(lower(t.email))],
);

export const levelOverrides = pgTable(
  'level_overrides',
  {
    id: id(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    staffUserId: uuid('staff_user_id')
      .notNull()
      .references(() => staffUsers.id),
    // NULL = el staff también puede poner "no ubicable".
    level: levelEnum('level'),
    reason: text('reason').notNull(),
    createdAt: createdAt(),
    // Se llena cuando llega un screen posterior que discrepa (SEC-39).
    supersededByScreenId: uuid('superseded_by_screen_id').references(() => screens.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    index('level_overrides_candidate_id_idx').on(t.candidateId),
    check('level_overrides_reason_check', sql`length(${t.reason}) >= 10`),
  ],
);

export const staffTasks = pgTable(
  'staff_tasks',
  {
    id: id(),
    kind: taskKindEnum('kind').notNull(),
    // Solo ids y referencias; nunca nombre, email ni teléfono.
    payload: jsonb('payload'),
    candidateId: uuid('candidate_id').references(() => candidates.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id').references(() => companies.id),
    status: text('status').notNull().default('open'),
    createdAt: createdAt(),
    doneAt: timestamptz('done_at'),
    doneBy: uuid('done_by').references(() => staffUsers.id),
  },
  (t) => [
    index('staff_tasks_candidate_id_idx').on(t.candidateId),
    check('staff_tasks_status_check', inList(t.status, STAFF_TASK_STATUSES)),
  ],
);

export const staffAuditLog = pgTable('staff_audit_log', {
  id: id(),
  staffUserId: uuid('staff_user_id').references(() => staffUsers.id),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: uuid('target_id'),
  // Sin datos personales (SEC-40).
  details: jsonb('details'),
  ip: inet('ip'),
  createdAt: createdAt(),
});
