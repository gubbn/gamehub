-- Optional GameHub cloud backup. Run once in the selected Supabase SQL editor.
-- Gameplay never queries this table. Each device backs up its own snapshot.
begin;
create table if not exists public.gamehub_backups (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  device_name text not null default 'Holiday games' check (char_length(device_name) <= 100),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);
alter table public.gamehub_backups enable row level security;

-- Tables are not exposed through the Data API without explicit privileges.
revoke all on public.gamehub_backups from anon, authenticated;
grant select, insert, update, delete on public.gamehub_backups to authenticated;

-- Keep this script safe to run again while refining a project setup.
drop policy if exists "Read own device backups" on public.gamehub_backups;
drop policy if exists "Create own device backups" on public.gamehub_backups;
drop policy if exists "Update own device backups" on public.gamehub_backups;
drop policy if exists "Delete own device backups" on public.gamehub_backups;

create policy "Read own device backups" on public.gamehub_backups
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Create own device backups" on public.gamehub_backups
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Update own device backups" on public.gamehub_backups
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Delete own device backups" on public.gamehub_backups
  for delete to authenticated using ((select auth.uid()) = owner_id);
-- The composite primary key indexes owner_id for every RLS check.
commit;
