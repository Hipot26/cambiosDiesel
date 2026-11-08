-- Endurecimiento del esquema tras la autoauditoría del 30 oct 2026 (03 §1 y §8.1; SEC-72, SEC-75).
-- Generada con drizzle-kit desde src/db/schema; los permisos van aparte, a mano, en 0004.
-- Es expansión: índices en las FK hacia candidates y en screener_events.dju_candidate_id, CHECK
-- de los conjuntos cerrados de 03 §1 y de cada huella con su key_id, y la columna
-- candidate_deletions.tombstone_hash_key_id (NULL mientras la cadena corre, como tombstone_hash).
-- Una sola contracción, a propósito: DROP COLUMN resend_events.payload. 03 §3.5 solo inserta
-- webhook_id, ningún código la lee y no hay datos en ningún entorno (todavía no hay despliegue,
-- T-33), así que la regla de dos pasos de 03 §8.1 no tiene una release anterior que proteger. La
-- columna invitaba a guardar el cuerpo del webhook de Resend, que trae el email y sobreviviría
-- al borrado del candidato. Los índices van sin CONCURRENTLY: el migrador de Drizzle corre todo
-- dentro de una transacción y las tablas están vacías.
ALTER TABLE "candidate_deletions" ADD COLUMN "tombstone_hash_key_id" text;--> statement-breakpoint
CREATE INDEX "consent_events_candidate_kind_idx" ON "consent_events" USING btree ("candidate_id","kind","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "visibility_events_candidate_id_idx" ON "visibility_events" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "screener_events_dju_candidate_id_idx" ON "screener_events" USING btree ("dju_candidate_id");--> statement-breakpoint
CREATE INDEX "screen_starts_candidate_started_at_idx" ON "screen_starts" USING btree ("candidate_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "return_tokens_candidate_id_idx" ON "return_tokens" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "sessions_candidate_id_idx" ON "sessions" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "sms_sends_candidate_id_idx" ON "sms_sends" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "emails_sent_candidate_template_idx" ON "emails_sent" USING btree ("candidate_id","template","sent_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "level_overrides_candidate_id_idx" ON "level_overrides" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "staff_tasks_candidate_id_idx" ON "staff_tasks" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "vocabulary_unmapped_candidate_id_idx" ON "vocabulary_unmapped" USING btree ("candidate_id");--> statement-breakpoint
ALTER TABLE "resend_events" DROP COLUMN "payload";--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_phone_e164_check" CHECK ("candidates"."phone_e164" ~ '^\+1[0-9]{10}$');--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_phone_hash_key_check" CHECK (("candidates"."phone_hash" is null) = ("candidates"."phone_hash_key_id" is null));--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_language_check" CHECK ("candidates"."language" in ('en', 'es'));--> statement-breakpoint
ALTER TABLE "candidate_hidden_companies" ADD CONSTRAINT "candidate_hidden_companies_source_check" CHECK ("candidate_hidden_companies"."source" in ('screener', 'default_current_employer', 'candidate', 'staff'));--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_from_check" CHECK ("companies"."created_from" in ('screener', 'recruiterflow', 'feed', 'staff'));--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_source_check" CHECK ("consent_events"."source" in ('signup', 'late_capture', 'profile', 'staff', 'screener_webhook', 'unsubscribe_link'));--> statement-breakpoint
ALTER TABLE "email_suppression" ADD CONSTRAINT "email_suppression_reason_check" CHECK ("email_suppression"."reason" in ('bounced', 'complained'));--> statement-breakpoint
ALTER TABLE "phone_suppression" ADD CONSTRAINT "phone_suppression_reason_check" CHECK ("phone_suppression"."reason" in ('sms_stop', 'deleted'));--> statement-breakpoint
ALTER TABLE "visibility_events" ADD CONSTRAINT "visibility_events_source_check" CHECK ("visibility_events"."source" in ('signup_default', 'candidate', 'staff', 'application'));--> statement-breakpoint
ALTER TABLE "candidate_deletions" ADD CONSTRAINT "candidate_deletions_tombstone_hash_key_check" CHECK (("candidate_deletions"."tombstone_hash" is null) = ("candidate_deletions"."tombstone_hash_key_id" is null));--> statement-breakpoint
ALTER TABLE "candidate_deletions" ADD CONSTRAINT "candidate_deletions_requested_by_check" CHECK ("candidate_deletions"."requested_by" in ('candidate', 'staff', 'merge'));--> statement-breakpoint
ALTER TABLE "screener_events" ADD CONSTRAINT "screener_events_event_type_check" CHECK ("screener_events"."event_type" in ('screen.completed', 'screen.abandoned', 'resume.generated', 'sms.opted_out'));--> statement-breakpoint
ALTER TABLE "screen_starts" ADD CONSTRAINT "screen_starts_started_by_check" CHECK ("screen_starts"."started_by" in ('candidate', 'staff'));--> statement-breakpoint
ALTER TABLE "return_tokens" ADD CONSTRAINT "return_tokens_purpose_check" CHECK ("return_tokens"."purpose" in ('return', 'email_verify', 'delete_confirm', 'unsubscribe'));--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_kind_check" CHECK ("sessions"."kind" in ('staff', 'candidate'));--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_owner_check" CHECK (("sessions"."kind" = 'staff' and "sessions"."candidate_id" is null) or ("sessions"."kind" = 'candidate' and "sessions"."staff_user_id" is null));--> statement-breakpoint
ALTER TABLE "sms_sends" ADD CONSTRAINT "sms_sends_purpose_check" CHECK ("sms_sends"."purpose" in ('verify'));--> statement-breakpoint
ALTER TABLE "sms_sends" ADD CONSTRAINT "sms_sends_outcome_check" CHECK ("sms_sends"."outcome" in ('sent', 'blocked_limit', 'blocked_fraud_guard', 'error'));--> statement-breakpoint
ALTER TABLE "staff_tasks" ADD CONSTRAINT "staff_tasks_status_check" CHECK ("staff_tasks"."status" in ('open', 'done', 'dismissed'));--> statement-breakpoint
ALTER TABLE "vocabulary_unmapped" ADD CONSTRAINT "vocabulary_unmapped_source_check" CHECK ("vocabulary_unmapped"."source" in ('screen', 'job_feed', 'company'));