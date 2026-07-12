create extension if not exists vector;

create table if not exists public.knowledge_graphs (
  id text not null,
  subject text not null,
  schema_doc jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_graphs
  drop column if exists version,
  drop column if exists source_file,
  drop column if exists raw_json;

alter table public.knowledge_graphs add column if not exists subject text;
alter table public.knowledge_graphs add column if not exists schema_doc jsonb not null default '{}'::jsonb;
alter table public.knowledge_graphs add column if not exists created_at timestamptz not null default now();
alter table public.knowledge_graphs add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_graphs_pkey'
      and conrelid = 'public.knowledge_graphs'::regclass
  ) then
    alter table public.knowledge_graphs
      add constraint knowledge_graphs_pkey primary key (id);
  end if;
end $$;

create table if not exists public.knowledge_graph_topics (
  graph_id text not null,
  topic_id text not null,
  name text not null,
  default_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_graph_topics add column if not exists default_order integer;
alter table public.knowledge_graph_topics add column if not exists created_at timestamptz not null default now();
alter table public.knowledge_graph_topics add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_graph_topics_pkey'
      and conrelid = 'public.knowledge_graph_topics'::regclass
  ) then
    alter table public.knowledge_graph_topics
      add constraint knowledge_graph_topics_pkey primary key (graph_id, topic_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_graph_topics_graph_id_fkey'
      and conrelid = 'public.knowledge_graph_topics'::regclass
  ) then
    alter table public.knowledge_graph_topics
      add constraint knowledge_graph_topics_graph_id_fkey
      foreign key (graph_id) references public.knowledge_graphs(id) on delete cascade;
  end if;
end $$;

create table if not exists public.knowledge_graph_concepts (
  graph_id text not null,
  concept_id text not null,
  topic_id text not null,
  name text not null,
  description text not null,
  default_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_graph_concepts
  drop column if exists difficulty,
  drop column if exists metadata,
  drop column if exists embedding_text;

alter table public.knowledge_graph_concepts add column if not exists default_order integer;
alter table public.knowledge_graph_concepts add column if not exists created_at timestamptz not null default now();
alter table public.knowledge_graph_concepts add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_graph_concepts_pkey'
      and conrelid = 'public.knowledge_graph_concepts'::regclass
  ) then
    alter table public.knowledge_graph_concepts
      add constraint knowledge_graph_concepts_pkey primary key (graph_id, concept_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_graph_concepts_graph_id_fkey'
      and conrelid = 'public.knowledge_graph_concepts'::regclass
  ) then
    alter table public.knowledge_graph_concepts
      add constraint knowledge_graph_concepts_graph_id_fkey
      foreign key (graph_id) references public.knowledge_graphs(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_graph_concepts_topic_fkey'
      and conrelid = 'public.knowledge_graph_concepts'::regclass
  ) then
    alter table public.knowledge_graph_concepts
      add constraint knowledge_graph_concepts_topic_fkey
      foreign key (graph_id, topic_id)
      references public.knowledge_graph_topics(graph_id, topic_id)
      on delete restrict;
  end if;
end $$;

create table if not exists public.knowledge_graph_edges (
  from_graph_id text not null,
  from_concept_id text not null,
  to_graph_id text not null,
  to_concept_id text not null,
  edge_type text not null,
  strength text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_graph_edges
  drop column if exists graph_id,
  drop column if exists metadata;

alter table public.knowledge_graph_edges add column if not exists created_at timestamptz not null default now();
alter table public.knowledge_graph_edges add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_graph_edges_pkey'
      and conrelid = 'public.knowledge_graph_edges'::regclass
  ) then
    alter table public.knowledge_graph_edges
      add constraint knowledge_graph_edges_pkey
      primary key (from_graph_id, from_concept_id, to_graph_id, to_concept_id, edge_type);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_graph_edges_from_concept_fkey'
      and conrelid = 'public.knowledge_graph_edges'::regclass
  ) then
    alter table public.knowledge_graph_edges
      add constraint knowledge_graph_edges_from_concept_fkey
      foreign key (from_graph_id, from_concept_id)
      references public.knowledge_graph_concepts(graph_id, concept_id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_graph_edges_to_concept_fkey'
      and conrelid = 'public.knowledge_graph_edges'::regclass
  ) then
    alter table public.knowledge_graph_edges
      add constraint knowledge_graph_edges_to_concept_fkey
      foreign key (to_graph_id, to_concept_id)
      references public.knowledge_graph_concepts(graph_id, concept_id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_graph_edges_no_self_loop'
      and conrelid = 'public.knowledge_graph_edges'::regclass
  ) then
    alter table public.knowledge_graph_edges
      add constraint knowledge_graph_edges_no_self_loop
      check (from_graph_id <> to_graph_id or from_concept_id <> to_concept_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_graph_edges_strength_check'
      and conrelid = 'public.knowledge_graph_edges'::regclass
  ) then
    alter table public.knowledge_graph_edges
      add constraint knowledge_graph_edges_strength_check
      check (
        (edge_type = 'prereq' and strength in ('hard', 'soft'))
        or (edge_type <> 'prereq' and strength is null)
      );
  end if;
end $$;

create table if not exists public.kg_node_embeddings (
  graph_id text not null,
  node_id text not null,
  kind text not null,
  embed_text text not null,
  embedding vector(1536) not null,
  model_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kg_node_embeddings add column if not exists created_at timestamptz not null default now();
alter table public.kg_node_embeddings add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'kg_node_embeddings_pkey'
      and conrelid = 'public.kg_node_embeddings'::regclass
  ) then
    alter table public.kg_node_embeddings
      add constraint kg_node_embeddings_pkey
      primary key (graph_id, kind, node_id, model_version);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'kg_node_embeddings_graph_id_fkey'
      and conrelid = 'public.kg_node_embeddings'::regclass
  ) then
    alter table public.kg_node_embeddings
      add constraint kg_node_embeddings_graph_id_fkey
      foreign key (graph_id) references public.knowledge_graphs(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'kg_node_embeddings_kind_check'
      and conrelid = 'public.kg_node_embeddings'::regclass
  ) then
    alter table public.kg_node_embeddings
      add constraint kg_node_embeddings_kind_check
      check (kind in ('topic', 'concept'));
  end if;
end $$;

create index if not exists idx_kg_topics_graph_order
  on public.knowledge_graph_topics (graph_id, default_order);

create index if not exists idx_kg_concepts_topic_order
  on public.knowledge_graph_concepts (graph_id, topic_id, default_order);

create index if not exists idx_kg_edges_to_lookup
  on public.knowledge_graph_edges (to_graph_id, to_concept_id, edge_type);

create index if not exists idx_kg_edges_from_lookup
  on public.knowledge_graph_edges (from_graph_id, from_concept_id, edge_type);

create index if not exists idx_kg_edges_owner_type
  on public.knowledge_graph_edges (to_graph_id, edge_type);

create index if not exists idx_kg_node_embeddings_graph_model_kind
  on public.kg_node_embeddings (graph_id, model_version, kind);

create index if not exists idx_kg_node_embeddings_node_lookup
  on public.kg_node_embeddings (graph_id, kind, node_id);

comment on table public.kg_node_embeddings is
  'Derived semantic retrieval index for knowledge graph topics and concepts; rebuildable from graph nodes plus alias policy.';

comment on column public.kg_node_embeddings.embed_text is
  'Auditable text sent to the embedding model, constructed from node kind, name, description, topic name, and aliases.';

comment on column public.kg_node_embeddings.embedding is
  'Vector embedding generated from embed_text; dimension follows model_version.';

comment on column public.kg_node_embeddings.model_version is
  'Embedding provider/model/dimension identifier used to support re-embedding without changing core graph tables.';

-- The app schema and KG schema have separate migration owners. Reconcile the
-- one cross-boundary foreign key here so either migration family may have been
-- installed first on an existing database.
do $$
begin
  if to_regclass('public.user_concept_mastery') is not null
    and not exists (
      select 1
      from pg_constraint
      where conrelid = to_regclass('public.user_concept_mastery')
        and conname = 'user_concept_mastery_graph_id_concept_id_fkey'
    )
  then
    alter table public.user_concept_mastery
      add constraint user_concept_mastery_graph_id_concept_id_fkey
      foreign key (graph_id, concept_id)
      references public.knowledge_graph_concepts (graph_id, concept_id)
      on delete cascade;
  end if;
end $$;
