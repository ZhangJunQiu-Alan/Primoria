CREATE TABLE "learning_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"type" text NOT NULL,
	"course_id" text,
	"block_id" text,
	"graph_id" text,
	"concept_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_events_owner_created_idx" ON "learning_events" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "learning_events_owner_type_idx" ON "learning_events" USING btree ("owner_id","type");--> statement-breakpoint
CREATE INDEX "learning_events_owner_concept_idx" ON "learning_events" USING btree ("owner_id","concept_id");