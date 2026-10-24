CREATE TABLE "generated_concept_mastery" (
	"owner_id" text NOT NULL,
	"graph_id" text NOT NULL,
	"concept_id" text NOT NULL,
	"status" text DEFAULT 'untested' NOT NULL,
	"score" double precision,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generated_concept_mastery_status_check" CHECK ("generated_concept_mastery"."status" in ('untested', 'weak', 'learning', 'mastered')),
	CONSTRAINT "generated_concept_mastery_score_check" CHECK ("generated_concept_mastery"."score" is null or ("generated_concept_mastery"."score" >= 0 and "generated_concept_mastery"."score" <= 1)),
	CONSTRAINT "generated_concept_mastery_graph_check" CHECK (starts_with("generated_concept_mastery"."graph_id", 'gen_') or starts_with("generated_concept_mastery"."graph_id", 'mat_'))
);
--> statement-breakpoint
ALTER TABLE "generated_concept_mastery" ADD CONSTRAINT "generated_concept_mastery_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "generated_concept_mastery_owner_graph_concept_uidx" ON "generated_concept_mastery" USING btree ("owner_id","graph_id","concept_id");--> statement-breakpoint
-- user_concept_mastery's foreign key into knowledge_graph_concepts rejects
-- generated-graph concepts; a database where that key was never installed
-- may hold such rows, so they move with their values.
INSERT INTO "generated_concept_mastery" ("owner_id", "graph_id", "concept_id", "status", "score", "updated_at")
SELECT "owner_id", "graph_id", "concept_id", "status", "score", "updated_at"
FROM "user_concept_mastery"
WHERE starts_with("graph_id", 'gen_') OR starts_with("graph_id", 'mat_')
ON CONFLICT ("owner_id", "graph_id", "concept_id") DO NOTHING;
