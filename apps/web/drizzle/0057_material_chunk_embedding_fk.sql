-- material_chunk_embeddings is owned by the KG SQL migrations (pgvector). On a
-- fresh bootstrap KG migration 0003 creates it before learning_material_chunks
-- exists, so the cascade FK is installed here once both tables exist; a
-- Drizzle-first database gets it from KG migration 0003 instead.
DO $$
BEGIN
	IF to_regclass('public.material_chunk_embeddings') IS NOT NULL
		AND NOT EXISTS (
			SELECT 1 FROM pg_constraint
			WHERE conname = 'material_chunk_embeddings_chunk_fk'
				AND conrelid = 'public.material_chunk_embeddings'::regclass
		) THEN
		ALTER TABLE "public"."material_chunk_embeddings"
			ADD CONSTRAINT "material_chunk_embeddings_chunk_fk"
			FOREIGN KEY ("material_id", "ordinal")
			REFERENCES "public"."learning_material_chunks"("material_id", "ordinal")
			ON DELETE cascade;
	END IF;
END $$;
