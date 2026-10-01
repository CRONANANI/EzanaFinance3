-- Congressional trades owned by Ezana: members from the public-domain
-- unitedstates/congress-legislators dataset, trades landed by the daily
-- cron /api/cron/ingest-congress-trades (never fetched at request time).
-- The Politician Tracker reads these tables and the three RPCs below.
--
-- Trade sources, in order of preference (see the cron for the write-up):
--   house_clerk  public.house_trades (the in-repo House PTR PDF parser)
--   senate_efd   public.senate_trades (table exists; no Senate ingest yet)
--   fmp          FMP senate-latest/house-latest, behind FMP_CONGRESS_ENABLED
--
-- Deviations from the brief, on purpose:
--   * amount_mid treats an open-ended top bracket ("$50,000,000 +", max null)
--     as its floor, not floor/2, matching parseAmountBand in the app.
--   * The RPCs take the tracker's filters (chamber, party, name search, sort)
--     so filtering happens in SQL, not by shipping every row to the client.
--
-- Additive and idempotent. NOT applied by CI or by Claude: apply manually in
-- the SQL Editor. Depends on nothing but pgcrypto (gen_random_uuid).

create extension if not exists pgcrypto;

-- ── members ─────────────────────────────────────────────────────────────
create table if not exists public.congress_members (
  bioguide_id text primary key,
  first_name text not null,
  last_name text not null,
  full_name text not null,
  chamber text not null check (chamber in ('house','senate')),
  party text,                         -- 'D' | 'R' | 'I'
  state text,
  district int,
  in_office boolean not null default true,
  photo_url text,
  updated_at timestamptz not null default now()
);
create index if not exists congress_members_chamber on public.congress_members (chamber, state);

-- ── trades ──────────────────────────────────────────────────────────────
create table if not exists public.congress_trades (
  id uuid primary key default gen_random_uuid(),
  bioguide_id text not null references public.congress_members(bioguide_id),
  chamber text not null check (chamber in ('house','senate')),
  transaction_date date not null,
  disclosure_date date,
  ticker text,
  asset_name text,
  type text not null check (type in ('purchase','sale','sale_partial','exchange')),
  amount_min numeric,
  amount_max numeric,
  amount_mid numeric generated always as (
    case
      when amount_min is null and amount_max is null then null
      when amount_max is null then amount_min
      else (coalesce(amount_min, 0) + amount_max) / 2
    end
  ) stored,
  owner text,
  source text not null,               -- 'house_clerk' | 'senate_efd' | 'fmp'
  source_url text,
  source_hash text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists congress_trades_member_date on public.congress_trades (bioguide_id, transaction_date desc);
create index if not exists congress_trades_ticker on public.congress_trades (ticker);
create index if not exists congress_trades_disclosed on public.congress_trades (disclosure_date desc);
create index if not exists congress_trades_txdate on public.congress_trades (transaction_date desc);

-- ── ingest issues (unmatched members, upstream failures) ────────────────
create table if not exists public.congress_ingest_issues (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists congress_ingest_issues_kind on public.congress_ingest_issues (kind, created_at desc);

-- ── last-good API payload (also created by 20260930000000) ──────────────
create table if not exists public.congress_trades_snapshot (
  id int primary key default 1 check (id = 1),
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

-- ── RLS: members and trades public-read; issues and snapshot service only ─
alter table public.congress_members enable row level security;
alter table public.congress_trades enable row level security;
alter table public.congress_ingest_issues enable row level security;
alter table public.congress_trades_snapshot enable row level security;

drop policy if exists "members public read" on public.congress_members;
create policy "members public read" on public.congress_members for select using (true);
drop policy if exists "trades public read" on public.congress_trades;
create policy "trades public read" on public.congress_trades for select using (true);
revoke insert, update, delete on public.congress_members, public.congress_trades from anon, authenticated;
revoke all on public.congress_ingest_issues, public.congress_trades_snapshot from anon, authenticated;

-- ── RPCs ────────────────────────────────────────────────────────────────
-- Shared filter: chamber 'house'|'senate'|null, party 'D'|'R'|'I'|null,
-- p_q a case-insensitive substring of the member's name or state.

-- Rankings for the table and the Top-eight cards.
drop function if exists public.politician_rankings(int);
create or replace function public.politician_rankings(
  window_days int default 365,
  p_chamber text default null,
  p_party text default null,
  p_q text default null,
  p_sort text default 'volume',
  lim int default 600
)
returns table (
  bioguide_id text, full_name text, chamber text, party text, state text, district int,
  photo_url text, trades bigint, buys bigint, sells bigint, disclosed_volume numeric,
  last_trade date, top_tickers text[]
) language sql stable set search_path = public as $$
  with m as (
    select * from public.congress_members cm
    where (p_chamber is null or cm.chamber = lower(p_chamber))
      and (p_party is null or cm.party = upper(p_party))
      and (p_q is null or p_q = ''
           or cm.full_name ilike '%' || p_q || '%'
           or cm.state ilike p_q)
  ),
  t as (
    select ct.* from public.congress_trades ct
    join m on m.bioguide_id = ct.bioguide_id
    where ct.transaction_date >= current_date - window_days
  ),
  agg as (
    select t.bioguide_id,
      count(*) trades,
      count(*) filter (where t.type = 'purchase') buys,
      count(*) filter (where t.type in ('sale','sale_partial')) sells,
      sum(t.amount_mid) disclosed_volume,
      max(t.transaction_date) last_trade
    from t group by t.bioguide_id
  ),
  tk as (
    select s.bioguide_id, array_agg(s.ticker order by s.c desc, s.ticker) top_tickers
    from (
      select t.bioguide_id, t.ticker, count(*) c,
             row_number() over (partition by t.bioguide_id order by count(*) desc, t.ticker) rn
      from t where t.ticker is not null group by t.bioguide_id, t.ticker
    ) s where s.rn <= 3 group by s.bioguide_id
  )
  select m.bioguide_id, m.full_name, m.chamber, m.party, m.state, m.district, m.photo_url,
         a.trades, a.buys, a.sells, a.disclosed_volume, a.last_trade,
         coalesce(tk.top_tickers, '{}')
  from agg a
  join m on m.bioguide_id = a.bioguide_id
  left join tk on tk.bioguide_id = a.bioguide_id
  order by
    case when p_sort = 'trades' then a.trades end desc nulls last,
    case when p_sort = 'latest' then a.last_trade end desc nulls last,
    a.disclosed_volume desc nulls last,
    a.trades desc,
    m.full_name
  limit greatest(1, least(lim, 1000));
$$;

-- Trades per month per chamber, for the Trades-by-month chart.
drop function if exists public.congress_monthly_counts(int);
create or replace function public.congress_monthly_counts(
  window_days int default 365,
  p_chamber text default null,
  p_party text default null,
  p_q text default null
)
returns table (month date, house bigint, senate bigint)
language sql stable set search_path = public as $$
  select date_trunc('month', ct.transaction_date)::date as month,
         count(*) filter (where ct.chamber = 'house') house,
         count(*) filter (where ct.chamber = 'senate') senate
  from public.congress_trades ct
  join public.congress_members cm on cm.bioguide_id = ct.bioguide_id
  where ct.transaction_date >= current_date - window_days
    and (p_chamber is null or ct.chamber = lower(p_chamber))
    and (p_party is null or cm.party = upper(p_party))
    and (p_q is null or p_q = '' or cm.full_name ilike '%' || p_q || '%' or cm.state ilike p_q)
  group by 1 order by 1;
$$;

-- Most traded tickers, for the Most-traded-tickers panel.
drop function if exists public.congress_top_tickers(int, int);
create or replace function public.congress_top_tickers(
  window_days int default 365,
  lim int default 10,
  p_chamber text default null,
  p_party text default null,
  p_q text default null
)
returns table (ticker text, trades bigint, members bigint)
language sql stable set search_path = public as $$
  select ct.ticker, count(*) trades, count(distinct ct.bioguide_id) members
  from public.congress_trades ct
  join public.congress_members cm on cm.bioguide_id = ct.bioguide_id
  where ct.ticker is not null
    and ct.transaction_date >= current_date - window_days
    and (p_chamber is null or ct.chamber = lower(p_chamber))
    and (p_party is null or cm.party = upper(p_party))
    and (p_q is null or p_q = '' or cm.full_name ilike '%' || p_q || '%' or cm.state ilike p_q)
  group by ct.ticker
  order by trades desc, ct.ticker
  limit greatest(1, least(lim, 100));
$$;

grant execute on function public.politician_rankings(int, text, text, text, text, int) to anon, authenticated;
grant execute on function public.congress_monthly_counts(int, text, text, text) to anon, authenticated;
grant execute on function public.congress_top_tickers(int, int, text, text, text) to anon, authenticated;

-- ── portraits: public bucket the cron mirrors official portraits into ──
-- Public read by URL; only the service role writes (no insert policy).
insert into storage.buckets (id, name, public)
values ('congress-photos', 'congress-photos', true)
on conflict (id) do nothing;
