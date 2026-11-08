// Empresas y empresas ocultas (03 §1.5).
import { boolean, check, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { candidates } from './candidates.js';
import { companyReviewEnum } from './enums.js';
import { staffUsers } from './staff.js';
import { createdAt, id, inList, timestamptz } from './types.js';

// De dónde salió la empresa (03 §1.5).
export const COMPANY_CREATED_FROM = ['screener', 'recruiterflow', 'feed', 'staff'] as const;
// Quién ocultó al candidato de la empresa (03 §1.5); 'candidate' llega en el Sprint 2.
export const HIDDEN_COMPANY_SOURCES = [
  'screener',
  'default_current_employer',
  'candidate',
  'staff',
] as const;

export const companies = pgTable(
  'companies',
  {
    id: id(),
    name: text('name').notNull(),
    // normalizeAlias(name) (03 §7.1).
    nameNormalized: text('name_normalized').notNull().unique(),
    reviewStatus: companyReviewEnum('review_status').notNull().default('unreviewed'),
    excluded: boolean('excluded').notNull().default(false),
    createdFrom: text('created_from').notNull(),
    createdAt: createdAt(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [check('companies_created_from_check', inList(t.createdFrom, COMPANY_CREATED_FROM))],
);

export const companyAliases = pgTable(
  'company_aliases',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    aliasNormalized: text('alias_normalized').notNull().unique(),
    createdBy: uuid('created_by').references(() => staffUsers.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.aliasNormalized] })],
);

export const candidateHiddenCompanies = pgTable(
  'candidate_hidden_companies',
  {
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    source: text('source').notNull(),
    said: text('said'),
    addedAt: timestamptz('added_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.candidateId, t.companyId] }),
    check('candidate_hidden_companies_source_check', inList(t.source, HIDDEN_COMPANY_SOURCES)),
  ],
);
