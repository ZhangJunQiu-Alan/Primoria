-- Phase 4: per-user app data keyed to auth.users (additive).
--
-- App-owned tables (distinct from the externally-owned public.courses/owner_id
-- schema, which we do not touch). RLS scopes every row to its auth.users owner.

create table if not exists public.app_courses (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  topic text not null,
  summary text not null default '',
  estimated_minutes integer not null default 0,
  blocks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_courses_owner_created_idx
  on public.app_courses (owner_id, created_at desc);

alter table public.app_courses enable row level security;

drop policy if exists "app_courses_select_own" on public.app_courses;
create policy "app_courses_select_own" on public.app_courses
  for select using (auth.uid() = owner_id);

drop policy if exists "app_courses_insert_own" on public.app_courses;
create policy "app_courses_insert_own" on public.app_courses
  for insert with check (auth.uid() = owner_id);

drop policy if exists "app_courses_update_own" on public.app_courses;
create policy "app_courses_update_own" on public.app_courses
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "app_courses_delete_own" on public.app_courses;
create policy "app_courses_delete_own" on public.app_courses
  for delete using (auth.uid() = owner_id);

create table if not exists public.user_concept_mastery (
  owner_id uuid not null references auth.users (id) on delete cascade,
  graph_id text not null,
  concept_id text not null,
  status text not null default 'untested' check (status in ('untested', 'learning', 'mastered')),
  score numeric,
  updated_at timestamptz not null default now(),
  primary key (owner_id, graph_id, concept_id),
  foreign key (graph_id, concept_id)
    references public.knowledge_graph_concepts (graph_id, concept_id) on delete cascade
);

alter table public.user_concept_mastery enable row level security;

drop policy if exists "ucm_select_own" on public.user_concept_mastery;
create policy "ucm_select_own" on public.user_concept_mastery
  for select using (auth.uid() = owner_id);

drop policy if exists "ucm_insert_own" on public.user_concept_mastery;
create policy "ucm_insert_own" on public.user_concept_mastery
  for insert with check (auth.uid() = owner_id);

drop policy if exists "ucm_update_own" on public.user_concept_mastery;
create policy "ucm_update_own" on public.user_concept_mastery
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "ucm_delete_own" on public.user_concept_mastery;
create policy "ucm_delete_own" on public.user_concept_mastery
  for delete using (auth.uid() = owner_id);
