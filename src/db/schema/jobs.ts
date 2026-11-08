// Empleos del Job Board (03 §1.6).
import { boolean, char, index, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { jobSourceEnum, jobStatusEnum } from './enums.js';
import { createdAt, geometryPoint4326, id, timestamptz } from './types.js';

export const jobs = pgTable(
  'jobs',
  {
    id: id(),
    source: jobSourceEnum('source').notNull(),
    sourceId: text('source_id').notNull(),
    title: text('title').notNull(),
    trade: text('trade'),
    tradeRule: text('trade_rule'),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    city: text('city'),
    state: char('state', { length: 2 }),
    zip: char('zip', { length: 5 }),
    location: geometryPoint4326('location'),
    employmentType: text('employment_type'),
    // Saneado al guardar con sanitize-html (SEC-64).
    descriptionHtml: text('description_html'),
    applyUrl: text('apply_url'),
    status: jobStatusEnum('status').notNull(),
    featured: boolean('featured').notNull().default(false),
    postedAt: timestamptz('posted_at'),
    expiresAt: timestamptz('expires_at'),
    closedAt: timestamptz('closed_at'),
    raw: jsonb('raw'),
    createdAt: createdAt(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
    lastSeenAt: timestamptz('last_seen_at'),
  },
  (t) => [
    uniqueIndex('jobs_source_source_id_idx').on(t.source, t.sourceId),
    index('jobs_trade_idx').on(t.trade),
    index('jobs_status_idx').on(t.status),
    index('jobs_location_idx').using('gist', t.location),
  ],
);
