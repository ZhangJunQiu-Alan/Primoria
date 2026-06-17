CREATE TABLE "workspace_agent_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"run_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"agent_profile_id" text NOT NULL,
	"agent_member_id" text,
	"tool_name" text NOT NULL,
	"status" text NOT NULL,
	"input" jsonb,
	"policy" jsonb,
	"deep_agent_thread_id" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"decision_reason" text
);
--> statement-breakpoint
ALTER TABLE "workspace_agent_approvals" ADD CONSTRAINT "workspace_agent_approvals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_approvals" ADD CONSTRAINT "workspace_agent_approvals_thread_id_workspace_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."workspace_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_approvals" ADD CONSTRAINT "workspace_agent_approvals_run_id_workspace_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workspace_agent_runs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_approvals" ADD CONSTRAINT "workspace_agent_approvals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_approvals" ADD CONSTRAINT "workspace_agent_approvals_agent_profile_id_workspace_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "public"."workspace_agent_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_approvals" ADD CONSTRAINT "workspace_agent_approvals_agent_member_id_workspace_members_id_fk" FOREIGN KEY ("agent_member_id") REFERENCES "public"."workspace_members"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workspace_agent_approvals_run_status_idx" ON "workspace_agent_approvals" USING btree ("run_id","status");
--> statement-breakpoint
CREATE INDEX "workspace_agent_approvals_workspace_status_idx" ON "workspace_agent_approvals" USING btree ("workspace_id","status");
--> statement-breakpoint
CREATE INDEX "workspace_agent_approvals_thread_requested_idx" ON "workspace_agent_approvals" USING btree ("thread_id","requested_at");
