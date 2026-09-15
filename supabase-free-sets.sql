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
