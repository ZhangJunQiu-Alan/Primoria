CREATE TABLE "course_share_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"share_id" text NOT NULL,
	"version" integer NOT NULL,
	"token" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "course_share_versions_version_check" CHECK ("course_share_versions"."version" >= 1)
);
--> statement-breakpoint
DROP INDEX "course_share_links_token_uidx";--> statement-breakpoint
ALTER TABLE "course_share_versions" ADD CONSTRAINT "course_share_versions_share_id_course_share_links_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."course_share_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "course_share_versions" ("id", "share_id", "version", "token", "snapshot", "revoked_at", "created_at")
SELECT "id" || '_v1', "id", 1, "token", "snapshot", "revoked_at", "updated_at"
FROM "course_share_links";--> statement-breakpoint
CREATE UNIQUE INDEX "course_share_versions_token_uidx" ON "course_share_versions" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "course_share_versions_share_version_uidx" ON "course_share_versions" USING btree ("share_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "course_share_versions_one_active_uidx" ON "course_share_versions" USING btree ("share_id") WHERE "course_share_versions"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "course_share_versions_share_created_idx" ON "course_share_versions" USING btree ("share_id","created_at");--> statement-breakpoint
CREATE INDEX "course_share_links_owner_idx" ON "course_share_links" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "course_share_links" DROP COLUMN "token";--> statement-breakpoint
ALTER TABLE "course_share_links" DROP COLUMN "snapshot";--> statement-breakpoint
ALTER TABLE "course_share_links" DROP COLUMN "revoked_at";
