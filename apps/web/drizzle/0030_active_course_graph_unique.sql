DROP INDEX IF EXISTS "courses_owner_graph_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "courses_owner_graph_uidx" ON "courses" USING btree ("owner_id","graph_id") WHERE "archived_at" IS NULL;
