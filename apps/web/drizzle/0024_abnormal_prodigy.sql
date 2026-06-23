CREATE TABLE "lesson_generation_checkpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"checkpoint_key" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"ir_version" integer NOT NULL,
	"prompt_version" text NOT NULL,
	"compiler_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_generation_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"course_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"stage" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 2 NOT NULL,
	"progress_completed" integer DEFAULT 0 NOT NULL,
	"progress_total" integer DEFAULT 0 NOT NULL,
	"lease_owner" text,
	"lease_token" text,
	"lease_expires_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone,
	"last_error" text,
	"error_category" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_generation_checkpoints" ADD CONSTRAINT "lesson_generation_checkpoints_job_id_lesson_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."lesson_generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_generation_jobs" ADD CONSTRAINT "lesson_generation_jobs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_generation_jobs" ADD CONSTRAINT "lesson_generation_jobs_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_generation_jobs" ADD CONSTRAINT "lesson_generation_jobs_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_generation_checkpoints_job_key_uidx" ON "lesson_generation_checkpoints" USING btree ("job_id","checkpoint_key");--> statement-breakpoint
CREATE INDEX "lesson_generation_checkpoints_job_kind_idx" ON "lesson_generation_checkpoints" USING btree ("job_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_generation_jobs_lesson_id_uidx" ON "lesson_generation_jobs" USING btree ("lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_generation_jobs_lease_token_uidx" ON "lesson_generation_jobs" USING btree ("lease_token");--> statement-breakpoint
CREATE INDEX "lesson_generation_jobs_owner_status_updated_idx" ON "lesson_generation_jobs" USING btree ("owner_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "lesson_generation_jobs_status_lease_idx" ON "lesson_generation_jobs" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE INDEX "lesson_generation_jobs_course_status_idx" ON "lesson_generation_jobs" USING btree ("course_id","status");--> statement-breakpoint
-- engineering doc §4.3.3: clear legacy synchronous claims stuck in 'generating'
-- so the recoverable job path can re-enqueue them cleanly.
UPDATE "lessons" SET "status" = 'planned', "updated_at" = now() WHERE "status" = 'generating';