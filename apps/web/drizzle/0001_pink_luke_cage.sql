CREATE TABLE "copilot_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "copilot_chat_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"preview" text,
	"message_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "copilot_chat_messages" ADD CONSTRAINT "copilot_chat_messages_thread_id_copilot_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."copilot_chat_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_chat_messages" ADD CONSTRAINT "copilot_chat_messages_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_chat_threads" ADD CONSTRAINT "copilot_chat_threads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "copilot_chat_messages_thread_created_idx" ON "copilot_chat_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "copilot_chat_messages_owner_created_idx" ON "copilot_chat_messages" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "copilot_chat_threads_owner_updated_idx" ON "copilot_chat_threads" USING btree ("owner_id","updated_at");