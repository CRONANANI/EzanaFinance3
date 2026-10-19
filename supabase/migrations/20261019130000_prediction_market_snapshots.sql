-- Prediction Markets redesign (docs/design/prediction-markets-handoff/06-DATA.md).
-- Additive and idempotent.
--
-- 1. prediction_market_snapshots: one row per active market per index run
--    (every two hours), pruned to 35 days by the crons. Unlocks the 7d and
--    30d windows and the Hot norm.
-- 2. Window figures stored on prediction_market_index, computed by the crons
--    from the snapshots, so the page reads plain columns.
-- 3. tag_ids on prediction_market_index: the Polymarket tag ids, mapped to the
--    page taxonomy by normalizeCategory() in page-model.js.
-- 4. pm_window_baselines(): indexed lookups of each market's baseline
--    snapshots, called by the crons with the service role only.

create table if not exists public.prediction_market_snapshots (
  market_id    text not null,
  platform     text not null,
  captured_at  timestamptz not null default now(),
  probability  numeric,
  volume       numeric,
  volume_24h   numeric,
  best_bid     numeric,
  best_ask     numeric,
  liquidity    numeric,
  primary key (market_id, captured_at)
);

create index if not exists pms_platform_time_idx
  on public.prediction_market_snapshots (platform, captured_at desc);

-- Coverage checks (oldest snapshot) and the 35-day prune both read by time.
create index if not exists pms_captured_idx
  on public.prediction_market_snapshots (captured_at);

-- Service role only: the crons write, the server reads. No policies on
-- purpose (docs/ENGINEERING.md, "no policies = service-role-only").
alter table public.prediction_market_snapshots enable row level security;
revoke all on public.prediction_market_snapshots from anon, authenticated;

alter table public.prediction_market_index
  add column if not exists tag_ids      text[],
  add column if not exists change_7d    numeric,
  add column if not exists change_30d   numeric,
  add column if not exists volume_7d    numeric,
  add column if not exists volume_30d   numeric,
  add column if not exists volume_norm  numeric;

comment on column public.prediction_market_index.tag_ids is
  'Polymarket tag ids (Gamma include_tag). Mapped to the page taxonomy in page-model.js normalizeCategory.';
comment on column public.prediction_market_index.change_7d is
  'Probability change over 7 days from prediction_market_snapshots; null until the history reaches back 7 days.';
comment on column public.prediction_market_index.volume_norm is
  'Average daily volume over up to 30 days of snapshots, in the venue unit; null under 7 days of history.';

-- For each market id: the first snapshot at or after now - 7 days, the first
-- at or after now - 30 days, and the oldest. One index seek per lookup on the
-- (market_id, captured_at) primary key.
create or replace function public.pm_window_baselines(p_ids text[], p_now timestamptz default now())
returns table (
  market_id        text,
  b7_probability   numeric,
  b7_volume        numeric,
  b7_at            timestamptz,
  b30_probability  numeric,
  b30_volume       numeric,
  b30_at           timestamptz,
  first_volume     numeric,
  first_at         timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    i.id,
    b7.probability, b7.volume, b7.captured_at,
    b30.probability, b30.volume, b30.captured_at,
    f.volume, f.captured_at
  from unnest(p_ids) as i(id)
  left join lateral (
    select s.probability, s.volume, s.captured_at
    from public.prediction_market_snapshots s
    where s.market_id = i.id and s.captured_at >= p_now - interval '7 days'
    order by s.captured_at asc
    limit 1
  ) b7 on true
  left join lateral (
    select s.probability, s.volume, s.captured_at
    from public.prediction_market_snapshots s
    where s.market_id = i.id and s.captured_at >= p_now - interval '30 days'
    order by s.captured_at asc
    limit 1
  ) b30 on true
  left join lateral (
    select s.volume, s.captured_at
    from public.prediction_market_snapshots s
    where s.market_id = i.id
    order by s.captured_at asc
    limit 1
  ) f on true;
$$;

revoke execute on function public.pm_window_baselines(text[], timestamptz) from public, anon, authenticated;
grant execute on function public.pm_window_baselines(text[], timestamptz) to service_role;
