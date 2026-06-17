CREATE TABLE "workspace_agent_memories" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"user_id" text,
	"thread_id" text,
	"agent_profile_id" text NOT NULL,
	"scope" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"source_run_id" text,
	"source_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "workspace_agent_memories" ADD CONSTRAINT "workspace_agent_memories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_memories" ADD CONSTRAINT "workspace_agent_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_memories" ADD CONSTRAINT "workspace_agent_memories_thread_id_workspace_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."workspace_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_memories" ADD CONSTRAINT "workspace_agent_memories_agent_profile_id_workspace_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "public"."workspace_agent_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_memories" ADD CONSTRAINT "workspace_agent_memories_source_run_id_workspace_agent_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."workspace_agent_runs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_memories" ADD CONSTRAINT "workspace_agent_memories_source_message_id_workspace_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."workspace_messages"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workspace_agent_memories_workspace_scope_idx" ON "workspace_agent_memories" USING btree ("workspace_id","scope");
--> statement-breakpoint
CREATE INDEX "workspace_agent_memories_user_scope_idx" ON "workspace_agent_memories" USING btree ("user_id","scope");
--> statement-breakpoint
CREATE INDEX "workspace_agent_memories_thread_idx" ON "workspace_agent_memories" USING btree ("thread_id");
--> statement-breakpoint
CREATE INDEX "workspace_agent_memories_profile_idx" ON "workspace_agent_memories" USING btree ("agent_profile_id");
