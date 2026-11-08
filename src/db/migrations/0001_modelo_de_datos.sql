CREATE TYPE "public"."company_review" AS ENUM('unreviewed', 'direct', 'agency');--> statement-breakpoint
CREATE TYPE "public"."consent_action" AS ENUM('granted', 'withdrawn', 'sms_opted_out');--> statement-breakpoint
CREATE TYPE "public"."consent_kind" AS ENUM('email', 'sms', 'share');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('received', 'processed', 'ignored_duplicate', 'ignored_stale', 'discarded_deleted', 'discarded_unknown', 'failed');--> statement-breakpoint
CREATE TYPE "public"."file_kind" AS ENUM('resume_uploaded', 'resume_generated');--> statement-breakpoint
CREATE TYPE "public"."job_source" AS ENUM('recruiterflow', 'feed', 'employer');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('open', 'closed', 'held');--> statement-breakpoint
CREATE TYPE "public"."level" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."pay_unit" AS ENUM('hour', 'year');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('pending', 'clean', 'infected', 'error');--> statement-breakpoint
CREATE TYPE "public"."screen_status" AS ENUM('not_started', 'started', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('owner', 'staff');--> statement-breakpoint
CREATE TYPE "public"."task_kind" AS ENUM('recruiterflow_delete', 'review_company', 'review_unmapped', 'review_candidate');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('findable', 'hidden');--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone_e164" text,
	"phone_verified_at" timestamp with time zone,
	"phone_hash" text,
	"phone_hash_key_id" text,
	"zip" char(5) NOT NULL,
	"zip_location" geometry(Point,4326),
	"trade_claimed" text NOT NULL,
	"trade_confirmed" text,
	"trade_confirmed_said" text,
	"trade_secondary" jsonb,
	"level" "level",
	"rubric_version" text,
	"level_notes" text,
	"screen_summary" text,
	"years_trade" smallint,
	"equipment" jsonb,
	"brands" jsonb,
	"diag_software" jsonb,
	"systems" jsonb,
	"certs" jsonb,
	"shifts" jsonb,
	"unmapped" jsonb,
	"cdl_class" text,
	"own_tools" text,
	"pay_wanted_min" numeric(8, 2),
	"pay_wanted_max" numeric(8, 2),
	"pay_wanted_unit" "pay_unit",
	"travel_pct" smallint,
	"will_relocate" boolean,
	"commute_radius_mi" smallint,
	"available_from" date,
	"current_employer_text" text,
	"current_employer_company_id" uuid,
	"language" char(2),
	"screen_status" "screen_status" DEFAULT 'not_started' NOT NULL,
	"screen_session_id" text,
	"screen_url" text,
	"screen_started_at" timestamp with time zone,
	"screen_progress" jsonb,
	"screen_resume_url" text,
	"screened_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"visibility" "visibility" NOT NULL,
	"findable_since" timestamp with time zone,
	"interested_job_id" uuid,
	"recruiterflow_id" text,
	"traffic_source_id" uuid,
	"needs_review" boolean DEFAULT false NOT NULL,
	"needs_review_reason" text,
	"staff_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_travel_pct_check" CHECK ("candidates"."travel_pct" between 0 and 100),
	CONSTRAINT "candidates_pay_wanted_check" CHECK ("candidates"."pay_wanted_min" <= "candidates"."pay_wanted_max"),
	CONSTRAINT "candidates_zip_check" CHECK ("candidates"."zip" ~ '^[0-9]{5}$')
);
--> statement-breakpoint
CREATE TABLE "candidate_hidden_companies" (
	"candidate_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"source" text NOT NULL,
	"said" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_hidden_companies_candidate_id_company_id_pk" PRIMARY KEY("candidate_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"name_normalized" text NOT NULL,
	"review_status" "company_review" DEFAULT 'unreviewed' NOT NULL,
	"excluded" boolean DEFAULT false NOT NULL,
	"created_from" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_normalized_unique" UNIQUE("name_normalized")
);
--> statement-breakpoint
CREATE TABLE "company_aliases" (
	"company_id" uuid NOT NULL,
	"alias_normalized" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_aliases_company_id_alias_normalized_pk" PRIMARY KEY("company_id","alias_normalized"),
	CONSTRAINT "company_aliases_alias_normalized_unique" UNIQUE("alias_normalized")
);
--> statement-breakpoint
CREATE TABLE "consent_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"candidate_id" uuid,
	"kind" "consent_kind" NOT NULL,
	"action" "consent_action" NOT NULL,
	"wording_text" text NOT NULL,
	"wording_version" text NOT NULL,
	"source" text NOT NULL,
	"screener_event_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_suppression" (
	"key_id" text NOT NULL,
	"email_hash" text NOT NULL,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_suppression_key_id_email_hash_pk" PRIMARY KEY("key_id","email_hash")
);
--> statement-breakpoint
CREATE TABLE "phone_suppression" (
	"key_id" text NOT NULL,
	"phone_hash" text NOT NULL,
	"reason" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "phone_suppression_key_id_phone_hash_pk" PRIMARY KEY("key_id","phone_hash")
);
--> statement-breakpoint
CREATE TABLE "tombstones" (
	"key_id" text NOT NULL,
	"id_hash" text NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tombstones_key_id_id_hash_pk" PRIMARY KEY("key_id","id_hash")
);
--> statement-breakpoint
CREATE TABLE "visibility_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"from_state" "visibility" NOT NULL,
	"to_state" "visibility" NOT NULL,
	"source" text NOT NULL,
	"staff_user_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_deletions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"candidate_id" uuid,
	"tombstone_hash" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"steps" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"finished_at" timestamp with time zone,
	"requested_by" text NOT NULL,
	"staff_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "resend_events" (
	"webhook_id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "screener_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"idempotency_key" text NOT NULL,
	"event_type" text NOT NULL,
	"spec_version" text NOT NULL,
	"kid" text NOT NULL,
	"dju_candidate_id" uuid,
	"payload" jsonb,
	"raw_body" "bytea",
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "event_status" NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	CONSTRAINT "screener_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"kind" "file_kind" NOT NULL,
	"scan_status" "scan_status" DEFAULT 'pending' NOT NULL,
	"sha256" text NOT NULL,
	"detected_mime" text,
	"detected_ext" text,
	"size_bytes" integer NOT NULL,
	"display_name" text,
	"storage_key" text,
	"quarantine_path" text,
	"scan_signature" text,
	"is_current" boolean DEFAULT false NOT NULL,
	"origin_url_host" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scanned_at" timestamp with time zone,
	CONSTRAINT "files_size_bytes_check" CHECK ("files"."size_bytes" between 0 and 5242880),
	CONSTRAINT "files_display_name_check" CHECK (length("files"."display_name") <= 120)
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"source" "job_source" NOT NULL,
	"source_id" text NOT NULL,
	"title" text NOT NULL,
	"trade" text,
	"trade_rule" text,
	"company_id" uuid NOT NULL,
	"city" text,
	"state" char(2),
	"zip" char(5),
	"location" geometry(Point,4326),
	"employment_type" text,
	"description_html" text,
	"apply_url" text,
	"status" "job_status" NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"posted_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "candidate_field_edits" (
	"candidate_id" uuid NOT NULL,
	"field" text NOT NULL,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_field_edits_candidate_id_field_pk" PRIMARY KEY("candidate_id","field"),
	CONSTRAINT "candidate_field_edits_field_check" CHECK ("candidate_field_edits"."field" in ('pay_wanted', 'shifts', 'travel_pct', 'will_relocate', 'commute_radius_mi', 'available_from', 'current_employer_text', 'hide_from_employers'))
);
--> statement-breakpoint
CREATE TABLE "screen_starts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"started_by" text NOT NULL,
	"staff_user_id" uuid,
	"session_id" text,
	"screen_url" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"screener_event_id" uuid NOT NULL,
	"screened_at" timestamp with time zone NOT NULL,
	"level" "level",
	"rubric_version" text,
	"payload" jsonb NOT NULL,
	"applied" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duplicate_signup_attempts" (
	"key_id" text NOT NULL,
	"email_hash" text NOT NULL,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_notified_at" timestamp with time zone,
	CONSTRAINT "duplicate_signup_attempts_key_id_email_hash_pk" PRIMARY KEY("key_id","email_hash")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email_normalized" text NOT NULL,
	"ip" "inet",
	"succeeded" boolean NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"token_hash" text NOT NULL,
	"candidate_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"staff_user_id" uuid,
	"candidate_id" uuid,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_sends" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"key_id" text NOT NULL,
	"phone_hash" text NOT NULL,
	"candidate_id" uuid,
	"purpose" text NOT NULL,
	"provider_sid" text,
	"outcome" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails_sent" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"template" text NOT NULL,
	"resend_id" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_windows" (
	"bucket" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_windows_bucket_window_start_pk" PRIMARY KEY("bucket","window_start")
);
--> statement-breakpoint
CREATE TABLE "recruiterflow_sync" (
	"candidate_id" uuid PRIMARY KEY NOT NULL,
	"recruiterflow_id" text,
	"last_synced_at" timestamp with time zone,
	"last_payload_hash" text,
	"consent_state_sent" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"synced_without_consent" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "level_overrides" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"staff_user_id" uuid NOT NULL,
	"level" "level",
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_by_screen_id" uuid,
	CONSTRAINT "level_overrides_reason_check" CHECK (length("level_overrides"."reason") >= 10)
);
--> statement-breakpoint
CREATE TABLE "staff_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"staff_user_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"details" jsonb,
	"ip" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_tasks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kind" "task_kind" NOT NULL,
	"payload" jsonb,
	"candidate_id" uuid,
	"company_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone,
	"done_by" uuid
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "staff_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"password_changed_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "traffic_sources" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"visitor_id" uuid NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visits_count" integer DEFAULT 1 NOT NULL,
	"referrer_host" text,
	"landing_path" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	CONSTRAINT "traffic_sources_visitor_id_unique" UNIQUE("visitor_id")
);
--> statement-breakpoint
CREATE TABLE "vocabulary_unmapped" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"list_name" text NOT NULL,
	"said_raw" text NOT NULL,
	"said_normalized" text NOT NULL,
	"source" text NOT NULL,
	"candidate_id" uuid,
	"screener_event_id" uuid,
	"resolved_at" timestamp with time zone,
	"resolved_as" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"version_label" text NOT NULL,
	"file_sha256" text NOT NULL,
	"document" jsonb NOT NULL,
	"summary" jsonb,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "vocabulary_versions_file_sha256_unique" UNIQUE("file_sha256")
);
--> statement-breakpoint
CREATE TABLE "zip_centroids" (
	"zip" char(5) PRIMARY KEY NOT NULL,
	"location" geometry(Point,4326) NOT NULL,
	"state" char(2),
	"source_version" text
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_current_employer_company_id_companies_id_fk" FOREIGN KEY ("current_employer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_interested_job_id_jobs_id_fk" FOREIGN KEY ("interested_job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_traffic_source_id_traffic_sources_id_fk" FOREIGN KEY ("traffic_source_id") REFERENCES "public"."traffic_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_hidden_companies" ADD CONSTRAINT "candidate_hidden_companies_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_hidden_companies" ADD CONSTRAINT "candidate_hidden_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD CONSTRAINT "company_aliases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD CONSTRAINT "company_aliases_created_by_staff_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_screener_event_id_screener_events_id_fk" FOREIGN KEY ("screener_event_id") REFERENCES "public"."screener_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visibility_events" ADD CONSTRAINT "visibility_events_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visibility_events" ADD CONSTRAINT "visibility_events_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_deletions" ADD CONSTRAINT "candidate_deletions_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_field_edits" ADD CONSTRAINT "candidate_field_edits_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_starts" ADD CONSTRAINT "screen_starts_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_starts" ADD CONSTRAINT "screen_starts_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screens" ADD CONSTRAINT "screens_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screens" ADD CONSTRAINT "screens_screener_event_id_screener_events_id_fk" FOREIGN KEY ("screener_event_id") REFERENCES "public"."screener_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_tokens" ADD CONSTRAINT "return_tokens_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_sends" ADD CONSTRAINT "sms_sends_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails_sent" ADD CONSTRAINT "emails_sent_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruiterflow_sync" ADD CONSTRAINT "recruiterflow_sync_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_staff_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_overrides" ADD CONSTRAINT "level_overrides_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_overrides" ADD CONSTRAINT "level_overrides_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_overrides" ADD CONSTRAINT "level_overrides_superseded_by_screen_id_screens_id_fk" FOREIGN KEY ("superseded_by_screen_id") REFERENCES "public"."screens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_audit_log" ADD CONSTRAINT "staff_audit_log_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_tasks" ADD CONSTRAINT "staff_tasks_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_tasks" ADD CONSTRAINT "staff_tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_tasks" ADD CONSTRAINT "staff_tasks_done_by_staff_users_id_fk" FOREIGN KEY ("done_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_created_by_staff_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_unmapped" ADD CONSTRAINT "vocabulary_unmapped_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_unmapped" ADD CONSTRAINT "vocabulary_unmapped_screener_event_id_screener_events_id_fk" FOREIGN KEY ("screener_event_id") REFERENCES "public"."screener_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_versions" ADD CONSTRAINT "vocabulary_versions_uploaded_by_staff_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "candidates_email_lower_idx" ON "candidates" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "candidates_phone_hash_idx" ON "candidates" USING btree ("phone_hash_key_id","phone_hash");--> statement-breakpoint
CREATE INDEX "candidates_zip_location_idx" ON "candidates" USING gist ("zip_location");--> statement-breakpoint
CREATE INDEX "candidates_trade_confirmed_idx" ON "candidates" USING btree ("trade_confirmed");--> statement-breakpoint
CREATE INDEX "candidates_level_idx" ON "candidates" USING btree ("level");--> statement-breakpoint
CREATE INDEX "candidates_screen_status_idx" ON "candidates" USING btree ("screen_status");--> statement-breakpoint
CREATE INDEX "candidates_verified_at_idx" ON "candidates" USING btree ("verified_at");--> statement-breakpoint
CREATE INDEX "candidates_visibility_idx" ON "candidates" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "candidates_equipment_values_idx" ON "candidates" USING gin (jsonb_path_query_array("equipment", '$[*].value'));--> statement-breakpoint
CREATE INDEX "candidates_brands_values_idx" ON "candidates" USING gin (jsonb_path_query_array("brands", '$[*].value'));--> statement-breakpoint
CREATE INDEX "candidates_diag_software_values_idx" ON "candidates" USING gin (jsonb_path_query_array("diag_software", '$[*].value'));--> statement-breakpoint
CREATE INDEX "candidates_systems_values_idx" ON "candidates" USING gin (jsonb_path_query_array("systems", '$[*].value'));--> statement-breakpoint
CREATE INDEX "candidates_certs_values_idx" ON "candidates" USING gin (jsonb_path_query_array("certs", '$[*].value'));--> statement-breakpoint
CREATE INDEX "candidates_shifts_values_idx" ON "candidates" USING gin (jsonb_path_query_array("shifts", '$[*].value'));--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_deletions_in_progress_idx" ON "candidate_deletions" USING btree ("candidate_id") WHERE "candidate_deletions"."finished_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "files_candidate_sha256_idx" ON "files" USING btree ("candidate_id","sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "files_one_current_idx" ON "files" USING btree ("candidate_id") WHERE "files"."is_current";--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_source_source_id_idx" ON "jobs" USING btree ("source","source_id");--> statement-breakpoint
CREATE INDEX "jobs_trade_idx" ON "jobs" USING btree ("trade");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_location_idx" ON "jobs" USING gist ("location");--> statement-breakpoint
CREATE INDEX "screens_candidate_screened_at_idx" ON "screens" USING btree ("candidate_id","screened_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "login_attempts_email_idx" ON "login_attempts" USING btree ("email_normalized","attempted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sms_sends_phone_idx" ON "sms_sends" USING btree ("key_id","phone_hash","sent_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "staff_users_email_lower_idx" ON "staff_users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "vocabulary_unmapped_open_idx" ON "vocabulary_unmapped" USING btree ("list_name","said_normalized") WHERE "vocabulary_unmapped"."resolved_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "vocabulary_versions_one_active_idx" ON "vocabulary_versions" USING btree (("activated_at" is not null)) WHERE "vocabulary_versions"."activated_at" is not null and "vocabulary_versions"."deactivated_at" is null;--> statement-breakpoint
CREATE INDEX "zip_centroids_location_idx" ON "zip_centroids" USING gist ("location");