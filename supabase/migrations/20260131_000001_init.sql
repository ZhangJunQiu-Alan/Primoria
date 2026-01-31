-- Primoria: Supabase(Postgres) schema for Auth + Courses + Search + Recommend
-- Apply in Supabase SQL editor or via CLI migrations.

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists vector;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'course_status') then
    create type public.course_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles (public user info)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Courses (metadata + search index)
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,

  title text not null,
  description text not null default '',
  tags text[] not null default '{}'::text[],
  difficulty text not null default 'beginner',
  estimated_minutes int not null default 0,
  language text not null default 'en',
  cover_image_url text,

  status public.course_status not null default 'draft',
  current_draft_version_id uuid,
  current_published_version_id uuid,
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- NOTE: Generated columns require IMMUTABLE expressions, but to_tsvector/unaccent are not immutable.
  -- We keep this column updated via trigger instead.
  search_tsv tsvector not null default ''::tsvector,

  -- Optional: semantic recommendation/search (fill via Edge Function later)
  embedding vector(1536)
);

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create or replace function public.set_courses_search_tsv()
returns trigger
language plpgsql
as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.title, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.description, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(array_to_string(coalesce(new.tags, '{}'::text[]), ' '))), 'C');
  return new;
end;
$$;

drop trigger if exists courses_set_search_tsv on public.courses;
create trigger courses_set_search_tsv
before insert or update of title, description, tags on public.courses
for each row execute function public.set_courses_search_tsv();

create index if not exists courses_owner_idx on public.courses (owner_id);
create index if not exists courses_status_published_at_idx on public.courses (status, published_at desc);
create index if not exists courses_tags_gin_idx on public.courses using gin (tags);
create index if not exists courses_search_tsv_idx on public.courses using gin (search_tsv);
create index if not exists courses_title_trgm_idx on public.courses using gin (title gin_trgm_ops);

-- Course versions (full Course JSON)
create table if not exists public.course_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  version int not null,
  content jsonb not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (course_id, version)
);

create index if not exists course_versions_course_id_idx on public.course_versions (course_id);

-- User progress (private)
create table if not exists public.user_course_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  progress real not null default 0,
  state jsonb not null default '{}'::jsonb,
  last_opened_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

drop trigger if exists user_course_progress_set_updated_at on public.user_course_progress;
create trigger user_course_progress_set_updated_at
before update on public.user_course_progress
for each row execute function public.set_updated_at();

-- Favorites (private)
create table if not exists public.user_course_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- -----------------------
-- RLS
-- -----------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_versions enable row level security;
alter table public.user_course_progress enable row level security;
alter table public.user_course_favorites enable row level security;

-- profiles: anyone authenticated can read; only self can update
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- courses: published readable by all; owner readable always
drop policy if exists courses_select_published_or_owner on public.courses;
create policy courses_select_published_or_owner on public.courses
for select to anon, authenticated
using (status = 'published' or owner_id = auth.uid());

drop policy if exists courses_insert_owner on public.courses;
create policy courses_insert_owner on public.courses
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists courses_update_owner on public.courses;
create policy courses_update_owner on public.courses
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists courses_delete_owner on public.courses;
create policy courses_delete_owner on public.courses
for delete to authenticated
using (owner_id = auth.uid());

-- course_versions: owner can read any; everyone can read only the published version of published courses
drop policy if exists course_versions_select_owner_or_published on public.course_versions;
create policy course_versions_select_owner_or_published on public.course_versions
for select to anon, authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_versions.course_id
      and (
        c.owner_id = auth.uid()
        or (
          c.status = 'published'
          and c.current_published_version_id = course_versions.id
        )
      )
  )
);

drop policy if exists course_versions_insert_owner on public.course_versions;
create policy course_versions_insert_owner on public.course_versions
for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.courses c
    where c.id = course_versions.course_id
      and c.owner_id = auth.uid()
  )
);

-- progress: only self
drop policy if exists user_course_progress_select_self on public.user_course_progress;
create policy user_course_progress_select_self on public.user_course_progress
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_course_progress_upsert_self on public.user_course_progress;
create policy user_course_progress_upsert_self on public.user_course_progress
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists user_course_progress_update_self on public.user_course_progress;
create policy user_course_progress_update_self on public.user_course_progress
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- favorites: only self
drop policy if exists user_course_favorites_select_self on public.user_course_favorites;
create policy user_course_favorites_select_self on public.user_course_favorites
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_course_favorites_insert_self on public.user_course_favorites;
create policy user_course_favorites_insert_self on public.user_course_favorites
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists user_course_favorites_delete_self on public.user_course_favorites;
create policy user_course_favorites_delete_self on public.user_course_favorites
for delete to authenticated
using (user_id = auth.uid());

-- -----------------------
-- RPC: publish course
-- -----------------------
create or replace function public.publish_course(p_course_id uuid, p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_version_course_id uuid;
begin
  select owner_id into v_owner from public.courses where id = p_course_id;
  if v_owner is null then
    raise exception 'course not found';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'not course owner';
  end if;

  select course_id into v_version_course_id from public.course_versions where id = p_version_id;
  if v_version_course_id is null then
    raise exception 'version not found';
  end if;
  if v_version_course_id <> p_course_id then
    raise exception 'version does not belong to course';
  end if;

  update public.courses
  set
    status = 'published',
    current_published_version_id = p_version_id,
    published_at = coalesce(published_at, now())
  where id = p_course_id;
end;
$$;

grant execute on function public.publish_course(uuid, uuid) to authenticated;

-- -----------------------
-- RPC: search courses (published only)
-- -----------------------
create or replace function public.search_courses(
  p_query text default null,
  p_tags text[] default null,
  p_difficulty text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  title text,
  description text,
  tags text[],
  difficulty text,
  estimated_minutes int,
  language text,
  cover_image_url text,
  owner_id uuid,
  published_at timestamptz,
  rank real
)
language sql
stable
as $$
  with q as (
    select
      case
        when p_query is null or btrim(p_query) = '' then null
        else websearch_to_tsquery('simple', unaccent(p_query))
      end as tsq
  )
  select
    c.id,
    c.title,
    c.description,
    c.tags,
    c.difficulty,
    c.estimated_minutes,
    c.language,
    c.cover_image_url,
    c.owner_id,
    c.published_at,
    case
      when q.tsq is null then 0
      else ts_rank_cd(c.search_tsv, q.tsq)
    end as rank
  from public.courses c
  cross join q
  where c.status = 'published'
    and (q.tsq is null or c.search_tsv @@ q.tsq or c.title ilike '%' || p_query || '%')
    and (p_tags is null or c.tags @> p_tags)
    and (p_difficulty is null or c.difficulty = p_difficulty)
  order by
    case when q.tsq is null then 0 else ts_rank_cd(c.search_tsv, q.tsq) end desc,
    c.published_at desc nulls last
  limit greatest(1, least(p_limit, 100))
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_courses(text, text[], text, int, int) to anon, authenticated;

-- -----------------------
-- RPC: recommend courses (simple personalized tag-based)
-- -----------------------
create or replace function public.recommend_courses(p_limit int default 20)
returns table (
  id uuid,
  title text,
  description text,
  tags text[],
  difficulty text,
  estimated_minutes int,
  language text,
  cover_image_url text,
  published_at timestamptz,
  score real
)
language sql
stable
as $$
  with user_tags as (
    select
      unnest(c.tags) as tag,
      count(*)::int as weight
    from public.user_course_progress p
    join public.courses c on c.id = p.course_id
    where p.user_id = auth.uid()
    group by 1
  ),
  candidates as (
    select
      c.*,
      coalesce(sum(ut.weight), 0)::real as tag_score
    from public.courses c
    left join user_tags ut on ut.tag = any(c.tags)
    where c.status = 'published'
    group by c.id
  )
  select
    c.id,
    c.title,
    c.description,
    c.tags,
    c.difficulty,
    c.estimated_minutes,
    c.language,
    c.cover_image_url,
    c.published_at,
    (c.tag_score * 10.0 + coalesce(extract(epoch from c.published_at) / 1e9, 0)::real) as score
  from candidates c
  order by score desc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.recommend_courses(int) to authenticated;
