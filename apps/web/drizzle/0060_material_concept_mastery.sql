CREATE TABLE "material_concept_mastery" (
	"owner_id" text NOT NULL,
	"graph_id" text NOT NULL,
	"concept_id" text NOT NULL,
	"status" text DEFAULT 'untested' NOT NULL,
	"score" double precision,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_concept_mastery_status_check" CHECK ("material_concept_mastery"."status" in ('untested', 'weak', 'learning', 'mastered')),
	CONSTRAINT "material_concept_mastery_score_check" CHECK ("material_concept_mastery"."score" is null or ("material_concept_mastery"."score" >= 0 and "material_concept_mastery"."score" <= 1)),
	CONSTRAINT "material_concept_mastery_graph_check" CHECK (starts_with("material_concept_mastery"."graph_id", 'mat_'))
);
--> statement-breakpoint
ALTER TABLE "material_concept_mastery" ADD CONSTRAINT "material_concept_mastery_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "material_concept_mastery_owner_graph_concept_uidx" ON "material_concept_mastery" USING btree ("owner_id","graph_id","concept_id");