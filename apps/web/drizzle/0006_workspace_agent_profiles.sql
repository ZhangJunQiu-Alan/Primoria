CREATE TABLE "workspace_agent_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"display_name" text NOT NULL,
	"handle" text NOT NULL,
	"description" text NOT NULL,
	"visibility" text NOT NULL,
	"template_key" text,
	"system_prompt" text NOT NULL,
	"default_model" text,
	"memory_scope" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_agent_capabilities" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"kind" text NOT NULL,
	"source" text,
	"path" text,
	"tool_name" text,
	"connection_id" text,
	"agent_profile_id" text,
	"approval" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_agent_profiles" ADD CONSTRAINT "workspace_agent_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_profiles" ADD CONSTRAINT "workspace_agent_profiles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_capabilities" ADD CONSTRAINT "workspace_agent_capabilities_profile_id_workspace_agent_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."workspace_agent_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_capabilities" ADD CONSTRAINT "workspace_agent_capabilities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_capabilities" ADD CONSTRAINT "workspace_agent_capabilities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "agent_profile_id" text;
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_agent_profile_id_workspace_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "public"."workspace_agent_profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workspace_agent_profiles_workspace_idx" ON "workspace_agent_profiles" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "workspace_agent_profiles_owner_workspace_idx" ON "workspace_agent_profiles" USING btree ("owner_id","workspace_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_agent_profiles_workspace_handle_uidx" ON "workspace_agent_profiles" USING btree ("workspace_id","handle");
--> statement-breakpoint
CREATE INDEX "workspace_agent_capabilities_profile_idx" ON "workspace_agent_capabilities" USING btree ("profile_id");
--> statement-breakpoint
CREATE INDEX "workspace_agent_capabilities_workspace_idx" ON "workspace_agent_capabilities" USING btree ("workspace_id");
