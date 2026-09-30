-- Last-good payload of /api/politicians/trades. The route serves it (with an
-- X-Data-Stale header) whenever its live read fails, so an upstream outage
-- such as the FMP 402s of 2026-09-29 no longer blanks the Politician Tracker.
--
-- Single row (id = 1). Service role only: RLS on, no anon/authenticated policy.
-- Additive and idempotent. NOT applied by CI or by Claude: apply manually in
-- the SQL Editor.

create table if not exists public.congress_trades_snapshot (
  id int primary key default 1 check (id = 1),
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.congress_trades_snapshot enable row level security;
revoke all on public.congress_trades_snapshot from anon, authenticated;
