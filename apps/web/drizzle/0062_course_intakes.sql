CREATE TABLE "course_intakes" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"query" text NOT NULL,
	"graph_id" text,
	"language" text NOT NULL,
	"assessment" jsonb NOT NULL,
	"answers" jsonb,
	"course_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_intakes" ADD CONSTRAINT "course_intakes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_intakes" ADD CONSTRAINT "course_intakes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_intakes_owner_fingerprint_uidx" ON "course_intakes" USING btree ("owner_id","fingerprint");--> statement-breakpoint
CREATE INDEX "course_intakes_course_idx" ON "course_intakes" USING btree ("course_id");