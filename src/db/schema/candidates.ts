// candidates: el registro vivo del candidato (03 §1.2). El dueño de cada columna está en 03.
// Lo que NO está a propósito lo vigila tests/schema/forbidden-columns.test.ts por patrones, en
// todo el esquema: ninguna columna con "score" ni con "endorsement"; ninguna con "pay" salvo
// pay_wanted_min, pay_wanted_max y pay_wanted_unit (no hay pago actual; "payload" no cuenta);
// ninguna que empiece por "password" salvo las de staff_users. Y en candidates, ninguna con
// "consent" (los consentimientos van a consent_events). La bandera de empleado de cliente y el
// texto de hide_from_employers tampoco están, pero esa prueba no los busca.
import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { levelEnum, payUnitEnum, screenStatusEnum, visibilityEnum } from './enums.js';
import { jobs } from './jobs.js';
import { trafficSources } from './traffic.js';
import {
  bothOrNeither,
  createdAt,
  geometryPoint4326,
  id,
  inList,
  jsonValues,
  lower,
  timestamptz,
} from './types.js';

// Idiomas del screen (03 §1.2).
export const CANDIDATE_LANGUAGES = ['en', 'es'] as const;

export const candidates = pgTable(
  'candidates',
  {
    id: id(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    phoneE164: text('phone_e164'),
    phoneVerifiedAt: timestamptz('phone_verified_at'),
    phoneHash: text('phone_hash'),
    phoneHashKeyId: text('phone_hash_key_id'),
    zip: char('zip', { length: 5 }).notNull(),
    zipLocation: geometryPoint4326('zip_location'),
    tradeClaimed: text('trade_claimed').notNull(),
    tradeConfirmed: text('trade_confirmed'),
    tradeConfirmedSaid: text('trade_confirmed_said'),
    tradeSecondary: jsonb('trade_secondary'),
    level: levelEnum('level'),
    rubricVersion: text('rubric_version'),
    levelNotes: text('level_notes'),
    screenSummary: text('screen_summary'),
    yearsTrade: smallint('years_trade'),
    equipment: jsonb('equipment'),
    brands: jsonb('brands'),
    diagSoftware: jsonb('diag_software'),
    systems: jsonb('systems'),
    certs: jsonb('certs'),
    shifts: jsonb('shifts'),
    unmapped: jsonb('unmapped'),
    cdlClass: text('cdl_class'),
    ownTools: text('own_tools'),
    payWantedMin: numeric('pay_wanted_min', { precision: 8, scale: 2 }),
    payWantedMax: numeric('pay_wanted_max', { precision: 8, scale: 2 }),
    payWantedUnit: payUnitEnum('pay_wanted_unit'),
    travelPct: smallint('travel_pct'),
    willRelocate: boolean('will_relocate'),
    commuteRadiusMi: smallint('commute_radius_mi'),
    availableFrom: date('available_from'),
    currentEmployerText: text('current_employer_text'),
    currentEmployerCompanyId: uuid('current_employer_company_id').references(() => companies.id),
    language: char('language', { length: 2 }),
    screenStatus: screenStatusEnum('screen_status').notNull().default('not_started'),
    screenSessionId: text('screen_session_id'),
    screenUrl: text('screen_url'),
    screenStartedAt: timestamptz('screen_started_at'),
    screenProgress: jsonb('screen_progress'),
    screenResumeUrl: text('screen_resume_url'),
    screenedAt: timestamptz('screened_at'),
    verifiedAt: timestamptz('verified_at'),
    visibility: visibilityEnum('visibility').notNull(),
    findableSince: timestamptz('findable_since'),
    interestedJobId: uuid('interested_job_id').references(() => jobs.id, { onDelete: 'set null' }),
    recruiterflowId: text('recruiterflow_id'),
    trafficSourceId: uuid('traffic_source_id').references(() => trafficSources.id, {
      onDelete: 'set null',
    }),
    needsReview: boolean('needs_review').notNull().default(false),
    needsReviewReason: text('needs_review_reason'),
    staffNotes: text('staff_notes'),
    createdAt: createdAt(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('candidates_email_lower_idx').on(lower(t.email)),
    index('candidates_phone_hash_idx').on(t.phoneHashKeyId, t.phoneHash),
    index('candidates_zip_location_idx').using('gist', t.zipLocation),
    index('candidates_trade_confirmed_idx').on(t.tradeConfirmed),
    index('candidates_level_idx').on(t.level),
    index('candidates_screen_status_idx').on(t.screenStatus),
    index('candidates_verified_at_idx').on(t.verifiedAt),
    index('candidates_visibility_idx').on(t.visibility),
    index('candidates_equipment_values_idx').using('gin', jsonValues(t.equipment)),
    index('candidates_brands_values_idx').using('gin', jsonValues(t.brands)),
    index('candidates_diag_software_values_idx').using('gin', jsonValues(t.diagSoftware)),
    index('candidates_systems_values_idx').using('gin', jsonValues(t.systems)),
    index('candidates_certs_values_idx').using('gin', jsonValues(t.certs)),
    index('candidates_shifts_values_idx').using('gin', jsonValues(t.shifts)),
    check('candidates_travel_pct_check', sql`${t.travelPct} between 0 and 100`),
    check('candidates_pay_wanted_check', sql`${t.payWantedMin} <= ${t.payWantedMax}`),
    check('candidates_zip_check', sql`${t.zip} ~ '^[0-9]{5}$'`),
    // +1 y diez dígitos (03 §1.2; SEC-47).
    check('candidates_phone_e164_check', sql`${t.phoneE164} ~ '^\\+1[0-9]{10}$'`),
    check('candidates_phone_hash_key_check', bothOrNeither(t.phoneHash, t.phoneHashKeyId)),
    check('candidates_language_check', inList(t.language, CANDIDATE_LANGUAGES)),
  ],
);
