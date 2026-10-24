CREATE TABLE "learning_material_chunks" (
	"material_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"owner_id" text NOT NULL,
	"text" text NOT NULL,
	"heading" text,
	"page_start" integer,
	"page_end" integer,
	"char_count" integer NOT NULL,
	CONSTRAINT "learning_material_chunks_pk" PRIMARY KEY("material_id","ordinal"),
	CONSTRAINT "learning_material_chunks_ordinal_check" CHECK ("learning_material_chunks"."ordinal" >= 0 and "learning_material_chunks"."char_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "learning_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_length" integer NOT NULL,
	"content_sha256" text NOT NULL,
	"char_count" integer NOT NULL,
	"chunk_count" integer NOT NULL,
	"page_count" integer,
	"language" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_materials_counts_check" CHECK ("learning_materials"."byte_length" >= 0 and "learning_materials"."char_count" >= 0 and "learning_materials"."chunk_count" >= 0 and ("learning_materials"."page_count" is null or "learning_materials"."page_count" >= 0))
);
--> statement-breakpoint
CREATE TABLE "material_topic_graphs" (
	"graph_id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"material_ids" jsonb NOT NULL,
	"title" text NOT NULL,
	"language" text,
	"graph" jsonb NOT NULL,
	"concept_sources" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_material_chunks" ADD CONSTRAINT "learning_material_chunks_material_id_learning_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."learning_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_material_chunks" ADD CONSTRAINT "learning_material_chunks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_topic_graphs" ADD CONSTRAINT "material_topic_graphs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_material_chunks_owner_material_idx" ON "learning_material_chunks" USING btree ("owner_id","material_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_materials_owner_sha_uidx" ON "learning_materials" USING btree ("owner_id","content_sha256");--> statement-breakpoint
CREATE INDEX "learning_materials_owner_created_idx" ON "learning_materials" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "material_topic_graphs_owner_created_idx" ON "material_topic_graphs" USING btree ("owner_id","created_at");