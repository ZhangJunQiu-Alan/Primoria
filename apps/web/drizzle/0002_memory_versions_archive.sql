ALTER TABLE "courses" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_apps" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "learning_apps" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE TABLE "course_edit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"course_id" text NOT NULL,
	"block_id" text NOT NULL,
	"instruction" text NOT NULL,
	"before_block" jsonb NOT NULL,
	"after_block" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_edit_events" ADD CONSTRAINT "course_edit_events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_edit_events" ADD CONSTRAINT "course_edit_events_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_edit_events_owner_created_idx" ON "course_edit_events" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "course_edit_events_course_created_idx" ON "course_edit_events" USING btree ("course_id","created_at");--> statement-breakpoint
CREATE INDEX "courses_owner_archived_updated_idx" ON "courses" USING btree ("owner_id","archived_at","updated_at");--> statement-breakpoint
CREATE INDEX "learning_apps_owner_archived_updated_idx" ON "learning_apps" USING btree ("owner_id","archived_at","updated_at");
