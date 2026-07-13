CREATE TABLE "worker_heartbeats" (
	"worker_type" text PRIMARY KEY NOT NULL,
	"worker_id" text NOT NULL,
	"heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
