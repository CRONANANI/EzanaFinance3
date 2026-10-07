-- 20261008000100_capitol_hub_redesign.sql
-- Data for the Capitol Watch hub redesign (final hybrid):
--   1. hub_capitol_heatmap(chamber)       committee by sector: share of each full committee
--                                         holding at least one stock in the sector (inferred)
--   2. hub_congress_portfolio(party, chamber, limit)
--                                         the most widely held stocks across Congress with
--                                         the sum of each holder's disclosed purchase ranges
--   3. hub_capitol_insider_overlap(days, limit)
--                                         member purchases in the same calendar month as a
--                                         corporate insider's open-market purchase (Form 4 code P)
--   4. capitol_signal_rules                each user's saved "high signal" rules (own rows only)
-- Holdings come from congress_open_positions (inferred: a purchase not followed by a full sale).
-- Sectors come from ticker_sectors (GICS); funds and ETFs are left out of the heatmap.

-- ── 1. committee by sector heatmap ─────────────────────────────────────
create or replace function public.hub_capitol_heatmap(p_chamber text default 'house', p_min_seats integer default 10)
returns table(committee_thomas_id text, committee text, chamber text, sector text, seats integer,
              holders integer, share_pct numeric, holder_rows jsonb)
language sql
stable
set search_path to 'public'
as $$
  with seats as (
    select s.committee_thomas_id, max(s.committee) as committee, max(s.chamber) as chamber,
           upper(s.bioguide_id) as bioguide_id, max(s.member_name) as member_name, max(s.party) as party
    from ezq_committee_seats s
    where not coalesce(s.is_subcommittee, false)
      and lower(s.chamber) = lower(coalesce(p_chamber, 'house'))
    group by s.committee_thomas_id, upper(s.bioguide_id)
  ),
  n as (
    select committee_thomas_id, max(committee) as committee, max(chamber) as chamber, count(*)::int as seats
    from seats group by committee_thomas_id
    having count(*) >= greatest(coalesce(p_min_seats, 10), 1)
  ),
  held as (
    select upper(o.bioguide_id) as bioguide_id, ts.sector,
           array_agg(distinct upper(o.ticker)) as tickers, max(o.last_date) as last_trade
    from congress_open_positions o
    join ticker_sectors ts on ts.ticker = upper(o.ticker)
    where ts.sector <> 'Funds & ETFs'
    group by upper(o.bioguide_id), ts.sector
  )
  select n.committee_thomas_id, n.committee, n.chamber, h.sector, n.seats,
         count(*)::int,
         round(100.0 * count(*) / n.seats, 1),
         jsonb_agg(jsonb_build_object('bioguideId', s.bioguide_id, 'member', s.member_name,
                                      'party', s.party, 'tickers', h.tickers[1:4],
                                      'lastTrade', h.last_trade)
                   order by h.last_trade desc nulls last)
  from n
  join seats s using (committee_thomas_id)
  join held h using (bioguide_id)
  group by n.committee_thomas_id, n.committee, n.chamber, h.sector, n.seats;
$$;
revoke all on function public.hub_capitol_heatmap(text, integer) from public, anon, authenticated;
grant execute on function public.hub_capitol_heatmap(text, integer) to service_role;

-- ── 2. Congress's portfolio ───────────────────────────────────────────
create or replace function public.hub_congress_portfolio(p_party text default null, p_chamber text default null,
                                                         p_limit integer default 16)
returns table(ticker text, members integer, est_low numeric, est_high numeric, sector text)
language sql
stable
set search_path to 'public'
as $$
  with t as (
    select upper(bioguide_id) as b, upper(ticker) as tk, type, transaction_date, amount_min, amount_max
    from congress_trades
    where ticker is not null and ticker <> ''
  ),
  lfs as (
    select b, tk, max(transaction_date) filter (where type = 'sale') as last_full_sale
    from t group by b, tk
  ),
  buys as (
    select t.b, t.tk, sum(t.amount_min) as lo, sum(t.amount_max) as hi
    from t join lfs using (b, tk)
    where t.type = 'purchase' and (lfs.last_full_sale is null or t.transaction_date > lfs.last_full_sale)
    group by t.b, t.tk
  ),
  o as (
    select distinct upper(p.bioguide_id) as b, upper(p.ticker) as tk
    from congress_open_positions p
    where (p_party is null or p.party = upper(p_party))
      and (p_chamber is null or lower(p.chamber) = lower(p_chamber))
  )
  select o.tk, count(*)::int, sum(coalesce(buys.lo, 0)), sum(coalesce(buys.hi, 0)), max(ts.sector)
  from o
  left join buys on buys.b = o.b and buys.tk = o.tk
  left join ticker_sectors ts on ts.ticker = o.tk
  where coalesce(ts.sector, '') <> 'Funds & ETFs'
  group by o.tk
  order by count(*) desc, sum(coalesce(buys.hi, 0)) desc, o.tk
  limit least(greatest(coalesce(p_limit, 16), 1), 50);
$$;
revoke all on function public.hub_congress_portfolio(text, text, integer) from public, anon, authenticated;
grant execute on function public.hub_congress_portfolio(text, text, integer) to service_role;

-- ── 3. member and insider buys in the same month ───────────────────────
create or replace function public.hub_capitol_insider_overlap(p_days integer default 60, p_limit integer default 20)
returns table(ticker text, bioguide_id text, member_name text, party text, member_date date,
              insider_name text, insider_title text, insider_date date, insider_value numeric)
language sql
stable
set search_path to 'public'
as $$
  select x.tk, x.bio, x.mname, x.mparty, x.mdate, x.iname, x.ititle, x.idate, x.ivalue from (
    select distinct on (upper(c.ticker), upper(c.bioguide_id))
           upper(c.ticker) as tk, upper(c.bioguide_id) as bio, c.member_name as mname, c.party as mparty,
           c.transaction_date as mdate, i.reporter_name as iname, i.reporter_title as ititle,
           i.transaction_date as idate, i.value_usd as ivalue
    from congress_trades_enriched c
    join sec_insider_transactions i
      on upper(i.issuer_ticker) = upper(c.ticker)
     and i.transaction_code = 'P'
     and date_trunc('month', i.transaction_date) = date_trunc('month', c.transaction_date)
    where c.type = 'purchase'
      and c.transaction_date >= current_date - greatest(coalesce(p_days, 60), 1)
    order by upper(c.ticker), upper(c.bioguide_id), i.value_usd desc nulls last
  ) x
  order by x.mdate desc, x.tk
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;
revoke all on function public.hub_capitol_insider_overlap(integer, integer) from public, anon, authenticated;
grant execute on function public.hub_capitol_insider_overlap(integer, integer) to service_role;

-- ── 4. saved "high signal" rules ──────────────────────────────────────
create table if not exists public.capitol_signal_rules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  datasets     text[] not null check (cardinality(datasets) >= 2),
  conditions   jsonb not null default '[]'::jsonb,
  time_window  text not null default '90D' check (time_window in ('30D', '90D', '180D', '12M')),
  alerts       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists capitol_signal_rules_user_idx on public.capitol_signal_rules (user_id, created_at desc);

alter table public.capitol_signal_rules enable row level security;
drop policy if exists "own capitol signal rules" on public.capitol_signal_rules;
create policy "own capitol signal rules" on public.capitol_signal_rules
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
grant select, insert, update, delete on public.capitol_signal_rules to authenticated;
