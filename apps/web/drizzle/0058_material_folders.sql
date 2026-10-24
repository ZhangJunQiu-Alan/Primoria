CREATE TABLE "material_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'subject' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_folders_kind_check" CHECK ("material_folders"."kind" in ('subject', 'unsorted'))
);
--> statement-breakpoint
ALTER TABLE "material_folders" ADD CONSTRAINT "material_folders_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "material_folders_owner_unsorted_uidx" ON "material_folders" USING btree ("owner_id") WHERE "material_folders"."kind" = 'unsorted';--> statement-breakpoint
CREATE UNIQUE INDEX "material_folders_owner_name_uidx" ON "material_folders" USING btree ("owner_id",lower("name")) WHERE "material_folders"."kind" = 'subject';--> statement-breakpoint
CREATE INDEX "material_folders_owner_created_idx" ON "material_folders" USING btree ("owner_id","created_at");--> statement-breakpoint
-- folder_id starts nullable so existing materials can be backfilled into each
-- owner's system "unsorted" folder (in upload order) before NOT NULL applies.
ALTER TABLE "learning_materials" ADD COLUMN "folder_id" text;--> statement-breakpoint
ALTER TABLE "learning_materials" ADD COLUMN "role" text DEFAULT 'lecture' NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_materials" ADD COLUMN "position" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_materials" ADD COLUMN "lecture_number" double precision;--> statement-breakpoint
ALTER TABLE "learning_materials" ADD COLUMN "order_source" text DEFAULT 'upload' NOT NULL;--> statement-breakpoint
INSERT INTO "material_folders" ("id", "owner_id", "name", "kind", "created_at", "updated_at")
SELECT 'mf_unsorted_' || md5(owners."owner_id"), owners."owner_id", 'Unsorted', 'unsorted', now(), now()
FROM (SELECT DISTINCT "owner_id" FROM "learning_materials") AS owners
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "learning_materials" AS m
SET "folder_id" = f."id",
	"position" = ordered."rn"
FROM "material_folders" AS f,
	(SELECT "id", row_number() OVER (PARTITION BY "owner_id" ORDER BY "created_at", "id") AS "rn" FROM "learning_materials") AS ordered
WHERE f."owner_id" = m."owner_id"
	AND f."kind" = 'unsorted'
	AND ordered."id" = m."id"
	AND m."folder_id" IS NULL;--> statement-breakpoint
ALTER TABLE "learning_materials" ALTER COLUMN "folder_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_folder_id_material_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."material_folders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_materials_folder_position_idx" ON "learning_materials" USING btree ("folder_id","position");--> statement-breakpoint
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_role_check" CHECK ("learning_materials"."role" in ('lecture', 'reference'));--> statement-breakpoint
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_order_source_check" CHECK ("learning_materials"."order_source" in ('filename', 'ai', 'manual', 'upload'));
