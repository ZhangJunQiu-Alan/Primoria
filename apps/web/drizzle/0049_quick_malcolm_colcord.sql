DROP INDEX "courses_owner_graph_uidx";--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "scope_key" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "goal_target_concept_ids" jsonb;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "goal_scope" text;--> statement-breakpoint
UPDATE "courses"
SET "scope_key" = 'graph:' || "graph_id" || ':full'
WHERE "graph_id" IS NOT NULL AND "scope_key" IS NULL;--> statement-breakpoint
UPDATE "learner_profiles"
SET
  "goal_target_concept_ids" = CASE
    WHEN "goal_target_concept_id" IS NULL THEN '[]'::jsonb
    ELSE jsonb_build_array("goal_target_concept_id")
  END,
  "goal_scope" = CASE WHEN "goal_graph_id" IS NULL THEN NULL ELSE 'canonical' END
WHERE "goal_target_concept_ids" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "courses_owner_scope_uidx" ON "courses" USING btree ("owner_id","scope_key") WHERE "courses"."archived_at" IS NULL and "courses"."scope_key" IS NOT NULL;
