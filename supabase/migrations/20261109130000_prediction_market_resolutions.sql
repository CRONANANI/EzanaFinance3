-- Prediction market resolutions (Nov 2026).
--
-- The index crons (index-prediction-markets, index-kalshi) delete a closed
-- market from prediction_market_index about 30 days after its end date, so
-- no resolved outcome was ever kept and the prediction analyst could not
-- measure calibration (brierScore). Before that delete, the crons now store
-- each market's resolution here (src/lib/prediction-markets/resolutions.js):
-- the platform's settled outcome when it answers (outcome_source 'platform',
-- with resolved_price 1, 0 or the split price), else the last stored price
-- when it sits at an extreme ('last_price', resolved_price null), else
-- 'unknown' ('none').
--
-- Public market data: readable by anyone (RLS select policy), written only
-- by the service role. Additive and idempotent; the crons skip the archive
-- quietly until this table exists.

create table if not exists public.prediction_market_resolutions (
  market_id text primary key,
  platform text not null,
  question text not null,
  event_key text,
  event_title text,
  outcome_label text,
  category text,
  outcome text not null check (outcome in ('yes', 'no', 'split', 'unknown')),
  outcome_source text not null check (outcome_source in ('platform', 'last_price', 'none')),
  resolved_price numeric check (resolved_price is null or (resolved_price >= 0 and resolved_price <= 1)),
  last_price numeric check (last_price is null or (last_price >= 0 and last_price <= 1)),
  end_date timestamptz,
  resolved_at timestamptz,
  recorded_at timestamptz not null default now()
);

create index if not exists prediction_market_resolutions_platform_resolved_idx
  on public.prediction_market_resolutions (platform, resolved_at desc);
create index if not exists prediction_market_resolutions_event_idx
  on public.prediction_market_resolutions (event_key)
  where event_key is not null;

alter table public.prediction_market_resolutions enable row level security;

drop policy if exists prediction_market_resolutions_public_read
  on public.prediction_market_resolutions;
create policy prediction_market_resolutions_public_read
  on public.prediction_market_resolutions
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete, truncate on public.prediction_market_resolutions from anon, authenticated;
grant select on public.prediction_market_resolutions to anon, authenticated;
grant all on public.prediction_market_resolutions to service_role;
