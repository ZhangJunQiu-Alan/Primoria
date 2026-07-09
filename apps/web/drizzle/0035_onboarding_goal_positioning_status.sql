ALTER TABLE "learner_profiles" ADD COLUMN "goal_positioning_status" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "goal_positioning_message" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "goal_positioning_candidates" jsonb;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "goal_positioning_updated_at" timestamp with time zone;
