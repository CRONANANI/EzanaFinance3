-- Result cache for the landing band's auto-demo. One row per cache key.
--
-- Why a table and not the framework's cache: the demo's pipeline is nothing
-- but dynamic work (external fetches, a model call, service-role Supabase
-- queries), and Next restricts exactly that inside a cached function. A row
-- has no execution-context rules at all, and unlike a per-instance memo it is
-- shared, so the synthesis behind the demo is paid about once a day across
-- every region rather than once per cold start.
--
-- Service-role read/write only. RLS is enabled with NO policies, which denies
-- anon and authenticated outright; the service-role key bypasses RLS, and the
-- only writer is the demo route.
create table if not exists public.landing_demo_cache (
  cache_key text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.landing_demo_cache enable row level security;
