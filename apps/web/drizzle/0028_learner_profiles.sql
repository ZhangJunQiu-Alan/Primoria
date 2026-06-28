CREATE TABLE "learner_profiles" (
  "owner_id" text PRIMARY KEY NOT NULL,
  "learning_goal" text,
  "goal_graph_id" text,
  "goal_start_topic_id" text,
  "goal_target_concept_id" text,
  "goal_skipped_at" timestamp with time zone,
  "knowledge_background" text,
  "knowledge_background_skipped_at" timestamp with time zone,
  "tutor_style" text,
  "tutor_style_skipped_at" timestamp with time zone,
  "onboarding_completed_at" timestamp with time zone,
  "onboarding_skipped_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "learner_profiles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "learner_profiles_completed_idx" ON "learner_profiles" USING btree ("onboarding_completed_at");
