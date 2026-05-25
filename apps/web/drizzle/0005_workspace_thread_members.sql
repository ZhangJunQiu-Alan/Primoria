CREATE TABLE "workspace_thread_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"member_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_thread_members" ADD CONSTRAINT "workspace_thread_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_thread_members" ADD CONSTRAINT "workspace_thread_members_thread_id_workspace_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."workspace_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_thread_members" ADD CONSTRAINT "workspace_thread_members_member_id_workspace_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."workspace_members"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_thread_members" ADD CONSTRAINT "workspace_thread_members_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workspace_thread_members_thread_owner_idx" ON "workspace_thread_members" USING btree ("thread_id","owner_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_thread_members_member_thread_uidx" ON "workspace_thread_members" USING btree ("member_id","thread_id");
