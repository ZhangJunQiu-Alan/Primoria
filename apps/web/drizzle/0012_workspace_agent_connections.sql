CREATE TABLE "workspace_agent_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"owner_id" text NOT NULL,
	"scope" text NOT NULL,
	"display_name" text NOT NULL,
	"transport" text NOT NULL,
	"config_ref" text NOT NULL,
	"allowed_tool_names" jsonb NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_agent_connections" ADD CONSTRAINT "workspace_agent_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_connections" ADD CONSTRAINT "workspace_agent_connections_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workspace_agent_connections_owner_scope_idx" ON "workspace_agent_connections" USING btree ("owner_id","scope");
--> statement-breakpoint
CREATE INDEX "workspace_agent_connections_workspace_scope_idx" ON "workspace_agent_connections" USING btree ("workspace_id","scope");
