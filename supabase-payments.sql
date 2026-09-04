-- ============================================================
--  GCSE Flashcards — PAID ACCESS setup  (safe to re-run)
--  Supabase -> SQL Editor -> new snippet -> paste all -> Run.
-- ============================================================

-- 1. Profile row per user (holds the "paid" flag and their email).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Row Level Security: a user may READ their own profile only.
alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);
-- (No insert/update policy for users, so they cannot set paid themselves.)

-- 3. Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Backfill profiles for anyone who already signed up before this ran.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
