-- EzanaQL saved reports: a signed-in user's saved queries (/api/ezanaql/saved).
-- Rows are owned by the user; RLS limits every read, insert and delete to them.
--
-- ALREADY APPLIED by hand in the SQL Editor (SQL-2-ezanaql-saved-reports). The
-- original SQL-2 file was not in the repo; this file was written to match the
-- live schema as read back from production on 2026-10-06, and is idempotent.
-- Not executed by Claude.

create table if not exists public.ezanaql_saved_reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 120),
  prompt        text check (prompt is null or char_length(prompt) <= 500),
  query         text not null check (char_length(query) between 1 and 4000),
  dataset_scope text check (dataset_scope is null or char_length(dataset_scope) <= 80),
  row_count     integer check (row_count is null or row_count >= 0),
  created_at    timestamptz not null default now()
);

create index if not exists ezanaql_saved_reports_user_created_idx
  on public.ezanaql_saved_reports (user_id, created_at desc);

alter table public.ezanaql_saved_reports enable row level security;

drop policy if exists ezanaql_saved_reports_select_own on public.ezanaql_saved_reports;
create policy ezanaql_saved_reports_select_own on public.ezanaql_saved_reports
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ezanaql_saved_reports_insert_own on public.ezanaql_saved_reports;
create policy ezanaql_saved_reports_insert_own on public.ezanaql_saved_reports
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists ezanaql_saved_reports_delete_own on public.ezanaql_saved_reports;
create policy ezanaql_saved_reports_delete_own on public.ezanaql_saved_reports
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, delete on public.ezanaql_saved_reports to authenticated;
