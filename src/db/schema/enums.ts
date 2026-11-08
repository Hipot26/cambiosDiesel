// Tipos enumerados (03 §1.1).
import { pgEnum } from 'drizzle-orm/pg-core';

export const screenStatusEnum = pgEnum('screen_status', [
  'not_started',
  'started',
  'completed',
  'abandoned',
]);
// NULL en la columna = "no ubicable como técnico", no una C (Spec §3).
export const levelEnum = pgEnum('level', ['A', 'B', 'C']);
export const payUnitEnum = pgEnum('pay_unit', ['hour', 'year']);
export const visibilityEnum = pgEnum('visibility', ['findable', 'hidden']);
export const scanStatusEnum = pgEnum('scan_status', ['pending', 'clean', 'infected', 'error']);
export const consentKindEnum = pgEnum('consent_kind', ['email', 'sms', 'share']);
export const consentActionEnum = pgEnum('consent_action', [
  'granted',
  'withdrawn',
  'sms_opted_out',
]);
export const fileKindEnum = pgEnum('file_kind', ['resume_uploaded', 'resume_generated']);
export const companyReviewEnum = pgEnum('company_review', ['unreviewed', 'direct', 'agency']);
export const jobSourceEnum = pgEnum('job_source', ['recruiterflow', 'feed', 'employer']);
export const jobStatusEnum = pgEnum('job_status', ['open', 'closed', 'held']);
export const staffRoleEnum = pgEnum('staff_role', ['owner', 'staff']);
export const taskKindEnum = pgEnum('task_kind', [
  'recruiterflow_delete',
  'review_company',
  'review_unmapped',
  'review_candidate',
]);
export const eventStatusEnum = pgEnum('event_status', [
  'received',
  'processed',
  'ignored_duplicate',
  'ignored_stale',
  'discarded_deleted',
  'discarded_unknown',
  'failed',
]);
