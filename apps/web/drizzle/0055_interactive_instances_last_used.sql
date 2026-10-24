ALTER TABLE "interactive_component_instances" ADD COLUMN "last_used_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- Existing rows keep their previous retention order (last save).
UPDATE "interactive_component_instances" SET "last_used_at" = "updated_at";--> statement-breakpoint
CREATE INDEX "interactive_component_instances_owner_last_used_idx" ON "interactive_component_instances" USING btree ("owner_id","last_used_at");