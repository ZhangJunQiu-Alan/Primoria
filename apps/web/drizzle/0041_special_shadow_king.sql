CREATE TABLE "course_share_links" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"course_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "imported_from_share_id" text;--> statement-breakpoint
ALTER TABLE "course_share_links" ADD CONSTRAINT "course_share_links_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_share_links" ADD CONSTRAINT "course_share_links_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_share_links_token_uidx" ON "course_share_links" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "course_share_links_course_uidx" ON "course_share_links" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_owner_imported_share_uidx" ON "courses" USING btree ("owner_id","imported_from_share_id") WHERE "courses"."imported_from_share_id" IS NOT NULL;