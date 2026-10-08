-- 20261008000900_capitol_dataset_visuals.sql
-- The five dataset tiles at the foot of the Capitol Watch hub: one
-- precomputed row with each tile's small visual (the lobbying aggregate alone
-- takes ~2 s live).
--   trades      disclosures per month, last 12 months (this month partial)
--   contracts   obligations per fiscal year, last 10 loaded
--   lobbying    LDA spend per quarter, last 8 quarters that have started
--   finance     money raised this cycle by party, and the top five raisers
--   committees  committee seats and members by chamber and party
-- Refreshed with the other hub read models by refresh_capitol_hub_read_models()
-- (redefined here to include it; same name, same grant).
--
-- Applied in the SQL Editor on 2026-10-08; this file mirrors the live
-- definitions.

create materialized view if not exists public.mv_capitol_dataset_visuals as
 WITH trades AS (
         SELECT jsonb_agg(jsonb_build_object('m', to_char(g.m, 'YYYY-MM'::text), 'n', COALESCE(t.n, 0)) ORDER BY g.m) AS j
           FROM (generate_series((date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) - '11 mons'::interval), date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone), '1 mon'::interval) g(m)
             LEFT JOIN ( SELECT date_trunc('month'::text, (congress_trades.disclosure_date)::timestamp with time zone) AS m,
                    (count(*))::integer AS n
                   FROM congress_trades
                  WHERE (congress_trades.disclosure_date >= (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) - '11 mons'::interval))
                  GROUP BY (date_trunc('month'::text, (congress_trades.disclosure_date)::timestamp with time zone))) t ON ((t.m = g.m)))
        ), contracts AS (
         SELECT jsonb_agg(jsonb_build_object('fy', x.fiscal_year, 'total', x.total_amount, 'n', x.award_count, 'synced', x.synced_at) ORDER BY x.fiscal_year) AS j
           FROM ( SELECT gov_contract_coverage.fiscal_year,
                    gov_contract_coverage.total_amount,
                    gov_contract_coverage.award_count,
                    gov_contract_coverage.synced_at
                   FROM gov_contract_coverage
                  ORDER BY gov_contract_coverage.fiscal_year DESC
                 LIMIT 10) x
        ), lobbying AS (
         SELECT jsonb_agg(jsonb_build_object('y', x.filing_year, 'q', x.quarter, 'spend', x.spend, 'n', x.n) ORDER BY x.filing_year, x.quarter) AS j
           FROM ( SELECT lobbying_filings.filing_year,
                    lobbying_filings.quarter,
                    COALESCE(sum(lobbying_filings.amount), (0)::numeric) AS spend,
                    (count(*))::integer AS n
                   FROM lobbying_filings
                  WHERE ((lobbying_filings.filing_year >= ((EXTRACT(year FROM CURRENT_DATE))::integer - 2)) AND (NOT COALESCE(lobbying_filings.is_registration, false)) AND (lobbying_filings.quarter = ANY (ARRAY['q1'::text, 'q2'::text, 'q3'::text, 'q4'::text])) AND (make_date(lobbying_filings.filing_year, (((substr(lobbying_filings.quarter, 2, 1))::integer * 3) - 2), 1) <= CURRENT_DATE))
                  GROUP BY lobbying_filings.filing_year, lobbying_filings.quarter
                  ORDER BY lobbying_filings.filing_year DESC, lobbying_filings.quarter DESC
                 LIMIT 8) x
        ), fin AS (
         SELECT max(ezq_campaign_finance.cycle) AS cycle
           FROM ezq_campaign_finance
        ), finance AS (
         SELECT jsonb_build_object('cycle', ( SELECT fin.cycle
                   FROM fin), 'byParty', ( SELECT jsonb_agg(jsonb_build_object('party', p.party, 'raised', p.raised, 'members', p.members) ORDER BY p.raised DESC) AS jsonb_agg
                   FROM ( SELECT COALESCE(ezq_campaign_finance.party, '?'::text) AS party,
                            sum(ezq_campaign_finance.receipts) AS raised,
                            (count(*))::integer AS members
                           FROM ezq_campaign_finance
                          WHERE ((ezq_campaign_finance.cycle = ( SELECT fin.cycle
                                   FROM fin)) AND (ezq_campaign_finance.receipts IS NOT NULL))
                          GROUP BY COALESCE(ezq_campaign_finance.party, '?'::text)) p), 'top', ( SELECT jsonb_agg(jsonb_build_object('name', t.member_name, 'party', t.party, 'raised', t.receipts) ORDER BY t.receipts DESC) AS jsonb_agg
                   FROM ( SELECT ezq_campaign_finance.member_name,
                            ezq_campaign_finance.party,
                            ezq_campaign_finance.receipts
                           FROM ezq_campaign_finance
                          WHERE ((ezq_campaign_finance.cycle = ( SELECT fin.cycle
                                   FROM fin)) AND (ezq_campaign_finance.receipts IS NOT NULL))
                          ORDER BY ezq_campaign_finance.receipts DESC
                         LIMIT 5) t)) AS j
        ), committees AS (
         SELECT jsonb_agg(jsonb_build_object('chamber', c.chamber, 'party', c.party, 'members', c.members, 'seats', c.seats) ORDER BY c.chamber, c.party) AS j
           FROM ( SELECT lower(ezq_committee_seats.chamber) AS chamber,
                    COALESCE(ezq_committee_seats.party, '?'::text) AS party,
                    (count(DISTINCT ezq_committee_seats.bioguide_id))::integer AS members,
                    (count(*))::integer AS seats
                   FROM ezq_committee_seats
                  GROUP BY (lower(ezq_committee_seats.chamber)), COALESCE(ezq_committee_seats.party, '?'::text)) c
        )
 SELECT 1 AS id,
    now() AS built_at,
    jsonb_build_object('trades', COALESCE(( SELECT trades.j
           FROM trades), '[]'::jsonb), 'contracts', COALESCE(( SELECT contracts.j
           FROM contracts), '[]'::jsonb), 'lobbying', COALESCE(( SELECT lobbying.j
           FROM lobbying), '[]'::jsonb), 'finance', COALESCE(( SELECT finance.j
           FROM finance), '{}'::jsonb), 'committees', COALESCE(( SELECT committees.j
           FROM committees), '[]'::jsonb)) AS payload;

create unique index if not exists mv_capitol_dataset_visuals_pk
  on public.mv_capitol_dataset_visuals (id);

revoke all on public.mv_capitol_dataset_visuals from public, anon, authenticated;
grant all on public.mv_capitol_dataset_visuals to service_role;

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
  begin
    refresh materialized view concurrently public.mv_capitol_dataset_visuals;
  exception when others then
    refresh materialized view public.mv_capitol_dataset_visuals;
  end;
end;
$function$;

revoke all on function public.refresh_capitol_hub_read_models() from public, anon, authenticated;
grant execute on function public.refresh_capitol_hub_read_models() to service_role;
