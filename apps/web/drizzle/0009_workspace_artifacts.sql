CREATE TABLE "workspace_artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"source_message_id" text NOT NULL,
	"source_run_id" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_artifacts" ADD CONSTRAINT "workspace_artifacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_artifacts" ADD CONSTRAINT "workspace_artifacts_thread_id_workspace_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."workspace_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_artifacts" ADD CONSTRAINT "workspace_artifacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_artifacts" ADD CONSTRAINT "workspace_artifacts_source_message_id_workspace_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."workspace_messages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workspace_artifacts_workspace_created_idx" ON "workspace_artifacts" USING btree ("workspace_id","created_at");
--> statement-breakpoint
CREATE INDEX "workspace_artifacts_thread_created_idx" ON "workspace_artifacts" USING btree ("thread_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_artifacts_source_message_uidx" ON "workspace_artifacts" USING btree ("source_message_id");
--> statement-breakpoint
CREATE INDEX "workspace_artifacts_source_run_idx" ON "workspace_artifacts" USING btree ("source_run_id");
--> statement-breakpoint
INSERT INTO "workspace_artifacts" (
	"id",
	"workspace_id",
	"thread_id",
	"owner_id",
	"kind",
	"title",
	"description",
	"source_message_id",
	"source_run_id",
	"payload",
	"created_at",
	"updated_at"
)
SELECT
	'wart_' || "workspace_messages"."id",
	"workspace_messages"."workspace_id",
	"workspace_messages"."thread_id",
	"workspace_messages"."owner_id",
	CASE
		WHEN "workspace_messages"."artifact"->>'type' = 'app' THEN 'app'
		WHEN EXISTS (
			SELECT 1
			FROM jsonb_array_elements_text(COALESCE("workspace_messages"."artifact"->'groups', '[]'::jsonb)) AS "artifact_group"("value")
			WHERE lower(trim("artifact_group"."value")) = 'course'
		) THEN 'course'
		WHEN EXISTS (
			SELECT 1
			FROM jsonb_array_elements_text(COALESCE("workspace_messages"."artifact"->'groups', '[]'::jsonb)) AS "artifact_group"("value")
			WHERE lower(trim("artifact_group"."value")) = 'task result'
		) THEN 'task_result'
		ELSE 'saved_artifact'
	END,
	COALESCE(NULLIF("workspace_messages"."artifact"->>'title', ''), 'Untitled artifact'),
	COALESCE(NULLIF("workspace_messages"."artifact"->>'description', ''), "workspace_messages"."content", 'Imported artifact'),
	"workspace_messages"."id",
	NULL,
	"workspace_messages"."artifact",
	"workspace_messages"."created_at",
	"workspace_messages"."created_at"
FROM "workspace_messages"
WHERE "workspace_messages"."artifact" IS NOT NULL
ON CONFLICT ("source_message_id") DO NOTHING;
