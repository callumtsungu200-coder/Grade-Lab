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
