CREATE TABLE "quiz_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"course_id" text NOT NULL,
	"block_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_attempts_owner_course_idx" ON "quiz_attempts" USING btree ("owner_id","course_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_block_idx" ON "quiz_attempts" USING btree ("block_id");