-- 20261007000100_capitol_hub_speed_and_committee_stats.sql
-- 1. Trades near contract awards: the hub RPC ran ~7.6s against the 8s
--    PostgREST statement timeout because contract_awards_resolved ran the
--    contractor_name_key() regex over every award row on every call.
--    a) store the name key once as a generated column and index it;
--    b) recreate the view on that column (same columns, same order);
--    c) a narrow materialized view of awards that resolve to a ticker, indexed
--       (ticker, action_date), refreshed by the USAspending and resolver crons;
--    d) the hub function reads the MV and joins member names instead of
--       correlated subqueries.
-- 2. hub_committee_ticker_stats: for each (committee, ticker) pair, the
--    committee's seat count, how many of its members still hold the ticker
--    (inferred from disclosures) and how many bought or sold it in the window.

-- ── 1a. stored name key ────────────────────────────────────────────────
alter table public.usaspending_contract_awards
  add column if not exists recipient_name_key text
  generated always as (public.contractor_name_key(recipient_name)) stored;

create index if not exists idx_usac_recipient_name_key
  on public.usaspending_contract_awards (recipient_name_key);

-- ── 1b. same view, joined on the stored key ────────────────────────────
create or replace view public.contract_awards_resolved
with (security_invoker = true) as
select
  a.generated_award_id,
  a.award_id_piid,
  a.recipient_name,
  a.recipient_id,
  coalesce(r.parent_name, a.recipient_name)                 as parent_name,
  a.award_amount,
  a.awarding_agency,
  a.awarding_sub_agency,
  a.funding_agency,
  a.action_date,
  a.award_type,
  a.fiscal_year,
  coalesce(r.ticker, t.ticker, a.ticker)                    as ticker,
  coalesce(r.is_public, t.is_public,
           case when a.ticker is not null then true end)    as is_public,
  coalesce(r.ticker_source,
           case when t.name_key is not null then 'exact:name'
                when a.ticker is not null then 'legacy' end) as ticker_source,
  a.synced_at
from public.usaspending_contract_awards a
left join public.contractor_recipients r on r.recipient_id = a.recipient_id
left join public.contractor_tickers t
       on r.recipient_id is null
      and t.name_key = a.recipient_name_key;

grant select on public.contract_awards_resolved to anon, authenticated;

-- ── 1c. awards that resolve to a ticker, narrow and indexed ────────────
drop materialized view if exists public.mv_contract_award_tickers;
create materialized view public.mv_contract_award_tickers as
select generated_award_id,
       upper(ticker)   as ticker,
       action_date,
       award_amount,
       awarding_agency
from public.contract_awards_resolved
where ticker is not null and ticker <> '' and action_date is not null;

create unique index mv_contract_award_tickers_pk
  on public.mv_contract_award_tickers (generated_award_id);
create index mv_contract_award_tickers_ticker_date
  on public.mv_contract_award_tickers (ticker, action_date);

-- Server only: the hub reads it through the function below.
revoke all on public.mv_contract_award_tickers from public, anon, authenticated;
grant select on public.mv_contract_award_tickers to service_role;

create or replace function public.refresh_contract_award_tickers()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    refresh materialized view concurrently public.mv_contract_award_tickers;
  exception when others then
    refresh materialized view public.mv_contract_award_tickers;
  end;
end;
$$;
revoke all on function public.refresh_contract_award_tickers() from public, anon, authenticated;
grant execute on function public.refresh_contract_award_tickers() to service_role;

-- ── 1d. hub function on the MV ─────────────────────────────────────────
create or replace function public.hub_capitol_trades_near_contracts(
  p_since date default (current_date - 365),
  p_window_days integer default 30,
  p_limit integer default 25
)
returns table(bioguide_id text, member_name text, party text, ticker text, trades integer,
              first_trade date, last_trade date, awards integer, award_value numeric,
              top_agency text)
language sql
stable
set search_path to 'public'
as $function$
  with t as (
    select e.bioguide_id, upper(e.ticker) as ticker, e.transaction_date
    from congress_trades_enriched e
    where e.ticker is not null and e.ticker <> '' and e.transaction_date >= p_since
  ),
  pairs as (
    select t.bioguide_id, t.ticker, t.transaction_date, c.generated_award_id,
           c.award_amount, c.awarding_agency
    from t
    join mv_contract_award_tickers c
      on c.ticker = t.ticker
     and c.action_date between t.transaction_date - p_window_days
                           and t.transaction_date + p_window_days
  ),
  awards as (
    select distinct bioguide_id, ticker, generated_award_id, award_amount, awarding_agency
    from pairs
  ),
  agg_awards as (
    select bioguide_id, ticker, count(*)::int as awards, sum(award_amount) as award_value,
           mode() within group (order by awarding_agency) as top_agency
    from awards group by bioguide_id, ticker
  ),
  agg_trades as (
    select p.bioguide_id, p.ticker, count(distinct p.transaction_date)::int as trades,
           min(p.transaction_date) as first_trade, max(p.transaction_date) as last_trade
    from pairs p group by p.bioguide_id, p.ticker
  ),
  ranked as (
    select a.bioguide_id, a.ticker, tr.trades, tr.first_trade, tr.last_trade,
           a.awards, a.award_value, a.top_agency
    from agg_awards a
    join agg_trades tr using (bioguide_id, ticker)
    order by a.award_value desc nulls last
    limit least(greatest(p_limit, 1), 100)
  ),
  names as (
    select e.bioguide_id, max(e.member_name) as member_name, max(e.party) as party
    from congress_trades_enriched e
    where e.bioguide_id in (select bioguide_id from ranked)
      and e.transaction_date >= p_since
    group by e.bioguide_id
  )
  select r.bioguide_id, n.member_name, n.party, r.ticker, r.trades, r.first_trade,
         r.last_trade, r.awards, r.award_value, r.top_agency
  from ranked r
  left join names n using (bioguide_id)
  order by r.award_value desc nulls last;
$function$;
revoke all on function public.hub_capitol_trades_near_contracts(date, integer, integer) from public, anon, authenticated;
grant execute on function public.hub_capitol_trades_near_contracts(date, integer, integer) to service_role;

-- ── 2. committee ownership per (committee, ticker) ─────────────────────
-- p_pairs: [{"committee":"HSIF","ticker":"MSFT"}, ...]  (at most 50 pairs)
-- holders: members of the committee whose disclosures show an open position
--          (bought and not fully sold), from congress_open_positions.
-- buyers / sellers: members of the committee who disclosed a purchase / a
--          sale of the ticker with a transaction date on or after p_since.
create or replace function public.hub_committee_ticker_stats(
  p_pairs jsonb,
  p_since date default (current_date - 180)
)
returns table(committee_thomas_id text, ticker text, seats integer, holders integer,
              holder_names text[], buyers integer, sellers integer)
language sql
stable
set search_path to 'public'
as $function$
  with pairs as (
    select distinct upper(p->>'committee') as committee_thomas_id,
                    upper(p->>'ticker')    as ticker
    from (select p from jsonb_array_elements(coalesce(p_pairs, '[]'::jsonb)) p limit 50) x
    where coalesce(p->>'committee', '') <> '' and coalesce(p->>'ticker', '') <> ''
  ),
  seats as (
    select distinct s.committee_thomas_id, upper(s.bioguide_id) as bioguide_id
    from ezq_committee_seats s
    where s.committee_thomas_id in (select committee_thomas_id from pairs)
  ),
  n as (
    select committee_thomas_id, count(*)::int as seats from seats group by 1
  ),
  held as (
    select distinct upper(o.bioguide_id) as bioguide_id, upper(o.ticker) as ticker,
           o.member_name
    from congress_open_positions o
    where upper(o.ticker) in (select ticker from pairs)
  ),
  traded as (
    select upper(t.bioguide_id) as bioguide_id, upper(t.ticker) as ticker,
           bool_or(t.type = 'purchase')                as bought,
           bool_or(t.type in ('sale', 'sale_partial')) as sold
    from congress_trades_enriched t
    where t.transaction_date >= p_since
      and upper(t.ticker) in (select ticker from pairs)
    group by 1, 2
  )
  select pr.committee_thomas_id, pr.ticker, coalesce(n.seats, 0),
         count(distinct h.bioguide_id)::int,
         coalesce((array_agg(distinct h.member_name)
                     filter (where h.bioguide_id is not null))[1:8], '{}'),
         (count(distinct x.bioguide_id) filter (where x.bought))::int,
         (count(distinct x.bioguide_id) filter (where x.sold))::int
  from pairs pr
  left join n using (committee_thomas_id)
  left join seats s on s.committee_thomas_id = pr.committee_thomas_id
  left join held h on h.bioguide_id = s.bioguide_id and h.ticker = pr.ticker
  left join traded x on x.bioguide_id = s.bioguide_id and x.ticker = pr.ticker
  group by pr.committee_thomas_id, pr.ticker, n.seats;
$function$;
revoke all on function public.hub_committee_ticker_stats(jsonb, date) from public, anon, authenticated;
grant execute on function public.hub_committee_ticker_stats(jsonb, date) to service_role;
