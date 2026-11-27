-- Sonar: institutional ownership of a set of securities (Nov 27 2026)
--
-- Why: "Which of Nancy Pelosi's stocks are most owned by investment firms?" needs, for every
-- security in a universe (a member's estimated disclosed holdings, a manager's book, a
-- watchlist), how many 13F reporting managers hold it in one quarter, what they reported, and
-- how that changed from the quarter before. The titans snapshot (titans_13f_positions) only
-- moves to a quarter once it is materialised for every filer, so it can lag the filings Ezana
-- has already parsed. This reads the parsed filings directly, one bounded batch per call.
--
-- Read-only and additive. Two functions, service role only (Sonar's server calls them):
--
--   sonar_13f_period_coverage(p_limit)
--       For the most recent report periods: filers with an effective filing (amendments
--       applied, sec_13f_effective_filings) and their position rows. Sonar picks the latest
--       quarter whose filing deadline has passed and whose filer coverage is close to the best
--       recent quarter, instead of trusting the calendar.
--
--   sonar_13f_ownership(p_cusips, p_period, p_prior, p_top)
--       Per CUSIP, for p_period:
--         managers        distinct reporting CIKs holding it (common shares only: share_type
--                         SH, no put or call rows; principal-amount rows are bonds and notes)
--         value_usd       reported value summed across those CIKs (13F value, in dollars)
--         shares          reported shares summed
--       Compared with p_prior on the comparable filer set (CIKs with an effective filing in
--       both periods), so a filer that simply did not file in one quarter is not counted as a
--       buyer or a seller:
--         comparable_now, comparable_prior   holders among comparable filers
--         new_managers, exited_managers      comparable filers that started or stopped
--         shares_now_cmp, shares_prior_cmp   shares among comparable filers
--       top            the p_top largest holders by reported value, with filer name, value,
--                       shares, weight in the filer's reported book and prior shares
--
-- Distinct CIKs, not organisations: two CIKs of one parent count twice. Duplicate rows and
-- NEW HOLDINGS amendments inside one filing set collapse into one CIK.

create or replace function public.sonar_13f_period_coverage(p_limit integer default 4)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(x order by x.period desc), '[]'::jsonb)
    from (
      select e.period,
             count(distinct e.cik) filter (where not e.is_addon) as filers,
             sum(e.positions) filter (where not e.is_addon) as positions
        from public.sec_13f_effective_filings e
       group by e.period
       order by e.period desc
       limit least(greatest(coalesce(p_limit, 4), 1), 12)
    ) x;
$function$;

create or replace function public.sonar_13f_ownership(
  p_cusips text[],
  p_period date,
  p_prior date default null,
  p_top integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_cusips text[];
  v_top integer := least(greatest(coalesce(p_top, 5), 0), 10);
  v_payload jsonb;
begin
  -- A bounded batch: at most 100 distinct, well-formed CUSIPs.
  select array_agg(distinct upper(c))
    into v_cusips
    from unnest(coalesce(p_cusips, '{}')) c
   where c ~* '^[0-9A-Z]{9}$';
  if v_cusips is null or p_period is null then
    return jsonb_build_object('period', p_period, 'prior_period', p_prior, 'rows', '[]'::jsonb);
  end if;
  v_cusips := v_cusips[1:100];

  with cur as (
    select e.accession_no, e.cik
      from public.sec_13f_effective_filings e
     where e.period = p_period
  ),
  pri as (
    select e.accession_no, e.cik
      from public.sec_13f_effective_filings e
     where p_prior is not null and e.period = p_prior
  ),
  books as (
    select e.cik, max(e.filer_name) as filer_name, max(e.book) filter (where not e.is_addon) as book
      from public.sec_13f_effective_filings e
     where e.period = p_period
     group by e.cik
  ),
  comparable as (
    select distinct c.cik from cur c where exists (select 1 from pri p where p.cik = c.cik)
  ),
  hn as (
    select h.cusip, c.cik, sum(h.value_usd) as value_usd, sum(h.shares) as shares
      from cur c
      join public.sec_13f_holdings h
        on h.accession_no = c.accession_no and h.cusip = any (v_cusips)
     where h.share_type = 'SH' and h.put_call is null
     group by h.cusip, c.cik
  ),
  hp as (
    select h.cusip, p.cik, sum(h.shares) as shares
      from pri p
      join public.sec_13f_holdings h
        on h.accession_no = p.accession_no and h.cusip = any (v_cusips)
     where h.share_type = 'SH' and h.put_call is null
       and p.cik in (select cik from comparable)
     group by h.cusip, p.cik
  ),
  hn_cmp as (
    select n.* from hn n where n.cik in (select cik from comparable)
  ),
  agg as (
    select k.cusip,
           (select count(*) from hn where hn.cusip = k.cusip) as managers,
           (select sum(value_usd) from hn where hn.cusip = k.cusip) as value_usd,
           (select sum(shares) from hn where hn.cusip = k.cusip) as shares,
           (select count(*) from hn_cmp where hn_cmp.cusip = k.cusip) as comparable_now,
           (select count(*) from hp where hp.cusip = k.cusip) as comparable_prior,
           (select count(*) from hn_cmp n
             where n.cusip = k.cusip
               and not exists (select 1 from hp where hp.cusip = n.cusip and hp.cik = n.cik)) as new_managers,
           (select count(*) from hp o
             where o.cusip = k.cusip
               and not exists (select 1 from hn_cmp n where n.cusip = o.cusip and n.cik = o.cik)) as exited_managers,
           (select sum(shares) from hn_cmp where hn_cmp.cusip = k.cusip) as shares_now_cmp,
           (select sum(shares) from hp where hp.cusip = k.cusip) as shares_prior_cmp,
           coalesce((
             select jsonb_agg(t order by t.value_usd desc nulls last, t.cik)
               from (
                 select n.cik, b.filer_name, n.value_usd, n.shares,
                        case when b.book > 0 then n.value_usd / b.book end as weight,
                        (select p.shares from hp p where p.cusip = n.cusip and p.cik = n.cik) as prior_shares,
                        (n.cik in (select cik from comparable)) as comparable
                   from hn n
                   join books b on b.cik = n.cik
                  where n.cusip = k.cusip
                  order by n.value_usd desc nulls last, n.cik
                  limit v_top
               ) t), '[]'::jsonb) as top
      from unnest(v_cusips) as k(cusip)
  )
  select jsonb_build_object(
    'period', p_period,
    'prior_period', p_prior,
    'filers', (select count(distinct cik) from cur),
    'filers_prior', (select count(distinct cik) from pri),
    'comparable_filers', (select count(*) from comparable),
    'rows', coalesce((select jsonb_agg(to_jsonb(agg) order by agg.cusip) from agg), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$function$;

revoke all on function public.sonar_13f_period_coverage(integer) from public, anon, authenticated;
grant execute on function public.sonar_13f_period_coverage(integer) to service_role;
revoke all on function public.sonar_13f_ownership(text[], date, date, integer) from public, anon, authenticated;
grant execute on function public.sonar_13f_ownership(text[], date, date, integer) to service_role;
