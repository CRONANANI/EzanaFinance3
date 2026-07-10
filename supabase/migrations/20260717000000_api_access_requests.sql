-- Ezana API access requests — intake for the /ezana-api "Request API access" form.
-- Rows are written ONLY by the server route (service role, which bypasses RLS).
-- RLS is enabled with no policies, so anon/authenticated clients can neither
-- read nor write; there is no public read of these requests.

create table if not exists public.api_access_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  company text,
  role text,
  use_case text not null,
  datasets jsonb not null default '[]'::jsonb,
  volume text,
  status text not null default 'new'
);

comment on table public.api_access_requests is
  'Inbound requests from the /ezana-api "Request API access" form. Service-role writes only; no public read.';

create index if not exists api_access_requests_created_at_idx
  on public.api_access_requests (created_at desc);
create index if not exists api_access_requests_status_idx
  on public.api_access_requests (status);

alter table public.api_access_requests enable row level security;
-- Intentionally NO policies: the intake API route uses the service-role client
-- (which bypasses RLS) to insert; every other role is denied read and write.
