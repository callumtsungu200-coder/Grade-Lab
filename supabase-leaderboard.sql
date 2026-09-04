-- Grade Lab — leaderboard table.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- It creates a public-readable leaderboard where each signed-in user can only
-- write their OWN row. Safe to run more than once.

create table if not exists public.leaderboard (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  xp         integer not null default 0,
  level      integer not null default 1,
  rank       text,
  updated_at timestamptz not null default now()
);

alter table public.leaderboard enable row level security;

-- Anyone who is signed in can read the whole board.
drop policy if exists "leaderboard readable by authenticated" on public.leaderboard;
create policy "leaderboard readable by authenticated"
  on public.leaderboard for select
  to authenticated
  using (true);

-- A user may insert their own row.
drop policy if exists "insert own leaderboard row" on public.leaderboard;
create policy "insert own leaderboard row"
  on public.leaderboard for insert
  to authenticated
  with check (auth.uid() = id);

-- A user may update their own row.
drop policy if exists "update own leaderboard row" on public.leaderboard;
create policy "update own leaderboard row"
  on public.leaderboard for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Helpful index for the ordered read.
create index if not exists leaderboard_xp_idx on public.leaderboard (xp desc);
