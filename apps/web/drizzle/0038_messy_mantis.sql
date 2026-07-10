ALTER TABLE "learner_profiles" ADD COLUMN "goal_positioning_attempt_id" text;--> statement-breakpoint
UPDATE "learner_profiles"
SET "goal_positioning_attempt_id" = 'legacy_' || md5(
  "owner_id" || ':' || coalesce("goal_positioning_updated_at"::text, '') || ':' || random()::text
)
WHERE "goal_positioning_status" = 'pending'
  AND "goal_positioning_attempt_id" IS NULL;
