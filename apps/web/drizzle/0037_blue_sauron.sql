ALTER TABLE "learner_profiles" ADD COLUMN "onboarding_course_status" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "onboarding_course_message" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "onboarding_course_updated_at" timestamp with time zone;