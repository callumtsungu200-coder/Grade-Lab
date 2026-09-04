-- ============================================================
--  GCSE Flashcards — Supabase setup
--  Run this once in your Supabase project:
--  Dashboard -> SQL Editor -> New query -> paste -> Run.
-- ============================================================

-- 1. Table that stores each user's progress as one JSON blob.
create table if not exists public.user_progress (
  id uuid primary key references auth.users (id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2. Turn on Row Level Security so users can only see their own row.
alter table public.user_progress enable row level security;

-- 3. Policies: a logged-in user can read/insert/update ONLY their own row.
create policy "read own progress"
  on public.user_progress for select
  using (auth.uid() = id);

create policy "insert own progress"
  on public.user_progress for insert
  with check (auth.uid() = id);

create policy "update own progress"
  on public.user_progress for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
