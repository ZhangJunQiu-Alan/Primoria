CREATE TABLE "extractor_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"course_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"graph_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 2 NOT NULL,
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
CREATE TABLE "learner_facts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"text" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"confidence" double precision,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"source_lesson_id" text,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extractor_jobs" ADD CONSTRAINT "extractor_jobs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extractor_jobs" ADD CONSTRAINT "extractor_jobs_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extractor_jobs" ADD CONSTRAINT "extractor_jobs_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_facts" ADD CONSTRAINT "learner_facts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "extractor_jobs_lesson_id_uidx" ON "extractor_jobs" USING btree ("lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "extractor_jobs_lease_token_uidx" ON "extractor_jobs" USING btree ("lease_token");--> statement-breakpoint
CREATE INDEX "extractor_jobs_owner_status_updated_idx" ON "extractor_jobs" USING btree ("owner_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "extractor_jobs_status_lease_idx" ON "extractor_jobs" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE INDEX "learner_facts_owner_status_idx" ON "learner_facts" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "learner_facts_owner_category_idx" ON "learner_facts" USING btree ("owner_id","category");