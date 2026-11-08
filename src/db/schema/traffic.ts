// Origen de tráfico de la primera visita (03 §1.10; 01 decisión 31). Sin FK a candidates:
// el candidato apunta a esta fila, no al revés.
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, timestamptz } from './types.js';

export const trafficSources = pgTable('traffic_sources', {
  id: id(),
  // El valor de la cookie de primera visita: aleatorio, sin datos personales.
  visitorId: uuid('visitor_id').notNull().unique(),
  firstSeenAt: timestamptz('first_seen_at').notNull().defaultNow(),
  lastSeenAt: timestamptz('last_seen_at').notNull().defaultNow(),
  visitsCount: integer('visits_count').notNull().default(1),
  referrerHost: text('referrer_host'),
  landingPath: text('landing_path'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmTerm: text('utm_term'),
  utmContent: text('utm_content'),
});
