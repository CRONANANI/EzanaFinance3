-- Security X-ray "Largest holders" (institutional-security-xray-fix).
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor.
-- Additive and idempotent; safe to run more than once.
--
-- 1. titans_13f_positions.sh_shares: shares from SH (class-share) lines only.
--    `shares` sums SH and PRN (principal amount) lines; 260 CUSIPs in
--    sec_13f_holdings carry both, so share counts there mixed shares with
--    bond principal. 0 for a PRN-only line; null only on rows materialised
--    before this migration, where the page falls back to shares.
-- 2. titans_13f_materialise: unchanged except it now fills sh_shares (the
--    live definition matched 20261022120000 before this change). Existing
--    quarters fill on their next refresh; run
--      select public.titans_13f_materialise('2026-06-30');
--      select public.titans_13f_materialise('2026-03-31');
--    to fill the complete quarter and its prior now.
-- 3. A covering index for the per-security read (index-only scan: a cold
--    read of 1,152 holder rows took 1.0 s from scattered heap pages, 3 ms
--    warm) and a (period, filed_at) index for "filed through".

alter table public.titans_13f_positions add column if not exists sh_shares numeric;

create index if not exists titans_13f_positions_security_cover_idx
  on public.titans_13f_positions (period, cusip, put_call)
  include (cik, shares, sh_shares, value_usd);

create index if not exists titans_13f_filers_period_filed_idx
  on public.titans_13f_filers (period, filed_at desc);

create or replace function public.titans_13f_materialise(p_period date)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_period date := (date_trunc('quarter', p_period) + interval '3 months' - interval '1 day')::date;
  v_rows integer;
begin
  drop table if exists tm_set, tm_raw;

  create temp table tm_set on commit drop as
    select s.cik, s.filer_name, s.accession_no, f.filed_at
      from public.titans_13f_filing_set(v_period) s
      join public.sec_filings f on f.accession_no = s.accession_no;
  analyze tm_set;

  create temp table tm_raw on commit drop as
    select s.cik, upper(trim(h.cusip)) as cusip, upper(nullif(trim(h.ticker), '')) as ticker,
           h.name_of_issuer, coalesce(h.put_call, '') as put_call, h.shares, h.value_usd,
           upper(coalesce(h.share_type, 'SH')) as share_type
      from tm_set s
      join public.sec_13f_holdings h on h.accession_no = s.accession_no;
  analyze tm_raw;

  delete from public.titans_13f_positions where period = v_period;
  delete from public.titans_13f_filers where period = v_period;

  insert into public.titans_13f_filers
    (period, cik, filer_name, accession_no, filings, first_filed_at, filed_at, book, positions)
  select v_period, s.cik, max(s.filer_name),
         (array_agg(s.accession_no order by s.filed_at asc, s.accession_no asc))[1],
         count(*), min(s.filed_at), max(s.filed_at),
         coalesce(max(r.book), 0), coalesce(max(r.n), 0)
    from tm_set s
    left join (select cik, sum(value_usd) as book, count(*) as n from tm_raw group by cik) r
      on r.cik = s.cik
   group by s.cik;

  -- A CUSIP-less row stays apart per issuer rather than merging into one.
  insert into public.titans_13f_positions
    (period, cik, cusip, ticker, issuer, put_call, shares, value_usd, sh_shares)
  select v_period, r.cik, r.cusip, max(r.ticker), max(r.name_of_issuer), r.put_call,
         sum(r.shares), sum(r.value_usd),
         coalesce(sum(r.shares) filter (where r.share_type = 'SH'), 0)
    from tm_raw r
   group by r.cik, r.cusip, r.put_call, case when r.cusip is null then r.name_of_issuer end;
  get diagnostics v_rows = row_count;

  analyze public.titans_13f_filers;
  analyze public.titans_13f_positions;
  return v_rows;
end;
$function$;

revoke all on function public.titans_13f_materialise(date) from public, anon, authenticated;
grant execute on function public.titans_13f_materialise(date) to service_role;
