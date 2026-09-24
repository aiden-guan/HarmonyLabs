-- HarmonyLabs initial schema. Facial photos stay in a private storage bucket.

create extension if not exists pgcrypto;

do $$ begin
  create type public.analysis_status as enum (
    'draft',
    'photos_uploaded',
    'landmarks_detected',
    'awaiting_verification',
    'processing',
    'complete',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  status public.analysis_status not null default 'draft',
  harmony_score double precision,
  front_score double precision,
  profile_score double precision,
  category_scores jsonb not null default '[]'::jsonb,
  quality_summary jsonb not null default '{}'::jsonb,
  profile_mirrored boolean not null default false,
  is_sample boolean not null default false,
  detected_landmarks jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analyses_score_bounds check (
    (harmony_score is null or (harmony_score >= 0 and harmony_score <= 10))
    and (front_score is null or (front_score >= 0 and front_score <= 10))
    and (profile_score is null or (profile_score >= 0 and profile_score <= 10))
  )
);

create table if not exists public.analysis_photos (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  view text not null check (view in ('front', 'profile')),
  storage_path text not null,
  content_type text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  quality_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (analysis_id, view)
);

create table if not exists public.landmarks (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  view text not null check (view in ('front', 'profile')),
  landmark_key text not null,
  x double precision not null check (x >= 0 and x <= 1),
  y double precision not null check (y >= 0 and y <= 1),
  z double precision,
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  source text not null check (source in ('mediapipe', 'derived', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (analysis_id, view, landmark_key)
);

create table if not exists public.metric_results (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  metric_id text not null,
  value double precision,
  score double precision check (score is null or (score >= 0 and score <= 10)),
  impact double precision,
  reference_min double precision not null,
  reference_max double precision not null,
  unit text not null check (unit in ('ratio', 'percent', 'degrees')),
  category text not null,
  view text not null check (view in ('front', 'profile')),
  created_at timestamptz not null default now(),
  unique (analysis_id, metric_id)
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (analysis_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  structured_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analyses_user_created_idx on public.analyses (user_id, created_at desc);
create index if not exists photos_analysis_idx on public.analysis_photos (analysis_id);
create index if not exists landmarks_analysis_idx on public.landmarks (analysis_id, view);
create index if not exists metrics_analysis_idx on public.metric_results (analysis_id);
create index if not exists messages_thread_idx on public.chat_messages (thread_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists analyses_updated_at on public.analyses;
create trigger analyses_updated_at
before update on public.analyses
for each row execute function public.set_updated_at();

drop trigger if exists landmarks_updated_at on public.landmarks;
create trigger landmarks_updated_at
before update on public.landmarks
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_photos enable row level security;
alter table public.landmarks enable row level security;
alter table public.metric_results enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;
drop policy if exists analyses_all on public.analyses;
drop policy if exists photos_all on public.analysis_photos;
drop policy if exists landmarks_all on public.landmarks;
drop policy if exists metrics_all on public.metric_results;
drop policy if exists threads_all on public.chat_threads;
drop policy if exists messages_all on public.chat_messages;

create policy profiles_select on public.profiles
for select to authenticated using (id = auth.uid());
create policy profiles_insert on public.profiles
for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_delete on public.profiles
for delete to authenticated using (id = auth.uid());

create policy analyses_all on public.analyses
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy photos_all on public.analysis_photos
for all to authenticated
using (exists (
  select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()
))
with check (exists (
  select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()
));

create policy landmarks_all on public.landmarks
for all to authenticated
using (exists (
  select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()
))
with check (exists (
  select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()
));

create policy metrics_all on public.metric_results
for all to authenticated
using (exists (
  select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()
))
with check (exists (
  select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()
));

create policy threads_all on public.chat_threads
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy messages_all on public.chat_messages
for all to authenticated
using (exists (
  select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid()
))
with check (exists (
  select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid()
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'analysis-photos',
  'analysis-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists analysis_photos_read on storage.objects;
drop policy if exists analysis_photos_insert on storage.objects;
drop policy if exists analysis_photos_update on storage.objects;
drop policy if exists analysis_photos_delete on storage.objects;

create policy analysis_photos_read on storage.objects
for select to authenticated
using (
  bucket_id = 'analysis-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy analysis_photos_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'analysis-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy analysis_photos_update on storage.objects
for update to authenticated
using (
  bucket_id = 'analysis-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'analysis-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy analysis_photos_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'analysis-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
