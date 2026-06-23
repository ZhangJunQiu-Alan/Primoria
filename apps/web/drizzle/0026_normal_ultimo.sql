-- Preflight before any write: a non-empty legacy UUID-keyed mastery table needs
-- an explicit data reconciliation plan and must not leave a partial migration.
DO $$
DECLARE
	owner_id_type text;
	legacy_has_rows boolean := false;
BEGIN
	SELECT data_type INTO owner_id_type
	FROM information_schema.columns
	WHERE table_schema = 'public'
		AND table_name = 'user_concept_mastery'
		AND column_name = 'owner_id';

	IF owner_id_type IS NOT NULL AND owner_id_type <> 'text' THEN
		EXECUTE 'SELECT EXISTS (SELECT 1 FROM "user_concept_mastery" LIMIT 1)' INTO legacy_has_rows;
		IF legacy_has_rows THEN
			RAISE EXCEPTION 'refusing to replace non-empty legacy user_concept_mastery table (owner_id type: %)', owner_id_type;
		END IF;
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE "learning_progress_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"course_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"graph_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"stage" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 2 NOT NULL,
	"decision" jsonb,
	"decision_status" text DEFAULT 'none' NOT NULL,
	"lease_owner" text,
	"lease_token" text,
	"lease_expires_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone,
	"last_error" text,
	"error_category" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- user_concept_mastery predates the app-owned auth schema. The legacy Supabase
-- table uses auth.users UUIDs, while the current app and background workers use
-- public.users text IDs. Refuse to discard a non-empty legacy table; the known
-- dev/prod table is empty and can be replaced safely.
DO $$
DECLARE
	owner_id_type text;
BEGIN
	SELECT data_type INTO owner_id_type
	FROM information_schema.columns
	WHERE table_schema = 'public'
		AND table_name = 'user_concept_mastery'
		AND column_name = 'owner_id';

	IF owner_id_type IS NOT NULL AND owner_id_type <> 'text' THEN
		EXECUTE 'DROP TABLE "user_concept_mastery" CASCADE';
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_concept_mastery" (
	"owner_id" text NOT NULL,
	"graph_id" text NOT NULL,
	"concept_id" text NOT NULL,
	"status" text DEFAULT 'untested' NOT NULL,
	"score" double precision,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_progress_jobs" ADD CONSTRAINT "learning_progress_jobs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress_jobs" ADD CONSTRAINT "learning_progress_jobs_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress_jobs" ADD CONSTRAINT "learning_progress_jobs_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint constraint_row
		JOIN pg_class source_table ON source_table.oid = constraint_row.conrelid
		JOIN pg_class target_table ON target_table.oid = constraint_row.confrelid
		JOIN pg_namespace source_schema ON source_schema.oid = source_table.relnamespace
		JOIN pg_namespace target_schema ON target_schema.oid = target_table.relnamespace
		WHERE constraint_row.contype = 'f'
			AND source_schema.nspname = 'public'
			AND source_table.relname = 'user_concept_mastery'
			AND target_schema.nspname = 'public'
			AND target_table.relname = 'users'
	) THEN
		ALTER TABLE "user_concept_mastery" ADD CONSTRAINT "user_concept_mastery_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "user_concept_mastery" DROP CONSTRAINT IF EXISTS "user_concept_mastery_status_check";--> statement-breakpoint
ALTER TABLE "user_concept_mastery" ADD CONSTRAINT "user_concept_mastery_status_check" CHECK ("status" IN ('untested', 'weak', 'learning', 'mastered'));--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.knowledge_graph_concepts') IS NOT NULL
		AND NOT EXISTS (
			SELECT 1
			FROM pg_constraint
			WHERE conrelid = 'public.user_concept_mastery'::regclass
				AND conname = 'user_concept_mastery_graph_id_concept_id_fkey'
		)
	THEN
		ALTER TABLE "user_concept_mastery" ADD CONSTRAINT "user_concept_mastery_graph_id_concept_id_fkey" FOREIGN KEY ("graph_id", "concept_id") REFERENCES "public"."knowledge_graph_concepts"("graph_id", "concept_id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX "learning_progress_jobs_lesson_id_uidx" ON "learning_progress_jobs" USING btree ("lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_progress_jobs_lease_token_uidx" ON "learning_progress_jobs" USING btree ("lease_token");--> statement-breakpoint
CREATE INDEX "learning_progress_jobs_owner_status_updated_idx" ON "learning_progress_jobs" USING btree ("owner_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "learning_progress_jobs_status_lease_idx" ON "learning_progress_jobs" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE INDEX "learning_progress_jobs_course_decision_idx" ON "learning_progress_jobs" USING btree ("course_id","decision_status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_concept_mastery_owner_graph_concept_uidx" ON "user_concept_mastery" USING btree ("owner_id","graph_id","concept_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_concept_mastery_owner_graph_idx" ON "user_concept_mastery" USING btree ("owner_id","graph_id");
