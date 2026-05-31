CREATE TABLE "workspace_agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"agent_profile_id" text NOT NULL,
	"agent_member_id" text,
	"trigger" text NOT NULL,
	"status" text NOT NULL,
	"input_message_id" text,
	"output_message_id" text,
	"task_id" text,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workspace_agent_run_events" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_agent_runs" ADD CONSTRAINT "workspace_agent_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_runs" ADD CONSTRAINT "workspace_agent_runs_thread_id_workspace_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."workspace_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_runs" ADD CONSTRAINT "workspace_agent_runs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_runs" ADD CONSTRAINT "workspace_agent_runs_agent_profile_id_workspace_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "public"."workspace_agent_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_runs" ADD CONSTRAINT "workspace_agent_runs_agent_member_id_workspace_members_id_fk" FOREIGN KEY ("agent_member_id") REFERENCES "public"."workspace_members"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_runs" ADD CONSTRAINT "workspace_agent_runs_input_message_id_workspace_messages_id_fk" FOREIGN KEY ("input_message_id") REFERENCES "public"."workspace_messages"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_runs" ADD CONSTRAINT "workspace_agent_runs_output_message_id_workspace_messages_id_fk" FOREIGN KEY ("output_message_id") REFERENCES "public"."workspace_messages"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_runs" ADD CONSTRAINT "workspace_agent_runs_task_id_workspace_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."workspace_tasks"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_run_events" ADD CONSTRAINT "workspace_agent_run_events_run_id_workspace_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workspace_agent_runs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_run_events" ADD CONSTRAINT "workspace_agent_run_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_run_events" ADD CONSTRAINT "workspace_agent_run_events_thread_id_workspace_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."workspace_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_run_events" ADD CONSTRAINT "workspace_agent_run_events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workspace_agent_runs_workspace_status_idx" ON "workspace_agent_runs" USING btree ("workspace_id","status");
--> statement-breakpoint
CREATE INDEX "workspace_agent_runs_thread_started_idx" ON "workspace_agent_runs" USING btree ("thread_id","started_at");
--> statement-breakpoint
CREATE INDEX "workspace_agent_runs_profile_started_idx" ON "workspace_agent_runs" USING btree ("agent_profile_id","started_at");
--> statement-breakpoint
CREATE INDEX "workspace_agent_run_events_run_created_idx" ON "workspace_agent_run_events" USING btree ("run_id","created_at");
--> statement-breakpoint
CREATE INDEX "workspace_agent_run_events_thread_created_idx" ON "workspace_agent_run_events" USING btree ("thread_id","created_at");
