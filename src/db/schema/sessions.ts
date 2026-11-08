// Tokens, sesiones, intentos y envíos (03 §1.9).
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { TOKEN_PURPOSES } from '../../security/tokens.js';
import { candidates } from './candidates.js';
import { staffUsers } from './staff.js';
import { createdAt, id, inList, timestamptz } from './types.js';

// Una cookie por tipo (SEC-35): dju_staff y dju_cand.
export const SESSION_KINDS = ['staff', 'candidate'] as const;
// Para qué se mandó el SMS y qué pasó (03 §1.9; SEC-44).
export const SMS_PURPOSES = ['verify'] as const;
export const SMS_OUTCOMES = ['sent', 'blocked_limit', 'blocked_fraud_guard', 'error'] as const;

export const returnTokens = pgTable(
  'return_tokens',
  {
    id: id(),
    // SHA-256 del token; el token nunca se guarda (SEC-49).
    tokenHash: text('token_hash').notNull().unique(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    // Un solo propósito por token (SEC-49): la lista es TOKEN_PURPOSES de src/security/tokens.ts.
    purpose: text('purpose').notNull(),
    expiresAt: timestamptz('expires_at').notNull(),
    usedAt: timestamptz('used_at'),
    revokedAt: timestamptz('revoked_at'),
    createdAt: createdAt(),
  },
  (t) => [
    index('return_tokens_candidate_id_idx').on(t.candidateId),
    check('return_tokens_purpose_check', inList(t.purpose, TOKEN_PURPOSES)),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    sid: text('sid').primaryKey(),
    kind: text('kind').notNull(),
    staffUserId: uuid('staff_user_id').references(() => staffUsers.id, { onDelete: 'cascade' }),
    candidateId: uuid('candidate_id').references(() => candidates.id, { onDelete: 'cascade' }),
    data: jsonb('data').notNull(),
    createdAt: createdAt(),
    expiresAt: timestamptz('expires_at').notNull(),
  },
  (t) => [
    index('sessions_expires_at_idx').on(t.expiresAt),
    index('sessions_candidate_id_idx').on(t.candidateId),
    check('sessions_kind_check', inList(t.kind, SESSION_KINDS)),
    // Nunca dos dueños ni el dueño del otro tipo. Sin dueño sí: el token CSRF vive en la sesión
    // (SEC-36), así que el formulario de registro y el de login del panel guardan una sesión
    // antes de que exista el candidato o de que el staff entre.
    check(
      'sessions_owner_check',
      sql`(${t.kind} = 'staff' and ${t.candidateId} is null) or (${t.kind} = 'candidate' and ${t.staffUserId} is null)`,
    ),
  ],
);

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: id(),
    emailNormalized: text('email_normalized').notNull(),
    ip: inet('ip'),
    succeeded: boolean('succeeded').notNull(),
    attemptedAt: timestamptz('attempted_at').notNull().defaultNow(),
  },
  (t) => [index('login_attempts_email_idx').on(t.emailNormalized, t.attemptedAt.desc())],
);

export const smsSends = pgTable(
  'sms_sends',
  {
    id: id(),
    keyId: text('key_id').notNull(),
    phoneHash: text('phone_hash').notNull(),
    candidateId: uuid('candidate_id').references(() => candidates.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(),
    providerSid: text('provider_sid'),
    outcome: text('outcome').notNull(),
    sentAt: timestamptz('sent_at').notNull().defaultNow(),
  },
  (t) => [
    index('sms_sends_phone_idx').on(t.keyId, t.phoneHash, t.sentAt.desc()),
    index('sms_sends_candidate_id_idx').on(t.candidateId),
    check('sms_sends_purpose_check', inList(t.purpose, SMS_PURPOSES)),
    check('sms_sends_outcome_check', inList(t.outcome, SMS_OUTCOMES)),
  ],
);

export const duplicateSignupAttempts = pgTable(
  'duplicate_signup_attempts',
  {
    keyId: text('key_id').notNull(),
    emailHash: text('email_hash').notNull(),
    attemptsCount: integer('attempts_count').notNull().default(0),
    lastAttemptAt: timestamptz('last_attempt_at').notNull().defaultNow(),
    lastNotifiedAt: timestamptz('last_notified_at'),
  },
  (t) => [primaryKey({ columns: [t.keyId, t.emailHash] })],
);
