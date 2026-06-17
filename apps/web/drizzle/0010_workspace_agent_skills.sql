CREATE TABLE "workspace_agent_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"owner_id" text NOT NULL,
	"source" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"instructions" text NOT NULL,
	"markdown" text NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_agent_skill_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_id" text NOT NULL,
	"workspace_id" text,
	"owner_id" text NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"instructions" text NOT NULL,
	"markdown" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_agent_skills" ADD CONSTRAINT "workspace_agent_skills_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_skills" ADD CONSTRAINT "workspace_agent_skills_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_skill_versions" ADD CONSTRAINT "workspace_agent_skill_versions_skill_id_workspace_agent_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."workspace_agent_skills"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_skill_versions" ADD CONSTRAINT "workspace_agent_skill_versions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_agent_skill_versions" ADD CONSTRAINT "workspace_agent_skill_versions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workspace_agent_skills_workspace_idx" ON "workspace_agent_skills" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "workspace_agent_skills_owner_idx" ON "workspace_agent_skills" USING btree ("owner_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_agent_skills_workspace_slug_uidx" ON "workspace_agent_skills" USING btree ("source","workspace_id","slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_agent_skills_user_slug_uidx" ON "workspace_agent_skills" USING btree ("source","owner_id","slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_agent_skill_versions_skill_version_uidx" ON "workspace_agent_skill_versions" USING btree ("skill_id","version");
--> statement-breakpoint
CREATE INDEX "workspace_agent_skill_versions_skill_idx" ON "workspace_agent_skill_versions" USING btree ("skill_id");
--> statement-breakpoint
CREATE INDEX "workspace_agent_skill_versions_workspace_idx" ON "workspace_agent_skill_versions" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "workspace_agent_skill_versions_owner_idx" ON "workspace_agent_skill_versions" USING btree ("owner_id");
