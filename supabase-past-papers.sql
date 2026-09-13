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
