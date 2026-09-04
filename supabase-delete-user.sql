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
