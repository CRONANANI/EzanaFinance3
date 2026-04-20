-- =============================================================================
-- platform_return_aggregates
-- -----------------------------------------------------------------------------
-- Daily precomputed cross-sectional percentiles of users' window-local
-- cumulative returns. Backs the "Performance vs. Platform" chart on the
-- My Profile page.
--
-- One row per (date, window_key). The nightly job
-- (src/lib/platform-aggregates/compute.js) upserts rows for every (date)
-- in the current window for every window_key in {1W, 1M, 3M, YTD}.
--
-- Only aggregates leave the server — individual user series never do.
-- =============================================================================

create table if not exists public.platform_return_aggregates (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  window_days integer not null,
  window_key text not null check (window_key in ('1W', '1M', '3M', 'YTD')),
  sample_size integer not null,
  p25 numeric not null,
  p50 numeric not null,
  p75 numeric not null,
  mean numeric,
  computed_at timestamptz not null default now(),
  constraint platform_return_aggregates_date_window_key unique (date, window_key)
);

create index if not exists platform_return_aggregates_lookup_idx
  on public.platform_return_aggregates (window_key, date);

-- Aggregates are public (non-identifying) — every user on the My Profile
-- page can read the same precomputed percentiles for their chart overlay.
alter table public.platform_return_aggregates enable row level security;

drop policy if exists "platform_aggregates_select_all"
  on public.platform_return_aggregates;
create policy "platform_aggregates_select_all"
  on public.platform_return_aggregates
  for select
  using (true);

-- Writes are service-role only; no insert/update/delete policy is needed
-- because PostgREST honors RLS for anon/authenticated and bypasses it for
-- the service role (which is what the nightly job uses).

notify pgrst, 'reload schema';
