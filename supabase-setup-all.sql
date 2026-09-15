-- Grade Lab — ALL pending Supabase setup in one go.
-- Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- Every part is safe to run more than once.

-- ================================================================
-- supabase-leaderboard.sql
-- ================================================================
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


-- ================================================================
-- supabase-past-papers.sql
-- ================================================================
-- Grade Lab — past papers table.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- Anyone (signed in or not) can read the list; only the owner account can
-- post, edit or remove papers. Safe to run more than once.
--
-- If the owner account ever changes, update the email in the three
-- policies below (it must match OWNER_EMAILS in src/supabaseConfig.js).

create table if not exists public.past_papers (
  id         uuid primary key default gen_random_uuid(),
  subject    text not null,                -- Grade Lab subject id, e.g. 'biology'
  board      text,                         -- 'AQA', 'Edexcel', ...
  year       integer not null,
  series     text,                         -- 'June', 'November', 'Specimen', ...
  paper      text not null,                -- 'Paper 1', 'Paper 2H', ...
  tier       text,                         -- 'F', 'H' or null
  qp_url     text,                         -- question paper link
  ms_url     text,                         -- mark scheme link
  notes      text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.past_papers enable row level security;

-- Everyone can read (the app is usable in demo mode without an account).
drop policy if exists "past papers readable by all" on public.past_papers;
create policy "past papers readable by all"
  on public.past_papers for select
  to anon, authenticated
  using (true);

-- Only the owner can post.
drop policy if exists "owner inserts past papers" on public.past_papers;
create policy "owner inserts past papers"
  on public.past_papers for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'gradelab26@gmail.com');

drop policy if exists "owner updates past papers" on public.past_papers;
create policy "owner updates past papers"
  on public.past_papers for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'gradelab26@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'gradelab26@gmail.com');

drop policy if exists "owner deletes past papers" on public.past_papers;
create policy "owner deletes past papers"
  on public.past_papers for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'gradelab26@gmail.com');

create index if not exists past_papers_subject_year_idx
  on public.past_papers (subject, year desc);


-- ================================================================
-- supabase-free-sets.sql
-- ================================================================
-- Grade Lab — free plan allowance, stored per account.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- Safe to run more than once.
--
-- Each signed-in account can unlock up to 5 "sets" (a flashcard deck, a quiz
-- section or an exam-question section). The list lives here so it follows the
-- account across devices and can't be reset by clearing browser data.
-- Accounts can READ their row but can't write it directly: every change goes
-- through the two functions below, which enforce the limit.

create table if not exists public.free_sets (
  id         uuid primary key references auth.users (id) on delete cascade,
  sets       text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.free_sets enable row level security;

drop policy if exists "read own free sets" on public.free_sets;
create policy "read own free sets"
  on public.free_sets for select
  to authenticated
  using (auth.uid() = id);

-- Spend one free set on `set_key`. Returns the account's full list.
-- Raises 'free set limit reached' when all 5 are used.
create or replace function public.claim_free_set(set_key text)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur text[];
  lim constant int := 5;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if set_key is null or length(set_key) = 0 or length(set_key) > 200 then
    raise exception 'bad set key';
  end if;

  insert into public.free_sets (id) values (uid) on conflict (id) do nothing;
  select sets into cur from public.free_sets where id = uid for update;

  if set_key = any(cur) then
    return cur;
  end if;
  if coalesce(array_length(cur, 1), 0) >= lim then
    raise exception 'free set limit reached' using errcode = 'P0001';
  end if;

  update public.free_sets
     set sets = array_append(cur, set_key), updated_at = now()
   where id = uid
  returning sets into cur;
  return cur;
end;
$$;

-- On sign-in: add any sets unlocked on this device (as a guest) to the
-- account, up to the limit. Returns the account's full list.
create or replace function public.sync_free_sets(local_keys text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur text[];
  k text;
  lim constant int := 5;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  insert into public.free_sets (id) values (uid) on conflict (id) do nothing;
  select sets into cur from public.free_sets where id = uid for update;

  if local_keys is not null then
    foreach k in array local_keys loop
      exit when coalesce(array_length(cur, 1), 0) >= lim;
      if k is not null and length(k) between 1 and 200 and not (k = any(cur)) then
        cur := array_append(cur, k);
      end if;
    end loop;
  end if;

  update public.free_sets set sets = cur, updated_at = now() where id = uid;
  return cur;
end;
$$;

revoke all on function public.claim_free_set(text) from public, anon;
revoke all on function public.sync_free_sets(text[]) from public, anon;
grant execute on function public.claim_free_set(text) to authenticated;
grant execute on function public.sync_free_sets(text[]) to authenticated;


-- ================================================================
-- supabase-delete-user.sql
-- ================================================================
-- Grade Lab — owner-only "delete a user account" function.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
--
-- Deleting an auth user needs admin privileges that must NEVER be shipped in the
-- website code. Instead we expose a SECURITY DEFINER function that runs with
-- elevated rights but first checks the caller is the owner account. The frontend
-- calls it with supabase.rpc('admin_delete_user', { target: <uuid> }).
--
-- Change the owner email below if your owner account is different.

create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  -- Only the owner account may delete users.
  if caller_email <> 'gradelab26@gmail.com' then
    raise exception 'Not authorised';
  end if;

  -- Never delete the owner's own account.
  if target = auth.uid() then
    raise exception 'You cannot delete your own owner account';
  end if;

  -- Remove the user's app data first (safe even if some rows do not exist).
  delete from public.leaderboard    where id = target;
  delete from public.user_progress  where id = target;
  delete from public.profiles       where id = target;

  -- Finally remove the auth account itself.
  delete from auth.users where id = target;
end;
$$;

-- Lock the function down: only signed-in users can call it, and the body above
-- rejects everyone except the owner.
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;


-- Self-service: let ANY signed-in user permanently delete their OWN account.
-- It can only ever act on auth.uid(), so no one can delete anyone else with it.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  delete from public.leaderboard    where id = uid;
  delete from public.user_progress  where id = uid;
  delete from public.profiles       where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;


-- ================================================================
-- supabase-edit-user.sql
-- ================================================================
-- Grade Lab — owner-only "edit a user's details" function.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
--
-- Lets the owner change another account's name and login email. Changing an email
-- touches the auth system, which needs elevated rights — so, like delete, this is
-- a SECURITY DEFINER function that first checks the caller is the owner.
-- The frontend calls supabase.rpc('admin_update_user', {...}).
--
-- Change the owner email below if your owner account is different.

create or replace function public.admin_update_user(
  target    uuid,
  new_email text,
  new_first text,
  new_last  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  clean_email  text := nullif(lower(trim(coalesce(new_email, ''))), '');
  meta         jsonb := jsonb_build_object(
                  'first_name', new_first,
                  'last_name',  new_last,
                  'full_name',  trim(coalesce(new_first, '') || ' ' || coalesce(new_last, ''))
                );
begin
  -- Only the owner account may edit users.
  if caller_email <> 'gradelab26@gmail.com' then
    raise exception 'Not authorised';
  end if;

  -- Update the auth account: name metadata always; email only if one was given.
  update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || meta,
        email = coalesce(clean_email, email),
        updated_at = now()
    where id = target;

  -- Mirror the same values into the profiles table the dashboard reads.
  update public.profiles
    set first_name = new_first,
        last_name  = new_last,
        email      = coalesce(clean_email, email),
        updated_at = now()
    where id = target;
end;
$$;

revoke all on function public.admin_update_user(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_user(uuid, text, text, text) to authenticated;

