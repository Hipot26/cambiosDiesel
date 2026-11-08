// Vocabulario: versiones cargadas y palabras sin mapear (03 §1.7).
import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { candidates } from './candidates.js';
import { screenerEvents } from './events.js';
import { staffUsers } from './staff.js';
import { createdAt, id, inList, timestamptz } from './types.js';

// De dónde salió la palabra sin mapear (03 §1.7); 'job_feed' llega en el Sprint 3B. list_name
// no lleva CHECK: 03 §1.7 no cierra la lista ("trade, equipment, …").
export const UNMAPPED_SOURCES = ['screen', 'job_feed', 'company'] as const;

export const vocabularyVersions = pgTable(
  'vocabulary_versions',
  {
    id: id(),
    versionLabel: text('version_label').notNull(),
    fileSha256: text('file_sha256').notNull().unique(),
    document: jsonb('document').notNull(),
    summary: jsonb('summary'),
    uploadedBy: uuid('uploaded_by').references(() => staffUsers.id),
    uploadedAt: timestamptz('uploaded_at').notNull().defaultNow(),
    activatedAt: timestamptz('activated_at'),
    deactivatedAt: timestamptz('deactivated_at'),
  },
  (t) => [
    // Solo una versión activa a la vez: todas las filas activas comparten el valor indexado.
    uniqueIndex('vocabulary_versions_one_active_idx')
      .on(sql`(${t.activatedAt} is not null)`)
      .where(sql`${t.activatedAt} is not null and ${t.deactivatedAt} is null`),
  ],
);

export const vocabularyUnmapped = pgTable(
  'vocabulary_unmapped',
  {
    id: id(),
    listName: text('list_name').notNull(),
    saidRaw: text('said_raw').notNull(),
    saidNormalized: text('said_normalized').notNull(),
    source: text('source').notNull(),
    candidateId: uuid('candidate_id').references(() => candidates.id, { onDelete: 'cascade' }),
    screenerEventId: uuid('screener_event_id').references(() => screenerEvents.id, {
      onDelete: 'set null',
    }),
    resolvedAt: timestamptz('resolved_at'),
    resolvedAs: text('resolved_as'),
    createdAt: createdAt(),
  },
  (t) => [
    index('vocabulary_unmapped_open_idx')
      .on(t.listName, t.saidNormalized)
      .where(sql`${t.resolvedAt} is null`),
    index('vocabulary_unmapped_candidate_id_idx').on(t.candidateId),
    check('vocabulary_unmapped_source_check', inList(t.source, UNMAPPED_SOURCES)),
  ],
);
