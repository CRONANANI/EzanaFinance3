-- 20261008000400_capitol_hub_read_models.sql
-- Capitol Watch hub read models. The heatmap (hub_capitol_heatmap, ~2 s idle)
-- and the portfolio (hub_congress_portfolio, ~1.3 s idle) aggregated every
-- congress_trades row per call through the congress_open_positions view, and
-- under page-load bursts some reads hit the 8 s statement timeout. Both now
-- read materialized models, refreshed by refresh_capitol_hub_read_models()
-- from the congress-trades and committees crons.
--
-- Applied in the SQL Editor on 2026-10-08; this file mirrors the live
-- definitions.

-- ── positions: congress_open_positions plus summed purchase ranges and sector ──
create materialized view if not exists public.mv_congress_open_positions as
 WITH t AS (
         SELECT upper(congress_trades.bioguide_id) AS b,
            upper(congress_trades.ticker) AS tk,
            congress_trades.type,
            congress_trades.transaction_date,
            congress_trades.amount_min,
            congress_trades.amount_max
           FROM congress_trades
          WHERE ((congress_trades.ticker IS NOT NULL) AND (congress_trades.ticker <> ''::text))
        ), lfs AS (
         SELECT t.b,
            t.tk,
            max(t.transaction_date) FILTER (WHERE (t.type = 'sale'::text)) AS last_full_sale
           FROM t
          GROUP BY t.b, t.tk
        ), buys AS (
         SELECT t.b,
            t.tk,
            sum(t.amount_min) AS lo,
            sum(t.amount_max) AS hi
           FROM (t
             JOIN lfs USING (b, tk))
          WHERE ((t.type = 'purchase'::text) AND ((lfs.last_full_sale IS NULL) OR (t.transaction_date > lfs.last_full_sale)))
          GROUP BY t.b, t.tk
        )
 SELECT o.bioguide_id,
    o.member_name,
    lower(o.chamber) AS chamber,
    o.party,
    o.state,
    o.ticker,
    o.est_value,
    o.first_buy,
    o.last_date,
    o.last_type,
    o.trades,
    COALESCE(b.lo, (0)::numeric) AS est_low,
    COALESCE(b.hi, (0)::numeric) AS est_high,
    ts.sector
   FROM ((congress_open_positions o
     LEFT JOIN buys b ON (((b.b = upper(o.bioguide_id)) AND (b.tk = o.ticker))))
     LEFT JOIN ticker_sectors ts ON ((ts.ticker = o.ticker)));

create unique index if not exists mv_congress_open_positions_pk
  on public.mv_congress_open_positions (bioguide_id, ticker);
create index if not exists mv_congress_open_positions_ticker
  on public.mv_congress_open_positions (ticker);
create index if not exists mv_congress_open_positions_party_chamber
  on public.mv_congress_open_positions (party, chamber);
create index if not exists mv_congress_open_positions_member_value
  on public.mv_congress_open_positions (bioguide_id, est_value desc);

-- ── heatmap and portfolio read the positions model ─────────────────────
CREATE OR REPLACE FUNCTION public.hub_capitol_heatmap(p_chamber text DEFAULT 'house'::text, p_min_seats integer DEFAULT 10)
 RETURNS TABLE(committee_thomas_id text, committee text, chamber text, sector text, seats integer, holders integer, share_pct numeric, holder_rows jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
    select upper(o.bioguide_id) as bioguide_id, o.sector,
           array_agg(distinct o.ticker) as tickers, max(o.last_date) as last_trade
    from mv_congress_open_positions o
    where o.sector is not null and o.sector <> 'Funds & ETFs'
    group by upper(o.bioguide_id), o.sector
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
$function$;

CREATE OR REPLACE FUNCTION public.hub_congress_portfolio(p_party text DEFAULT NULL::text, p_chamber text DEFAULT NULL::text, p_limit integer DEFAULT 16)
 RETURNS TABLE(ticker text, members integer, est_low numeric, est_high numeric, sector text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select o.ticker, count(*)::int, sum(o.est_low), sum(o.est_high), max(o.sector)
  from mv_congress_open_positions o
  where coalesce(o.sector, '') <> 'Funds & ETFs'
    and (p_party is null or o.party = upper(p_party))
    and (p_chamber is null or o.chamber = lower(p_chamber))
  group by o.ticker
  order by count(*) desc, sum(o.est_high) desc, o.ticker
  limit least(greatest(coalesce(p_limit, 16), 1), 50);
$function$;

-- ── heatmap: both chambers precomputed ─────────────────────────────────
create materialized view if not exists public.mv_capitol_heatmap as
 SELECT 'house'::text AS req_chamber,
    h.committee_thomas_id,
    h.committee,
    h.chamber,
    h.sector,
    h.seats,
    h.holders,
    h.share_pct,
    h.holder_rows
   FROM hub_capitol_heatmap('house'::text, 10) h(committee_thomas_id, committee, chamber, sector, seats, holders, share_pct, holder_rows)
UNION ALL
 SELECT 'senate'::text AS req_chamber,
    h.committee_thomas_id,
    h.committee,
    h.chamber,
    h.sector,
    h.seats,
    h.holders,
    h.share_pct,
    h.holder_rows
   FROM hub_capitol_heatmap('senate'::text, 10) h(committee_thomas_id, committee, chamber, sector, seats, holders, share_pct, holder_rows);

create unique index if not exists mv_capitol_heatmap_pk
  on public.mv_capitol_heatmap (req_chamber, committee_thomas_id, sector);

-- ── refresh (concurrently where possible) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_capitol_hub_read_models()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  begin
    refresh materialized view concurrently public.mv_congress_open_positions;
  exception when others then
    refresh materialized view public.mv_congress_open_positions;
  end;
  begin
    refresh materialized view concurrently public.mv_capitol_heatmap;
  exception when others then
    refresh materialized view public.mv_capitol_heatmap;
  end;
end;
$function$;

revoke all on public.mv_congress_open_positions, public.mv_capitol_heatmap from public, anon, authenticated;
grant select on public.mv_congress_open_positions, public.mv_capitol_heatmap to service_role;
revoke all on function public.hub_capitol_heatmap(text, integer) from public, anon, authenticated;
revoke all on function public.hub_congress_portfolio(text, text, integer) from public, anon, authenticated;
revoke all on function public.refresh_capitol_hub_read_models() from public, anon, authenticated;
grant execute on function public.hub_capitol_heatmap(text, integer) to service_role;
grant execute on function public.hub_congress_portfolio(text, text, integer) to service_role;
grant execute on function public.refresh_capitol_hub_read_models() to service_role;
