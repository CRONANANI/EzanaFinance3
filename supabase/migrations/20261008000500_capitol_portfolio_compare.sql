-- 20261008000500_capitol_portfolio_compare.sql
-- Congress's portfolio, Compare: every ticker held (inferred open positions)
-- by side A and side B, for an area-proportional Venn. p_dim 'party' compares
-- Democrats (a) with Republicans (b), narrowed by p_chamber; 'chamber'
-- compares the House (a) with the Senate (b), narrowed by p_party.
-- Returns { groups: { a: { members, tickers }, b: {...} }, rows: [{ ticker,
-- sector, a, b, aHigh, bHigh }] } where a / b count the members holding it.
--
-- Applied in the SQL Editor on 2026-10-08; this file mirrors the live
-- definition.

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

revoke all on function public.hub_congress_portfolio_compare(text, text, text) from public, anon, authenticated;
grant execute on function public.hub_congress_portfolio_compare(text, text, text) to service_role;
