CREATE TABLE "interactive_component_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"instance_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"component_id" text NOT NULL,
	"config_version" integer NOT NULL,
	"initial_config" jsonb NOT NULL,
	"config" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interactive_component_instances_version_check" CHECK ("interactive_component_instances"."config_version" >= 1 and "interactive_component_instances"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "interactive_component_instances" ADD CONSTRAINT "interactive_component_instances_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "interactive_component_instances_owner_instance_uidx" ON "interactive_component_instances" USING btree ("owner_id","instance_id");