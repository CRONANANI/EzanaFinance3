-- EzanaQL: congressional trades as a queryable dataset, and cross-dataset joins.
--
-- 1. congress_trades_enriched: the view EzanaQL's capitol.congress_trades
--    binds to. congress_trades holds bioguide_id only; the member's name,
--    party and state live in congress_members. The view joins them so a query
--    can say WHERE party = "D" or SELECT politician without a second dataset.
--    security_invoker: it reads with the caller's rights, and both tables are
--    public-read, so anon and authenticated see what they already could.
--
-- 2. ezanaql_matching_keys: the SEMI JOIN primitive. Given a list of keys,
--    returns the distinct ones present in a whitelisted table/column. One
--    SELECT DISTINCT in the database, exact however many rows match, instead
--    of paging the key column through PostgREST under a row cap. The
--    whitelist is the set of catalog joinKeys; the executor only ever asks
--    for those, and anything else raises. Identifiers go through format(%I),
--    values through a bound parameter: no caller text reaches the SQL.

create or replace view public.congress_trades_enriched
with (security_invoker = true) as
select
  t.id,
  t.bioguide_id,
  coalesce(m.full_name, t.bioguide_id) as member_name,
  t.chamber,
  m.party,
  m.state,
  t.transaction_date,
  t.disclosure_date,
  upper(t.ticker)                      as ticker,
  t.asset_name,
  t.type,
  t.amount_min,
  t.amount_max,
  t.amount_mid,
  t.owner,
  t.source
from public.congress_trades t
left join public.congress_members m on m.bioguide_id = t.bioguide_id;

grant select on public.congress_trades_enriched to anon, authenticated;

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
    ('congress_trades_enriched',    'ticker')
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

grant execute on function public.ezanaql_matching_keys(text, text, text[]) to anon, authenticated;

-- The view is read through upper(ticker) = any(...) by the function and
-- through .in('ticker', ...) by the executor; this index serves the base
-- table for both (the view's ticker is upper(t.ticker)).
create index if not exists congress_trades_ticker_upper_idx
  on public.congress_trades (upper(ticker)) where ticker is not null;
