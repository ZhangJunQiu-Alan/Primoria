CREATE TABLE "course_generation_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"course_id" text NOT NULL,
	"topic" text NOT NULL,
	"context_hint" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_generation_jobs" ADD CONSTRAINT "course_generation_jobs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_generation_jobs_owner_status_updated_idx" ON "course_generation_jobs" USING btree ("owner_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "course_generation_jobs_status_lease_idx" ON "course_generation_jobs" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "course_generation_jobs_course_id_uidx" ON "course_generation_jobs" USING btree ("course_id");