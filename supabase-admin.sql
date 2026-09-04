-- ============================================================
--  Grade Lab — OWNER DASHBOARD setup  (safe to re-run)
--  Supabase -> SQL Editor -> new snippet -> paste all -> Run.
--
--  Lets the owner account (gradelab26@gmail.com) read and update
--  EVERY user's profile, so the in-app owner dashboard can show
--  who owns each account and change their subscription.
--  The check runs inside Postgres (Row Level Security), so only a
--  login with the owner email can do this — it is not bypassable
--  from the browser.
-- ============================================================

-- 1. Extra columns on profiles: name + subscription plan.
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name  text;
alter table public.profiles add column if not exists plan       text not null default 'free';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- 2. Capture the person's name at sign-up (from the name fields).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Backfill name/email for anyone who signed up before this ran.
update public.profiles p
set first_name = coalesce(p.first_name, u.raw_user_meta_data ->> 'first_name'),
    last_name  = coalesce(p.last_name,  u.raw_user_meta_data ->> 'last_name'),
    email      = coalesce(p.email, u.email)
from auth.users u
where u.id = p.id;

-- 4. Owner can READ every profile (for the dashboard).
drop policy if exists "owner reads all profiles" on public.profiles;
create policy "owner reads all profiles"
  on public.profiles for select
  using ( (auth.jwt() ->> 'email') = 'gradelab26@gmail.com' );

-- 5. Owner can UPDATE every profile (grant/revoke access, change plan).
drop policy if exists "owner updates all profiles" on public.profiles;
create policy "owner updates all profiles"
  on public.profiles for update
  using      ( (auth.jwt() ->> 'email') = 'gradelab26@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'gradelab26@gmail.com' );

-- (The existing "read own profile" policy stays, so normal users can
--  still read their own row but nobody else's.)
