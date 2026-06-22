CREATE TABLE "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"topic_id" text,
	"title" text NOT NULL,
	"role" text DEFAULT 'new' NOT NULL,
	"progress" text DEFAULT 'not_started' NOT NULL,
	"sort_key" double precision NOT NULL,
	"triggered_from" text,
	"blocks" jsonb NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_edit_events" ADD COLUMN "lesson_id" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "anchor_concept_id" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "graph_id" text;--> statement-breakpoint
ALTER TABLE "learning_events" ADD COLUMN "lesson_id" text;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD COLUMN "lesson_id" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lessons_course_sort_idx" ON "lessons" USING btree ("course_id","sort_key");--> statement-breakpoint
CREATE INDEX "lessons_owner_idx" ON "lessons" USING btree ("owner_id");