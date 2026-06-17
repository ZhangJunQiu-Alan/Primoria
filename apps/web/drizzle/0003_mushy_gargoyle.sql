CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"sender_name" text NOT NULL,
	"sender_kind" text NOT NULL,
	"content" text NOT NULL,
	"artifact" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"scope" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"progress" text NOT NULL,
	"due_at" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_threads" ADD CONSTRAINT "workspace_threads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_threads" ADD CONSTRAINT "workspace_threads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_thread_id_workspace_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."workspace_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_tasks" ADD CONSTRAINT "workspace_tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_tasks" ADD CONSTRAINT "workspace_tasks_thread_id_workspace_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."workspace_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_tasks" ADD CONSTRAINT "workspace_tasks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workspaces_owner_updated_idx" ON "workspaces" USING btree ("owner_id","updated_at");
--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_idx" ON "workspace_members" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "workspace_members_owner_workspace_idx" ON "workspace_members" USING btree ("owner_id","workspace_id");
--> statement-breakpoint
CREATE INDEX "workspace_threads_workspace_type_idx" ON "workspace_threads" USING btree ("workspace_id","type");
--> statement-breakpoint
CREATE INDEX "workspace_threads_owner_updated_idx" ON "workspace_threads" USING btree ("owner_id","updated_at");
--> statement-breakpoint
CREATE INDEX "workspace_messages_thread_created_idx" ON "workspace_messages" USING btree ("thread_id","created_at");
--> statement-breakpoint
CREATE INDEX "workspace_messages_owner_created_idx" ON "workspace_messages" USING btree ("owner_id","created_at");
--> statement-breakpoint
CREATE INDEX "workspace_tasks_thread_status_idx" ON "workspace_tasks" USING btree ("thread_id","status");
--> statement-breakpoint
CREATE INDEX "workspace_tasks_owner_updated_idx" ON "workspace_tasks" USING btree ("owner_id","updated_at");
