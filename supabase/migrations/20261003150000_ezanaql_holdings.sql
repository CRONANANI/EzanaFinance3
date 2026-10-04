-- EzanaQL: capitol.holdings, the positions members still hold.
--
-- congress_open_positions is one row per (member, ticker) the disclosures say
-- is still open: the member has a buy, and their latest action on the ticker
-- is a purchase or a partial sale. Same rule as the tracker's Most-held chart
-- and the member panel's portfolio (politician_portfolio); est_value is the
-- same midpoint estimate (buys minus partial sales since the last full sale,
-- floored at the smallest bracket). Nothing here is a reported holding:
-- STOCK Act filings report trades in ranges, never positions.
--
-- A plain view over congress_trades (≈54k rows): the aggregation runs per
-- query, well under a second. If it ever isn't, make it a materialized view
-- refreshed by /api/cron/ingest-congress-trades.

create or replace view public.congress_open_positions
with (security_invoker = true) as
with t as (
  select t.bioguide_id,
         upper(t.ticker)    as tk,
         t.type, t.transaction_date, t.disclosure_date, t.amount_mid
  from public.congress_trades t
  where t.ticker is not null
),
lfs as (
  select bioguide_id, tk,
         max(transaction_date) filter (where type = 'sale') as last_full_sale
  from t group by 1, 2
),
per as (
  select t.bioguide_id, t.tk,
    bool_or(t.type = 'purchase')                                                  as has_buy,
    (array_agg(t.type order by t.transaction_date desc, t.disclosure_date desc nulls last))[1] as last_type,
    max(t.transaction_date)                                                       as last_date,
    min(t.transaction_date) filter (
      where t.type = 'purchase' and (l.last_full_sale is null or t.transaction_date > l.last_full_sale)) as first_buy,
    count(*)                                                                      as trades,
    coalesce(sum(t.amount_mid) filter (
      where t.type = 'purchase' and (l.last_full_sale is null or t.transaction_date > l.last_full_sale)), 0)
  - coalesce(sum(t.amount_mid) filter (
      where t.type = 'sale_partial' and (l.last_full_sale is null or t.transaction_date > l.last_full_sale)), 0) as net
  from t
  join lfs l on l.bioguide_id = t.bioguide_id and l.tk = t.tk
  group by t.bioguide_id, t.tk
)
select
  p.bioguide_id,
  coalesce(m.full_name, p.bioguide_id) as member_name,
  m.chamber,
  m.party,
  m.state,
  p.tk                                 as ticker,
  greatest(p.net, 1001)                as est_value,
  p.first_buy,
  p.last_date,
  p.last_type,
  p.trades
from per p
left join public.congress_members m on m.bioguide_id = p.bioguide_id
where p.has_buy and p.last_type in ('purchase', 'sale_partial');

grant select on public.congress_open_positions to anon, authenticated;

-- SEMI JOIN helper: the holdings view is a join key too.
create or replace function public.ezanaql_matching_keys(
  p_table  text,
  p_column text,
  p_keys   text[]
) returns text[]
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_keys   text[];
  v_result text[];
begin
  if (p_table, p_column) not in (
    ('usaspending_contract_awards', 'ticker'),
    ('contract_awards_resolved',    'ticker'),
    ('congress_trades_enriched',    'ticker'),
    ('congress_open_positions',     'ticker')
  ) then
    raise exception 'ezanaql_matching_keys: %.% is not a declared join key', p_table, p_column
      using errcode = 'check_violation';
  end if;
  if p_keys is null or cardinality(p_keys) = 0 then
    return '{}'::text[];
  end if;
  if cardinality(p_keys) > 5000 then
    raise exception 'ezanaql_matching_keys: at most 5000 keys per call'
      using errcode = 'check_violation';
  end if;
  select array_agg(distinct upper(k)) into v_keys from unnest(p_keys) k where k is not null;
  execute format(
    'select coalesce(array_agg(distinct upper(%I)), ''{}''::text[]) from %I where upper(%I) = any($1)',
    p_column, p_table, p_column
  ) into v_result using v_keys;
  return coalesce(v_result, '{}'::text[]);
end;
$$;
