-- 20261008001000_portfolio_sitting_members.sql
-- Congress's portfolio counted people who have left Congress: positions are
-- inferred from disclosures, and a former member stops filing, so their last
-- purchase stays "open". 18 of the 45 members shown holding MSFT and 24 of
-- the 50 holding AMZN were former members. The list and the Compare Venn now
-- count sitting members only (congress_members.in_office).
--
-- Applied in the SQL Editor on 2026-10-08; this file mirrors the live
-- definitions.

CREATE OR REPLACE FUNCTION public.hub_congress_portfolio(p_party text DEFAULT NULL::text, p_chamber text DEFAULT NULL::text, p_limit integer DEFAULT 16)
 RETURNS TABLE(ticker text, members integer, est_low numeric, est_high numeric, sector text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select o.ticker, count(*)::int, sum(o.est_low), sum(o.est_high), max(o.sector)
  from mv_congress_open_positions o
  join congress_members m on m.bioguide_id = o.bioguide_id and m.in_office
  where coalesce(o.sector, '') <> 'Funds & ETFs'
    and (p_party is null or o.party = upper(p_party))
    and (p_chamber is null or o.chamber = lower(p_chamber))
  group by o.ticker
  order by count(*) desc, sum(o.est_high) desc, o.ticker
  limit least(greatest(coalesce(p_limit, 16), 1), 50);
$function$;

CREATE OR REPLACE FUNCTION public.hub_congress_portfolio_compare(p_dim text DEFAULT 'party'::text, p_party text DEFAULT NULL::text, p_chamber text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with o as (
    select p.*,
           case when lower(coalesce(p_dim, 'party')) = 'chamber' then p.chamber = 'house'
                else p.party = 'D' end as in_a,
           case when lower(coalesce(p_dim, 'party')) = 'chamber' then p.chamber = 'senate'
                else p.party = 'R' end as in_b
    from mv_congress_open_positions p
    join congress_members m on m.bioguide_id = p.bioguide_id and m.in_office
    where coalesce(p.sector, '') <> 'Funds & ETFs'
      and (lower(coalesce(p_dim, 'party')) = 'chamber' or p_chamber is null
           or p.chamber = lower(p_chamber))
      and (lower(coalesce(p_dim, 'party')) <> 'chamber' or p_party is null
           or p.party = upper(p_party))
  ),
  r as (
    select ticker,
           max(sector) as sector,
           count(*) filter (where in_a)::int as a,
           count(*) filter (where in_b)::int as b,
           coalesce(sum(est_high) filter (where in_a), 0) as a_high,
           coalesce(sum(est_high) filter (where in_b), 0) as b_high
    from o
    where in_a or in_b
    group by ticker
  )
  select jsonb_build_object(
    'groups', jsonb_build_object(
      'a', jsonb_build_object(
        'members', (select count(distinct bioguide_id) from o where in_a),
        'tickers', (select count(*) from r where a > 0)),
      'b', jsonb_build_object(
        'members', (select count(distinct bioguide_id) from o where in_b),
        'tickers', (select count(*) from r where b > 0))
    ),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'ticker', ticker, 'sector', sector, 'a', a, 'b', b,
               'aHigh', a_high, 'bHigh', b_high)
             order by (a + b) desc, ticker)
      from r), '[]'::jsonb)
  );
$function$;

revoke all on function public.hub_congress_portfolio(text, text, integer) from public, anon, authenticated;
revoke all on function public.hub_congress_portfolio_compare(text, text, text) from public, anon, authenticated;
grant execute on function public.hub_congress_portfolio(text, text, integer) to service_role;
grant execute on function public.hub_congress_portfolio_compare(text, text, text) to service_role;
