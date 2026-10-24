-- Semantic index for learner-uploaded material chunks (docs/product/learning-materials.md).
-- pgvector tables are owned by the versioned KG SQL; the chunk rows themselves
-- are Drizzle-owned (learning_material_chunks). Rows are owner-scoped and only
-- ever queried with an owner_id + material_id filter.
create table if not exists public.material_chunk_embeddings (
  material_id text not null,
  ordinal integer not null,
  owner_id text not null,
  model_version text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  constraint material_chunk_embeddings_pkey primary key (material_id, ordinal, model_version)
);

create index if not exists material_chunk_embeddings_owner_material_idx
  on public.material_chunk_embeddings(owner_id, material_id, model_version);

-- Deleting a chunk (and so its material) removes its embeddings. On a fresh
-- bootstrap this migration runs before Drizzle creates learning_material_chunks,
-- and Drizzle migration 0056 installs the FK; on a Drizzle-first database this
-- reconciles it.
do $$
begin
  if to_regclass('public.learning_material_chunks') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'material_chunk_embeddings_chunk_fk'
        and conrelid = 'public.material_chunk_embeddings'::regclass
    ) then
    alter table public.material_chunk_embeddings
      add constraint material_chunk_embeddings_chunk_fk
      foreign key (material_id, ordinal)
      references public.learning_material_chunks(material_id, ordinal)
      on delete cascade;
  end if;
end $$;
