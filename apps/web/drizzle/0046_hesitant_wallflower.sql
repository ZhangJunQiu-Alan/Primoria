CREATE TABLE "interactive_component_quotas" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"in_flight" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interactive_component_quotas_request_count_check" CHECK ("interactive_component_quotas"."request_count" >= 0),
	CONSTRAINT "interactive_component_quotas_in_flight_check" CHECK ("interactive_component_quotas"."in_flight" >= 0)
);
--> statement-breakpoint
CREATE TABLE "interactive_component_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"response_status" integer,
	"response" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interactive_component_requests_status_check" CHECK ("interactive_component_requests"."status" in ('running', 'completed', 'failed')),
	CONSTRAINT "interactive_component_requests_response_status_check" CHECK ("interactive_component_requests"."response_status" is null or ("interactive_component_requests"."response_status" >= 200 and "interactive_component_requests"."response_status" <= 599))
);
--> statement-breakpoint
ALTER TABLE "interactive_component_quotas" ADD CONSTRAINT "interactive_component_quotas_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactive_component_requests" ADD CONSTRAINT "interactive_component_requests_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "interactive_component_requests_owner_key_uidx" ON "interactive_component_requests" USING btree ("owner_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "interactive_component_requests_owner_status_idx" ON "interactive_component_requests" USING btree ("owner_id","status","started_at");--> statement-breakpoint
CREATE INDEX "interactive_component_requests_expires_idx" ON "interactive_component_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "learning_events_type_created_idx" ON "learning_events" USING btree ("type","created_at");--> statement-breakpoint
DO $$
DECLARE
	violations jsonb;
BEGIN
	SELECT jsonb_build_object(
		'courses', (SELECT count(*) FROM "courses" WHERE "estimated_minutes" < 0 OR "version" < 1),
		'extractor_jobs', (SELECT count(*) FROM "extractor_jobs" WHERE "status" NOT IN ('queued', 'running', 'completed', 'failed') OR "attempts" < 0 OR "max_attempts" <= 0),
		'generated_topic_graphs', (SELECT count(*) FROM "generated_topic_graphs" WHERE "status" NOT IN ('candidate', 'promoted', 'retired') OR "usage_count" < 1),
		'learner_facts', (SELECT count(*) FROM "learner_facts" WHERE "category" NOT IN ('preference', 'prior_knowledge', 'learning_gap', 'goal') OR "status" NOT IN ('active', 'dismissed') OR "confidence" < 0 OR "confidence" > 1 OR "occurrences" < 1),
		'learning_progress_jobs', (SELECT count(*) FROM "learning_progress_jobs" WHERE "status" NOT IN ('queued', 'running', 'completed', 'failed') OR "stage" NOT IN ('queued', 'mastery', 'deciding', 'completed', 'failed') OR "attempts" < 0 OR "max_attempts" <= 0 OR "decision_status" NOT IN ('none', 'pending', 'accepted', 'dismissed')),
		'lesson_generation_checkpoints', (SELECT count(*) FROM "lesson_generation_checkpoints" WHERE "kind" NOT IN ('plan', 'batch') OR "ir_version" < 1),
		'lesson_generation_jobs', (SELECT count(*) FROM "lesson_generation_jobs" WHERE "status" NOT IN ('queued', 'running', 'completed', 'failed') OR "stage" NOT IN ('queued', 'planning', 'writing', 'imaging', 'validating', 'saving', 'completed', 'failed') OR "attempts" < 0 OR "max_attempts" <= 0 OR "progress_completed" < 0 OR "progress_total" < 0 OR "progress_completed" > "progress_total"),
		'lessons', (SELECT count(*) FROM "lessons" WHERE "role" NOT IN ('new', 'review', 'remediation') OR "progress" NOT IN ('not_started', 'in_progress', 'completed') OR "status" NOT IN ('planned', 'generating', 'generated') OR "estimated_minutes" < 0 OR "version" < 1),
		'quiz_attempts', (SELECT count(*) FROM "quiz_attempts" WHERE "total" <= 0 OR "score" < 0 OR "score" > "total"),
		'user_concept_mastery', (SELECT count(*) FROM "user_concept_mastery" WHERE "status" NOT IN ('untested', 'weak', 'learning', 'mastered') OR "score" < 0 OR "score" > 1)
	) INTO violations;
	IF EXISTS (SELECT 1 FROM jsonb_each_text(violations) WHERE value::bigint > 0) THEN
		RAISE EXCEPTION 'P1 constraint preflight failed: %', violations;
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_estimated_minutes_check" CHECK ("courses"."estimated_minutes" >= 0);--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_version_check" CHECK ("courses"."version" >= 1);--> statement-breakpoint
ALTER TABLE "extractor_jobs" ADD CONSTRAINT "extractor_jobs_status_check" CHECK ("extractor_jobs"."status" in ('queued', 'running', 'completed', 'failed'));--> statement-breakpoint
ALTER TABLE "extractor_jobs" ADD CONSTRAINT "extractor_jobs_attempts_check" CHECK ("extractor_jobs"."attempts" >= 0 and "extractor_jobs"."max_attempts" > 0);--> statement-breakpoint
ALTER TABLE "generated_topic_graphs" ADD CONSTRAINT "generated_topic_graphs_status_check" CHECK ("generated_topic_graphs"."status" in ('candidate', 'promoted', 'retired'));--> statement-breakpoint
ALTER TABLE "generated_topic_graphs" ADD CONSTRAINT "generated_topic_graphs_usage_count_check" CHECK ("generated_topic_graphs"."usage_count" >= 1);--> statement-breakpoint
ALTER TABLE "learner_facts" ADD CONSTRAINT "learner_facts_category_check" CHECK ("learner_facts"."category" in ('preference', 'prior_knowledge', 'learning_gap', 'goal'));--> statement-breakpoint
ALTER TABLE "learner_facts" ADD CONSTRAINT "learner_facts_status_check" CHECK ("learner_facts"."status" in ('active', 'dismissed'));--> statement-breakpoint
ALTER TABLE "learner_facts" ADD CONSTRAINT "learner_facts_confidence_check" CHECK ("learner_facts"."confidence" is null or ("learner_facts"."confidence" >= 0 and "learner_facts"."confidence" <= 1));--> statement-breakpoint
ALTER TABLE "learner_facts" ADD CONSTRAINT "learner_facts_occurrences_check" CHECK ("learner_facts"."occurrences" >= 1);--> statement-breakpoint
ALTER TABLE "learning_progress_jobs" ADD CONSTRAINT "learning_progress_jobs_status_check" CHECK ("learning_progress_jobs"."status" in ('queued', 'running', 'completed', 'failed'));--> statement-breakpoint
ALTER TABLE "learning_progress_jobs" ADD CONSTRAINT "learning_progress_jobs_stage_check" CHECK ("learning_progress_jobs"."stage" in ('queued', 'mastery', 'deciding', 'completed', 'failed'));--> statement-breakpoint
ALTER TABLE "learning_progress_jobs" ADD CONSTRAINT "learning_progress_jobs_attempts_check" CHECK ("learning_progress_jobs"."attempts" >= 0 and "learning_progress_jobs"."max_attempts" > 0);--> statement-breakpoint
ALTER TABLE "learning_progress_jobs" ADD CONSTRAINT "learning_progress_jobs_decision_status_check" CHECK ("learning_progress_jobs"."decision_status" in ('none', 'pending', 'accepted', 'dismissed'));--> statement-breakpoint
ALTER TABLE "lesson_generation_checkpoints" ADD CONSTRAINT "lesson_generation_checkpoints_kind_check" CHECK ("lesson_generation_checkpoints"."kind" in ('plan', 'batch'));--> statement-breakpoint
ALTER TABLE "lesson_generation_checkpoints" ADD CONSTRAINT "lesson_generation_checkpoints_ir_version_check" CHECK ("lesson_generation_checkpoints"."ir_version" >= 1);--> statement-breakpoint
ALTER TABLE "lesson_generation_jobs" ADD CONSTRAINT "lesson_generation_jobs_status_check" CHECK ("lesson_generation_jobs"."status" in ('queued', 'running', 'completed', 'failed'));--> statement-breakpoint
ALTER TABLE "lesson_generation_jobs" ADD CONSTRAINT "lesson_generation_jobs_stage_check" CHECK ("lesson_generation_jobs"."stage" in ('queued', 'planning', 'writing', 'imaging', 'validating', 'saving', 'completed', 'failed'));--> statement-breakpoint
ALTER TABLE "lesson_generation_jobs" ADD CONSTRAINT "lesson_generation_jobs_attempts_check" CHECK ("lesson_generation_jobs"."attempts" >= 0 and "lesson_generation_jobs"."max_attempts" > 0);--> statement-breakpoint
ALTER TABLE "lesson_generation_jobs" ADD CONSTRAINT "lesson_generation_jobs_progress_check" CHECK ("lesson_generation_jobs"."progress_completed" >= 0 and "lesson_generation_jobs"."progress_total" >= 0 and "lesson_generation_jobs"."progress_completed" <= "lesson_generation_jobs"."progress_total");--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_role_check" CHECK ("lessons"."role" in ('new', 'review', 'remediation'));--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_progress_check" CHECK ("lessons"."progress" in ('not_started', 'in_progress', 'completed'));--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_status_check" CHECK ("lessons"."status" in ('planned', 'generating', 'generated'));--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_estimated_minutes_check" CHECK ("lessons"."estimated_minutes" is null or "lessons"."estimated_minutes" >= 0);--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_version_check" CHECK ("lessons"."version" >= 1);--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_score_check" CHECK ("quiz_attempts"."total" > 0 and "quiz_attempts"."score" >= 0 and "quiz_attempts"."score" <= "quiz_attempts"."total");--> statement-breakpoint
ALTER TABLE "user_concept_mastery" DROP CONSTRAINT IF EXISTS "user_concept_mastery_status_check";--> statement-breakpoint
ALTER TABLE "user_concept_mastery" ADD CONSTRAINT "user_concept_mastery_status_check" CHECK ("user_concept_mastery"."status" in ('untested', 'weak', 'learning', 'mastered'));--> statement-breakpoint
ALTER TABLE "user_concept_mastery" ADD CONSTRAINT "user_concept_mastery_score_check" CHECK ("user_concept_mastery"."score" is null or ("user_concept_mastery"."score" >= 0 and "user_concept_mastery"."score" <= 1));
