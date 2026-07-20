ALTER TABLE "learner_profiles" ADD COLUMN "education_stage" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "curriculum_system" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "education_context_source" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "education_context_confirmed_at" timestamp with time zone;