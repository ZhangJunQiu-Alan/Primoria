CREATE TABLE "auth_rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"identifier_hash" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auth_rate_limits_scope_hash_idx" ON "auth_rate_limits" USING btree ("scope","identifier_hash");--> statement-breakpoint
CREATE INDEX "auth_rate_limits_expires_idx" ON "auth_rate_limits" USING btree ("expires_at");