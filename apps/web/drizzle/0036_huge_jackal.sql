CREATE TABLE "generated_topic_graphs" (
	"graph_id" text PRIMARY KEY NOT NULL,
	"topic_key" text NOT NULL,
	"topic" text NOT NULL,
	"subject" text NOT NULL,
	"language" text,
	"graph" jsonb NOT NULL,
	"status" text DEFAULT 'candidate' NOT NULL,
	"usage_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "generated_topic_graphs_topic_key_uidx" ON "generated_topic_graphs" USING btree ("topic_key");--> statement-breakpoint
CREATE INDEX "generated_topic_graphs_status_usage_idx" ON "generated_topic_graphs" USING btree ("status","usage_count");