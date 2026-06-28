CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"cache_key" text NOT NULL,
	"provider" text DEFAULT 'google' NOT NULL,
	"model" text NOT NULL,
	"mime_type" text NOT NULL,
	"data_base64" text NOT NULL,
	"prompt" text NOT NULL,
	"brief" jsonb NOT NULL,
	"alt" text NOT NULL,
	"caption" text NOT NULL,
	"width" integer,
	"height" integer,
	"byte_length" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_cache_key_uidx" ON "media_assets" USING btree ("cache_key");--> statement-breakpoint
CREATE INDEX "media_assets_owner_created_idx" ON "media_assets" USING btree ("owner_id","created_at");
