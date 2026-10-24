CREATE TABLE "material_kg_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"material_id" text NOT NULL,
	"folder_id" text NOT NULL,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_kg_jobs_status_check" CHECK ("material_kg_jobs"."status" in ('queued', 'running', 'completed', 'failed')),
	CONSTRAINT "material_kg_jobs_attempts_check" CHECK ("material_kg_jobs"."attempts" >= 0 and "material_kg_jobs"."max_attempts" > 0)
);
--> statement-breakpoint
CREATE TABLE "material_subgraphs" (
	"material_id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"folder_id" text NOT NULL,
	"graph" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_materials" ADD COLUMN "kg_status" text DEFAULT 'skipped' NOT NULL;--> statement-breakpoint
ALTER TABLE "material_topic_graphs" ADD COLUMN "folder_id" text;--> statement-breakpoint
ALTER TABLE "material_kg_jobs" ADD CONSTRAINT "material_kg_jobs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_kg_jobs" ADD CONSTRAINT "material_kg_jobs_material_id_learning_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."learning_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_kg_jobs" ADD CONSTRAINT "material_kg_jobs_folder_id_material_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."material_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_subgraphs" ADD CONSTRAINT "material_subgraphs_material_id_learning_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."learning_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_subgraphs" ADD CONSTRAINT "material_subgraphs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_subgraphs" ADD CONSTRAINT "material_subgraphs_folder_id_material_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."material_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "material_kg_jobs_material_uidx" ON "material_kg_jobs" USING btree ("material_id");--> statement-breakpoint
CREATE UNIQUE INDEX "material_kg_jobs_lease_token_uidx" ON "material_kg_jobs" USING btree ("lease_token");--> statement-breakpoint
CREATE INDEX "material_kg_jobs_status_lease_idx" ON "material_kg_jobs" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE INDEX "material_kg_jobs_folder_status_idx" ON "material_kg_jobs" USING btree ("folder_id","status");--> statement-breakpoint
CREATE INDEX "material_subgraphs_folder_idx" ON "material_subgraphs" USING btree ("owner_id","folder_id");--> statement-breakpoint
ALTER TABLE "material_topic_graphs" ADD CONSTRAINT "material_topic_graphs_folder_id_material_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."material_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "material_topic_graphs_folder_uidx" ON "material_topic_graphs" USING btree ("folder_id") WHERE "material_topic_graphs"."folder_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_kg_status_check" CHECK ("learning_materials"."kg_status" in ('pending', 'processing', 'ready', 'failed', 'skipped'));--> statement-breakpoint
-- Lectures already filed in subject folders get their per-lecture KG queued.
INSERT INTO "material_kg_jobs" ("id", "owner_id", "material_id", "folder_id")
SELECT 'mkgj_backfill_' || md5(m."id"), m."owner_id", m."id", m."folder_id"
FROM "learning_materials" m
JOIN "material_folders" f ON f."id" = m."folder_id"
WHERE f."kind" = 'subject' AND m."role" = 'lecture'
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "learning_materials" m SET "kg_status" = 'pending'
FROM "material_folders" f
WHERE f."id" = m."folder_id" AND f."kind" = 'subject' AND m."role" = 'lecture';
