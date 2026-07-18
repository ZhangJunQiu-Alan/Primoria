CREATE TABLE "profile_fact_intake_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_text" text,
	"source_hash" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 2 NOT NULL,
	"lease_owner" text,
	"lease_token" text,
	"lease_expires_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone,
	"result" jsonb,
	"last_error" text,
	"error_category" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_fact_intake_jobs_source_kind_check" CHECK ("profile_fact_intake_jobs"."source_kind" in ('onboarding', 'settings')),
	CONSTRAINT "profile_fact_intake_jobs_status_check" CHECK ("profile_fact_intake_jobs"."status" in ('queued', 'running', 'completed', 'failed')),
	CONSTRAINT "profile_fact_intake_jobs_attempts_check" CHECK ("profile_fact_intake_jobs"."attempts" >= 0 and "profile_fact_intake_jobs"."max_attempts" > 0)
);
--> statement-breakpoint
ALTER TABLE "learner_facts" DROP CONSTRAINT "learner_facts_category_check";--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "facts_intake_status" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "facts_intake_job_id" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "facts_intake_message" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "facts_intake_updated_at" timestamp with time zone;--> statement-breakpoint
UPDATE "learner_profiles"
SET
	"facts_intake_status" = CASE
		WHEN "knowledge_background_skipped_at" IS NOT NULL OR "onboarding_skipped_at" IS NOT NULL THEN 'skipped'
		ELSE 'completed'
	END,
	"facts_intake_updated_at" = COALESCE("updated_at", now())
WHERE "knowledge_background" IS NOT NULL
	OR "knowledge_background_skipped_at" IS NOT NULL
	OR "onboarding_completed_at" IS NOT NULL
	OR "onboarding_skipped_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_fact_intake_jobs" ADD CONSTRAINT "profile_fact_intake_jobs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_fact_intake_jobs_active_owner_uidx" ON "profile_fact_intake_jobs" USING btree ("owner_id") WHERE "profile_fact_intake_jobs"."status" in ('queued', 'running');--> statement-breakpoint
CREATE UNIQUE INDEX "profile_fact_intake_jobs_lease_token_uidx" ON "profile_fact_intake_jobs" USING btree ("lease_token");--> statement-breakpoint
CREATE INDEX "profile_fact_intake_jobs_owner_status_updated_idx" ON "profile_fact_intake_jobs" USING btree ("owner_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "profile_fact_intake_jobs_status_lease_idx" ON "profile_fact_intake_jobs" USING btree ("status","lease_expires_at");--> statement-breakpoint
ALTER TABLE "learner_facts" ADD CONSTRAINT "learner_facts_category_check" CHECK ("learner_facts"."category" in ('preference', 'prior_knowledge', 'learning_gap', 'interest', 'goal', 'profile_context'));--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_facts_intake_status_check" CHECK ("learner_profiles"."facts_intake_status" is null or "learner_profiles"."facts_intake_status" in ('pending', 'completed', 'skipped', 'failed'));
