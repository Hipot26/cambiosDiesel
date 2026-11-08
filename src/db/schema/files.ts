// Hojas de vida (03 §1.10; SEC-19 a SEC-26).
import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { candidates } from './candidates.js';
import { fileKindEnum, scanStatusEnum } from './enums.js';
import { createdAt, id, timestamptz } from './types.js';

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;

export const files = pgTable(
  'files',
  {
    id: id(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    kind: fileKindEnum('kind').notNull(),
    scanStatus: scanStatusEnum('scan_status').notNull().default('pending'),
    sha256: text('sha256').notNull(),
    detectedMime: text('detected_mime'),
    detectedExt: text('detected_ext'),
    sizeBytes: integer('size_bytes').notNull(),
    displayName: text('display_name'),
    // NULL hasta que la subida a R2 termine; disponible = clean y storage_key presente.
    storageKey: text('storage_key'),
    quarantinePath: text('quarantine_path'),
    scanSignature: text('scan_signature'),
    isCurrent: boolean('is_current').notNull().default(false),
    originUrlHost: text('origin_url_host'),
    createdAt: createdAt(),
    scannedAt: timestamptz('scanned_at'),
  },
  (t) => [
    uniqueIndex('files_candidate_sha256_idx').on(t.candidateId, t.sha256),
    uniqueIndex('files_one_current_idx').on(t.candidateId).where(sql`${t.isCurrent}`),
    check('files_size_bytes_check', sql`${t.sizeBytes} between 0 and 5242880`),
    check('files_display_name_check', sql`length(${t.displayName}) <= 120`),
  ],
);
