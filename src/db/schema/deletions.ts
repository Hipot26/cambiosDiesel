// Avance de la cadena de borrado (03 §1.10 y §5.7; SEC-75). Sin FK a candidates: sobrevive al
// candidato. Al cerrar la cadena, candidate_id pasa a NULL y queda solo tombstone_hash, que es
// tombstoneHash(id): una huella con la clave activa del anillo, así que guarda su key_id como
// toda huella (SEC-72) y keyring-check la vigila.
import { sql } from 'drizzle-orm';
import { check, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { staffUsers } from './staff.js';
import { bothOrNeither, id, inList, timestamptz } from './types.js';

// Quién pidió el borrado (03 §1.10).
export const DELETION_REQUESTERS = ['candidate', 'staff', 'merge'] as const;

export const candidateDeletions = pgTable(
  'candidate_deletions',
  {
    id: id(),
    candidateId: uuid('candidate_id'),
    // NULL mientras la cadena corre; se llena al cerrarla, junto con su key_id.
    tombstoneHash: text('tombstone_hash'),
    tombstoneHashKeyId: text('tombstone_hash_key_id'),
    startedAt: timestamptz('started_at').notNull().defaultNow(),
    steps: jsonb('steps').notNull().default(sql`'{}'::jsonb`),
    finishedAt: timestamptz('finished_at'),
    requestedBy: text('requested_by').notNull(),
    staffUserId: uuid('staff_user_id').references(() => staffUsers.id),
  },
  (t) => [
    // Una sola cadena en curso por candidato.
    uniqueIndex('candidate_deletions_in_progress_idx')
      .on(t.candidateId)
      .where(sql`${t.finishedAt} is null`),
    check(
      'candidate_deletions_tombstone_hash_key_check',
      bothOrNeither(t.tombstoneHash, t.tombstoneHashKeyId),
    ),
    check('candidate_deletions_requested_by_check', inList(t.requestedBy, DELETION_REQUESTERS)),
  ],
);
