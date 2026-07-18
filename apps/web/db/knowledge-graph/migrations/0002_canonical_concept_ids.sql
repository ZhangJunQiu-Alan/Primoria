alter table public.knowledge_graph_concepts
  add column if not exists canonical_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_graph_concepts_canonical_id_format'
      and conrelid = 'public.knowledge_graph_concepts'::regclass
  ) then
    alter table public.knowledge_graph_concepts
      add constraint knowledge_graph_concepts_canonical_id_format
      check (canonical_id is null or canonical_id ~ '^pc_[a-f0-9]{32}$');
  end if;
end $$;

create index if not exists idx_kg_concepts_canonical_id
  on public.knowledge_graph_concepts(canonical_id);
