-- 20261008000600_lobbying_award_ratio.sql
-- Lobbying and contracts, tab D: lobbying joined to contract awards only
-- through 29 hand-verified lobbying_client_tickers rows, so 6 companies
-- matched. An exact match on normalised company names (lobby_norm_name strips
-- punctuation and INC, CORP, LLC, ...) adds the LDA clients whose name equals
-- a contractor with awards. Those rows are stored verified = false,
-- match_method = 'name_exact', so every reader that filters on verified is
-- unchanged. hub_lobbying_award_ratio returns lobbying spend and award value
-- per ticker for the ratio ranking and the correlation.
--
-- Applied in the SQL Editor on 2026-10-08; this file mirrors the live
-- definitions.

alter table public.lobbying_client_tickers
  add column if not exists match_method text not null default 'manual';

CREATE OR REPLACE FUNCTION public.lobby_norm_name(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  select btrim(regexp_replace(
           regexp_replace(
             regexp_replace(upper(coalesce(p, '')), '[^A-Z0-9 ]', ' ', 'g'),
             '\m(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LLC|LTD|PLC|LP|HOLDINGS|GROUP|THE)\M',
             '', 'g'),
           '\s+', ' ', 'g'));
$function$;

CREATE OR REPLACE FUNCTION public.refresh_lobbying_name_matches()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_added integer;
begin
  insert into public.lobbying_client_tickers (client_name, ticker, company_label, verified, match_method)
  select distinct on (lc.client_name)
         lc.client_name, ct.ticker, ct.company, false, 'name_exact'
  from (
    select distinct client_name
    from public.lobbying_filings
    where filing_year >= extract(year from current_date)::int - 2
  ) lc
  join (
    select distinct ct.ticker, ct.company
    from public.contractor_tickers ct
    where ct.ticker in (select distinct ticker from public.mv_contract_award_tickers)
  ) ct on lobby_norm_name(ct.company) = lobby_norm_name(lc.client_name)
  where length(lobby_norm_name(lc.client_name)) >= 4
  order by lc.client_name, ct.ticker
  on conflict (client_name) do nothing;
  get diagnostics v_added = row_count;
  return v_added;
end;
$function$;

select public.refresh_lobbying_name_matches();

CREATE OR REPLACE FUNCTION public.hub_lobbying_award_ratio(p_years integer DEFAULT 1, p_include_matched boolean DEFAULT true, p_limit integer DEFAULT 200)
 RETURNS TABLE(ticker text, client_name text, company_label text, match_method text, lobbying numeric, awards integer, award_value numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with y as (
    select extract(year from current_date)::int as cur,
           greatest(least(coalesce(p_years, 1), 3), 1) as n
  ),
  c as (
    select upper(t.ticker) as ticker, t.client_name, t.company_label, t.verified
    from lobbying_client_tickers t
    where t.verified or coalesce(p_include_matched, true)
  ),
  s as (
    select c.ticker, c.client_name, max(c.company_label) as company_label,
           bool_or(c.verified) as verified, coalesce(sum(f.amount), 0) as spend
    from c
    cross join y
    join lobbying_filings f
      on f.client_name = c.client_name
     and f.filing_year between y.cur - y.n + 1 and y.cur
    group by c.ticker, c.client_name
  ),
  l as (
    select s.ticker,
           (array_agg(s.client_name order by s.spend desc))[1] as client_name,
           max(s.company_label) as company_label,
           case when bool_or(s.verified) then 'verified' else 'name_exact' end as match_method,
           sum(s.spend) as lobbying
    from s
    group by s.ticker
    having sum(s.spend) > 0
  ),
  a as (
    select m.ticker, count(*)::int as awards, sum(m.award_amount) as award_value
    from mv_contract_award_tickers m
    cross join y
    where m.ticker in (select l.ticker from l)
      and m.action_date between current_date - (365 * y.n) and current_date
    group by m.ticker
  )
  select l.ticker, l.client_name, l.company_label, l.match_method, l.lobbying,
         a.awards, a.award_value
  from l
  join a using (ticker)
  where a.award_value > 0
  order by a.award_value / nullif(l.lobbying, 0) desc nulls last, l.ticker
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
$function$;

revoke all on function public.refresh_lobbying_name_matches() from public, anon, authenticated;
revoke all on function public.hub_lobbying_award_ratio(integer, boolean, integer) from public, anon, authenticated;
grant execute on function public.refresh_lobbying_name_matches() to service_role;
grant execute on function public.hub_lobbying_award_ratio(integer, boolean, integer) to service_role;
