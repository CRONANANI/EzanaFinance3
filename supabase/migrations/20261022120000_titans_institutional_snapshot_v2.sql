-- Titans Shadow: Institutional snapshot v2, for the 13F page redesign.
-- REBASED Oct 22, 2026 onto the live database (this file was never applied in
-- its first form; the page failed on the missing titans_filing_curve).
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor.
-- Safe to run more than once.
--
-- Why the rebase:
--   * The live database already had an amendment-aware filing set
--     (titans_13f_filing_set: a 13F-HR/A of type NEW HOLDINGS is ADDED to the
--     base filing instead of replacing it), sec_filings.amendment_type and
--     two helpers, all applied by hand and never recorded here. They are
--     recorded below verbatim, and every v2 function now reads that set.
--   * Read through the API (service_role, 30 s statement timeout), joining a
--     full quarter's ~450k holdings takes ~12 s, so the X-ray and Twin Funds
--     panels would time out. The hourly refresh, which runs in pg_cron with
--     no API timeout, MATERIALISES each quarter once into two indexed tables
--     (titans_13f_filers, titans_13f_positions). Every panel function is then
--     an indexed lookup.
--
-- What it does:
--   0. Records the live-only objects (idempotent, identical definitions).
--   1. titans_13f_filers / titans_13f_positions: one quarter's filing of
--      record per filer, and its positions grouped per (filer, CUSIP, put/call).
--   2. titans_13f_materialise(p_period): rebuilds one quarter in those tables.
--   3. refresh_titans_institutional(p_period, p_limit): same signature, same
--      grants, every v1 payload key kept, plus the v2 aggregates the page
--      reads (prior, breadth, newly_entering, conviction_map, sectors, exits,
--      filer_shape, eff_n_median, options, sector_weights, pct_of_book,
--      top_ticker, top_weight, net_breadth, holders_prior).
--   4. refresh_titans_institutional_open(): the same for the quarter whose
--      filing window is still open (null when there is none).
--   5. titans_filing_curve, titans_security_xray, titans_fund_twins: same
--      signatures and output shapes the app already reads.
--   6. pg_cron: 'titans-institutional-open' at :25 every hour. The existing
--      job (refresh_titans_institutional_latest at :55) keeps the complete
--      quarter fresh.
--
-- Change classes match classifyChange() in src/lib/whale-score.js exactly:
--   prior 0 and now > 0 -> new; now 0 and prior > 0 -> exited;
--   now >= 2 x prior -> doubled (checked before added); > -> added;
--   < -> trimmed; equal -> flat.
-- Buyers are filers whose class is new, doubled or added; sellers trimmed or
-- exited; both only over filers that filed in BOTH quarters.

-- ── 0. Live-only objects, recorded ────────────────────────────────────────

alter table public.sec_filings
  add column if not exists amendment_type    text,
  add column if not exists table_entry_total integer,
  add column if not exists table_value_total numeric;

create or replace function public.titans_13f_filing_set(p_period date)
returns table(cik text, filer_name text, accession_no text)
language sql
stable
set search_path to 'public'
as $function$
  with f as (
    select s.accession_no, s.cik, s.filer_name, s.filed_at,
           (s.form_type ilike '%/A' and upper(coalesce(s.amendment_type, '')) = 'NEW HOLDINGS') as is_addon
      from public.sec_filings s
     where s.form_family = 'institutional'
       and s.period_of_report = p_period
       and exists (select 1 from public.sec_13f_holdings h where h.accession_no = s.accession_no)
  ),
  base as (
    select distinct on (f.cik) f.accession_no, f.cik, f.filer_name, f.filed_at
      from f
     where not f.is_addon
     order by f.cik, f.filed_at desc, f.accession_no desc
  )
  select b.cik, b.filer_name, b.accession_no from base b
  union all
  select a.cik, b.filer_name, a.accession_no
    from f a
    join base b on b.cik = a.cik
   where a.is_addon
     and a.filed_at >= b.filed_at
     and a.accession_no <> b.accession_no;
$function$;

create or replace function public.titans_latest_complete_quarter(
  p_today date default ((now() at time zone 'utc'))::date
)
returns date
language sql
stable
as $function$
  with r as (select (date_trunc('quarter', p_today) - interval '1 day')::date as running)
  select case when p_today > r.running + 45 then r.running
              else (date_trunc('quarter', r.running) - interval '1 day')::date end
    from r;
$function$;

-- The quarter whose filing window is open, or null once it has closed.
create or replace function public.titans_open_report_quarter(
  p_today date default ((now() at time zone 'utc'))::date
)
returns date
language sql
stable
as $function$
  select case when p_today > r.running + 45 then null else r.running end
    from (select (date_trunc('quarter', p_today) - interval '1 day')::date as running) r;
$function$;

-- ── 1. Materialised quarters ──────────────────────────────────────────────

create table if not exists public.titans_13f_filers (
  period          date        not null,
  cik             text        not null,
  filer_name      text,
  accession_no    text,        -- the base filing of record
  filings         integer     not null default 1,  -- base plus NEW HOLDINGS add-ons
  first_filed_at  timestamptz,
  filed_at        timestamptz, -- latest filing in the set
  book            numeric     not null default 0,  -- reported value, options included
  positions       integer     not null default 0,  -- raw information-table rows
  primary key (period, cik)
);

create table if not exists public.titans_13f_positions (
  period     date    not null,
  cik        text    not null,
  cusip      text,              -- upper, trimmed
  ticker     text,              -- upper
  issuer     text,
  put_call   text    not null default '',  -- '' for shares, else as filed
  shares     numeric,
  value_usd  numeric
);

create index if not exists titans_13f_positions_period_cusip_idx
  on public.titans_13f_positions (period, cusip);
create index if not exists titans_13f_positions_period_ticker_idx
  on public.titans_13f_positions (period, ticker);
create index if not exists titans_13f_positions_period_cik_idx
  on public.titans_13f_positions (period, cik);
create index if not exists titans_13f_filers_period_book_idx
  on public.titans_13f_filers (period, book desc);

-- Server reads only (service role and security definer functions).
alter table public.titans_13f_filers enable row level security;
alter table public.titans_13f_positions enable row level security;
revoke all on public.titans_13f_filers from anon, authenticated;
revoke all on public.titans_13f_positions from anon, authenticated;

-- ── 2. Rebuild one quarter ────────────────────────────────────────────────

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
           h.name_of_issuer, coalesce(h.put_call, '') as put_call, h.shares, h.value_usd
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
    (period, cik, cusip, ticker, issuer, put_call, shares, value_usd)
  select v_period, r.cik, r.cusip, max(r.ticker), max(r.name_of_issuer), r.put_call,
         sum(r.shares), sum(r.value_usd)
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

-- ── 3. The snapshot ───────────────────────────────────────────────────────

create or replace function public.refresh_titans_institutional(p_period date, p_limit integer default 25)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_period date := (date_trunc('quarter', p_period) + interval '3 months' - interval '1 day')::date;
  v_prior date := (date_trunc('quarter', p_period) - interval '1 day')::date;
  v_keep_from date;
  v_lim integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_payload jsonb;
begin
  -- This period is rebuilt every run; the prior one only when it is missing
  -- (its own refresh keeps it fresh while it is the complete quarter).
  perform public.titans_13f_materialise(v_period);
  if not exists (select 1 from public.titans_13f_filers where period = v_prior) then
    perform public.titans_13f_materialise(v_prior);
  end if;

  -- Safe to call twice in one transaction (e.g. from the SQL Editor).
  drop table if exists t_cur, t_prior, t_hold, t_prior_hold, t_prior_all, t_prior_full,
    t_cur_eq, t_book, t_prior_book, t_change, t_breadth;

  create temp table t_cur on commit drop as
    select cik, filer_name, accession_no, filed_at, book, positions
      from public.titans_13f_filers where period = v_period;
  create temp table t_prior on commit drop as
    select cik, filer_name, accession_no, filed_at, book, positions
      from public.titans_13f_filers where period = v_prior;

  create temp table t_hold on commit drop as
    select p.cik, c.filer_name, p.issuer as name_of_issuer, p.cusip, p.ticker,
           p.value_usd, p.shares, p.put_call
      from public.titans_13f_positions p
      join t_cur c on c.cik = p.cik
     where p.period = v_period;

  create temp table t_prior_all on commit drop as
    select p.cik, o.filer_name, p.cusip, p.ticker, p.issuer as name_of_issuer,
           p.value_usd, p.shares, p.put_call
      from public.titans_13f_positions p
      join t_prior o on o.cik = p.cik
     where p.period = v_prior;

  create temp table t_prior_hold on commit drop as
    select distinct cik, cusip from t_prior_all where cusip is not null;

  -- Equity positions per (cik, cusip), both quarters.
  create temp table t_prior_full on commit drop as
    select cik, cusip, max(ticker) as ticker, max(name_of_issuer) as issuer,
           sum(shares) as shares, sum(value_usd) as value_usd
      from t_prior_all
     where cusip is not null and put_call = ''
     group by cik, cusip;
  create temp table t_cur_eq on commit drop as
    select cik, cusip, max(ticker) as ticker, max(name_of_issuer) as issuer,
           sum(shares) as shares, sum(value_usd) as value_usd
      from t_hold
     where cusip is not null and put_call = ''
     group by cik, cusip;

  create temp table t_book on commit drop as select cik, book from t_cur;
  create temp table t_prior_book on commit drop as select cik, book from t_prior;

  analyze t_cur; analyze t_prior; analyze t_hold; analyze t_prior_all;
  analyze t_prior_hold; analyze t_prior_full; analyze t_cur_eq;

  -- One row per (cik, cusip) across both periods, filers in BOTH quarters.
  create temp table t_change on commit drop as
    select coalesce(n.cik, o.cik) as cik,
           coalesce(n.cusip, o.cusip) as cusip,
           coalesce(n.ticker, o.ticker) as ticker,
           coalesce(n.issuer, o.issuer) as issuer,
           coalesce(n.shares, 0) as shares_now,
           coalesce(o.shares, 0) as shares_prior,
           coalesce(n.value_usd, 0) as value_now,
           coalesce(o.value_usd, 0) as value_prior,
           case
             when coalesce(o.shares, 0) = 0 and coalesce(n.shares, 0) > 0 then 'new'
             when coalesce(n.shares, 0) = 0 and coalesce(o.shares, 0) > 0 then 'exited'
             when coalesce(o.shares, 0) > 0 and coalesce(n.shares, 0) >= coalesce(o.shares, 0) * 2 then 'doubled'
             when coalesce(n.shares, 0) > coalesce(o.shares, 0) then 'added'
             when coalesce(n.shares, 0) < coalesce(o.shares, 0) then 'trimmed'
             else 'flat'
           end as class,
           -- flow-adjusted change: share change at the current implied price
           -- (exits use the prior row's implied price).
           (coalesce(n.shares, 0) - coalesce(o.shares, 0)) *
             case
               when coalesce(n.shares, 0) > 0 then n.value_usd / nullif(n.shares, 0)
               when coalesce(o.shares, 0) > 0 then o.value_usd / nullif(o.shares, 0)
               else 0
             end as flow_usd
      from t_cur_eq n
      full join t_prior_full o on o.cik = n.cik and o.cusip = n.cusip
     where exists (select 1 from t_cur c where c.cik = coalesce(n.cik, o.cik))
       and exists (select 1 from t_prior p where p.cik = coalesce(n.cik, o.cik));
  analyze t_change;

  create temp table t_breadth on commit drop as
    with hn as (select cusip, count(*) as n from t_cur_eq group by cusip),
         hp as (select cusip, count(*) as n from t_prior_full group by cusip)
    select ch.cusip,
           max(ch.ticker) as ticker,
           max(ch.issuer) as issuer,
           count(*) filter (where ch.class in ('new', 'doubled', 'added')) as buyers,
           count(*) filter (where ch.class in ('trimmed', 'exited')) as sellers,
           count(*) filter (where ch.class = 'new') as new,
           count(*) filter (where ch.class = 'exited') as exited,
           coalesce(max(hn.n), 0) as holders_now,
           coalesce(max(hp.n), 0) as holders_prior
      from t_change ch
      left join hn on hn.cusip = ch.cusip
      left join hp on hp.cusip = ch.cusip
     group by ch.cusip;
  analyze t_breadth;

  select jsonb_build_object(
    'period', v_period,
    'prior_period', v_prior,
    'filers', (select count(*) from t_cur),
    'filers_with_prior', (select count(*) from t_cur c where exists (select 1 from t_prior p where p.cik = c.cik)),
    'holdings', (select coalesce(sum(positions), 0) from t_cur),
    'total_value_usd', (select coalesce(sum(book), 0) from t_cur),
    'top_filers', coalesce((
      select jsonb_agg(x order by x.total_value_usd desc)
        from (select c.cik, c.filer_name, c.accession_no, c.filed_at,
                     c.book as total_value_usd, c.positions,
                     (select t.ticker from t_cur_eq t
                       where t.cik = c.cik and t.ticker is not null
                       order by t.value_usd desc nulls last limit 1) as top_ticker,
                     (select t.value_usd / nullif(c.book, 0) from t_cur_eq t
                       where t.cik = c.cik and t.ticker is not null
                       order by t.value_usd desc nulls last limit 1) as top_weight
                from t_cur c
               order by c.book desc nulls last
               limit v_lim) x), '[]'::jsonb),
    'widely_held', coalesce((
      select jsonb_agg(x order by x.holders desc, x.value_usd desc)
        from (select e.cusip, max(e.ticker) as ticker, max(e.issuer) as issuer,
                     count(*) as holders, sum(e.value_usd) as value_usd,
                     sum(e.shares) as shares,
                     coalesce(max(b.buyers - b.sellers), 0) as net_breadth,
                     coalesce(max(b.holders_prior), 0) as holders_prior
                from t_cur_eq e
                left join t_breadth b on b.cusip = e.cusip
               group by e.cusip
               order by count(*) desc, sum(e.value_usd) desc nulls last
               limit v_lim) x), '[]'::jsonb),
    'new_positions', coalesce((
      select jsonb_agg(x order by x.value_usd desc)
        from (select e.cik, c.filer_name, e.cusip, e.ticker, e.issuer,
                     e.value_usd, e.shares,
                     e.value_usd / nullif(c.book, 0) as pct_of_book
                from t_cur_eq e
                join t_cur c on c.cik = e.cik
                left join t_prior_hold ph on ph.cik = e.cik and ph.cusip = e.cusip
               where ph.cik is null
                 and exists (select 1 from t_prior p where p.cik = e.cik)
               order by e.value_usd desc nulls last
               limit v_lim) x), '[]'::jsonb),
    'prior', jsonb_build_object(
      'filers', (select count(*) from t_prior),
      'holdings', (select coalesce(sum(positions), 0) from t_prior),
      'total_value_usd', (select coalesce(sum(book), 0) from t_prior)),
    'breadth', coalesce((
      select jsonb_agg(x order by (x.buyers - x.sellers) desc)
        from (
          (select * from t_breadth order by (buyers - sellers) desc, holders_now desc limit 50)
          union
          (select * from t_breadth order by (buyers - sellers) asc, holders_now desc limit 50)
        ) x), '[]'::jsonb),
    'newly_entering', coalesce((
      select jsonb_agg(x order by x.new desc)
        from (select cusip, ticker, issuer, new, holders_now
                from t_breadth order by new desc, holders_now desc limit 25) x), '[]'::jsonb),
    'conviction_map', coalesce((
      select jsonb_agg(x order by x.value_usd desc)
        from (select e.cusip, max(e.ticker) as ticker, max(e.issuer) as issuer,
                     count(*) as holders,
                     percentile_cont(0.5) within group
                       (order by e.value_usd / nullif(b.book, 0)) as median_weight,
                     sum(e.value_usd) as value_usd,
                     max(ts.sector) as sector
                from t_cur_eq e
                join t_book b on b.cik = e.cik
                left join public.ticker_sectors ts on ts.ticker = e.ticker
               group by e.cusip
              having count(*) >= 10
               order by sum(e.value_usd) desc nulls last
               limit 600) x), '[]'::jsonb),
    'sectors', coalesce((
      select jsonb_agg(x)
        from (
          with now_tot as (select sum(value_usd) as v from t_cur_eq),
          prior_tot as (select sum(value_usd) as v from t_prior_full),
          now_sec as (
            select coalesce(ts.sector, 'Unclassified') as sector, sum(e.value_usd) as v
              from t_cur_eq e left join public.ticker_sectors ts on ts.ticker = e.ticker
             group by 1),
          prior_sec as (
            select coalesce(ts.sector, 'Unclassified') as sector, sum(o.value_usd) as v
              from t_prior_full o left join public.ticker_sectors ts on ts.ticker = o.ticker
             group by 1),
          flow_sec as (
            select coalesce(ts.sector, 'Unclassified') as sector, sum(ch.flow_usd) as v
              from t_change ch left join public.ticker_sectors ts on ts.ticker = ch.ticker
             group by 1)
          select coalesce(n.sector, p.sector, f.sector) as sector,
                 coalesce(n.v, 0) / nullif((select v from now_tot), 0) as share_now,
                 coalesce(p.v, 0) / nullif((select v from prior_tot), 0) as share_prior,
                 coalesce(f.v, 0) as flow_usd
            from now_sec n
            full join prior_sec p on p.sector = n.sector
            full join flow_sec f on f.sector = coalesce(n.sector, p.sector)
        ) x), '[]'::jsonb),
    'exits', coalesce((
      select jsonb_agg(x order by x.value_prior desc)
        from (select ch.cik, p.filer_name, ch.cusip, ch.ticker, ch.issuer,
                     ch.value_prior, ch.shares_prior,
                     ch.value_prior / nullif(p.book, 0) as pct_of_prior_book
                from t_change ch
                join t_prior p on p.cik = ch.cik
               where ch.class = 'exited'
               order by ch.value_prior desc nulls last
               limit 25) x), '[]'::jsonb),
    'filer_shape', coalesce((
      select jsonb_agg(jsonb_build_array(x.cik, x.book, x.eff_n))
        from (select b.cik, b.book,
                     1.0 / nullif(sum(power(e.value_usd / nullif(b.book, 0), 2)), 0) as eff_n
                from t_book b
                join t_cur_eq e on e.cik = b.cik
               group by b.cik, b.book) x), '[]'::jsonb),
    'eff_n_median', (
      select percentile_cont(0.5) within group (order by x.eff_n)
        from (select 1.0 / nullif(sum(power(e.value_usd / nullif(b.book, 0), 2)), 0) as eff_n
                from t_book b join t_cur_eq e on e.cik = b.cik
               group by b.cik, b.book) x),
    'options', coalesce((
      select jsonb_agg(x order by (x.call_usd + x.put_usd) desc)
        from (select h.cusip, max(h.ticker) as ticker,
                     max(h.name_of_issuer) as issuer,
                     coalesce(sum(h.value_usd) filter (where upper(h.put_call) like 'C%'), 0) as call_usd,
                     coalesce(sum(h.value_usd) filter (where upper(h.put_call) like 'P%'), 0) as put_usd,
                     count(distinct h.cik) filter (where upper(h.put_call) like 'C%') as call_filers,
                     count(distinct h.cik) filter (where upper(h.put_call) like 'P%') as put_filers
                from t_hold h
               where h.put_call <> '' and h.cusip is not null
               group by h.cusip
               order by sum(h.value_usd) desc nulls last
               limit 25) x), '[]'::jsonb),
    'sector_weights', coalesce((
      select jsonb_agg(x)
        from (select coalesce(ts.sector, 'Unclassified') as sector,
                     sum(e.value_usd) / nullif((select sum(value_usd) from t_cur_eq), 0) as weight
                from t_cur_eq e left join public.ticker_sectors ts on ts.ticker = e.ticker
               group by 1) x), '[]'::jsonb)
  ) into v_payload;

  insert into public.titans_snapshots (key, payload, computed_at)
  values ('institutional:' || v_period::text, v_payload, now())
  on conflict (key) do update set payload = excluded.payload, computed_at = excluded.computed_at;

  -- Keep the materialised quarters this period and its prior need, plus one
  -- more (the open quarter's prior is the complete quarter).
  v_keep_from := (date_trunc('quarter', v_prior) - interval '1 day')::date;
  delete from public.titans_13f_positions where period < v_keep_from;
  delete from public.titans_13f_filers where period < v_keep_from;

  return jsonb_build_object(
    'period', v_period,
    'filers', v_payload->'filers',
    'filers_with_prior', v_payload->'filers_with_prior',
    'holdings', v_payload->'holdings'
  );
end;
$function$;

revoke all on function public.refresh_titans_institutional(date, integer) from public, anon, authenticated;
grant execute on function public.refresh_titans_institutional(date, integer) to service_role;

-- ── 4. The open quarter ───────────────────────────────────────────────────

create or replace function public.refresh_titans_institutional_open()
returns jsonb
language sql
security definer
set search_path to 'public'
as $function$
  select case
           when public.titans_open_report_quarter() is null then null
           else public.refresh_titans_institutional(public.titans_open_report_quarter(), 25)
         end;
$function$;

revoke all on function public.refresh_titans_institutional_open() from public, anon, authenticated;
grant execute on function public.refresh_titans_institutional_open() to service_role;

-- Recorded from the live database (called by the existing pg_cron job at :55).
create or replace function public.refresh_titans_institutional_latest()
returns jsonb
language sql
security definer
set search_path to 'public'
as $function$
  select public.refresh_titans_institutional(public.titans_latest_complete_quarter(), 25);
$function$;

-- ── 5a. Filing Season Clock ───────────────────────────────────────────────
-- Cumulative distinct filers by the day each filer FIRST filed (a base filing
-- and its later amendment count once), for the period and its prior, plus
-- the largest filers already in (from the materialised quarter).
create or replace function public.titans_filing_curve(p_period date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_period date := (date_trunc('quarter', p_period) + interval '3 months' - interval '1 day')::date;
  v_prior date := (date_trunc('quarter', p_period) - interval '1 day')::date;
  v_payload jsonb;
begin
  drop table if exists t_first, t_days;

  create temp table t_first on commit drop as
    select f.period_of_report as period, f.cik,
           greatest(0, least(60, (min(f.filed_at)::date - f.period_of_report))) as day
      from public.sec_filings f
     where f.form_family = 'institutional'
       and f.period_of_report in (v_period, v_prior)
       and exists (select 1 from public.sec_13f_holdings h where h.accession_no = f.accession_no)
     group by f.period_of_report, f.cik;

  create temp table t_days on commit drop as
    select period, day, count(*) as filers from t_first group by period, day;

  select jsonb_build_object(
    'period', v_period,
    'prior_period', v_prior,
    'open', coalesce((
      select jsonb_agg(jsonb_build_array(d.day, d.cum) order by d.day)
        from (select day, sum(filers) over (order by day) as cum
                from t_days where period = v_period) d), '[]'::jsonb),
    'prior', coalesce((
      select jsonb_agg(jsonb_build_array(d.day, d.cum) order by d.day)
        from (select day, sum(filers) over (order by day) as cum
                from t_days where period = v_prior) d), '[]'::jsonb),
    'prior_final', coalesce((select sum(filers) from t_days where period = v_prior), 0),
    'early_movers', coalesce((
      select jsonb_agg(x order by x.value_usd desc)
        from (select m.cik, m.filer_name, m.first_filed_at::date as filed_at,
                     m.book as value_usd, m.positions
                from public.titans_13f_filers m
               where m.period = v_period
               order by m.book desc nulls last
               limit 4) x), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$function$;

revoke all on function public.titans_filing_curve(date) from public, anon, authenticated;
grant execute on function public.titans_filing_curve(date) to service_role;

-- ── 5b. Security X-ray ────────────────────────────────────────────────────
-- One security (ticker or 9-char CUSIP) across the period and its prior,
-- read from the materialised quarters by index.
create or replace function public.titans_security_xray(
  p_key text,
  p_period date,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_period date := (date_trunc('quarter', p_period) + interval '3 months' - interval '1 day')::date;
  v_prior date := (date_trunc('quarter', p_period) - interval '1 day')::date;
  v_key text := upper(trim(p_key));
  v_cusip text;
  v_lim integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_payload jsonb;
begin
  drop table if exists tx_now, tx_before, tx_ch;

  -- Resolve the key to one CUSIP (prefer the largest current one for a ticker).
  select x.cusip into v_cusip
    from (
      select p.cusip, sum(p.value_usd) as v
        from public.titans_13f_positions p
       where p.period = v_period
         and p.cusip is not null
         and (p.cusip = v_key or p.ticker = v_key)
       group by p.cusip order by sum(p.value_usd) desc nulls last limit 1
    ) x;
  if v_cusip is null then
    return null;
  end if;

  create temp table tx_now on commit drop as
    select p.cik, max(m.filer_name) as filer_name, sum(p.shares) as shares,
           sum(p.value_usd) as value_usd, max(m.book) as book
      from public.titans_13f_positions p
      join public.titans_13f_filers m on m.period = p.period and m.cik = p.cik
     where p.period = v_period and p.cusip = v_cusip and p.put_call = ''
     group by p.cik;
  create temp table tx_before on commit drop as
    select p.cik, max(m.filer_name) as filer_name, sum(p.shares) as shares,
           sum(p.value_usd) as value_usd
      from public.titans_13f_positions p
      join public.titans_13f_filers m on m.period = p.period and m.cik = p.cik
     where p.period = v_prior and p.cusip = v_cusip and p.put_call = ''
     group by p.cik;

  create temp table tx_ch on commit drop as
    select coalesce(n.cik, o.cik) as cik,
           coalesce(n.filer_name, o.filer_name) as filer_name,
           coalesce(n.shares, 0) as shares_now, coalesce(o.shares, 0) as shares_prior,
           coalesce(n.value_usd, 0) as value_now, coalesce(o.value_usd, 0) as value_prior,
           case
             when coalesce(o.shares, 0) = 0 and coalesce(n.shares, 0) > 0 then 'new'
             when coalesce(n.shares, 0) = 0 and coalesce(o.shares, 0) > 0 then 'exited'
             when coalesce(o.shares, 0) > 0 and coalesce(n.shares, 0) >= coalesce(o.shares, 0) * 2 then 'doubled'
             when coalesce(n.shares, 0) > coalesce(o.shares, 0) then 'added'
             when coalesce(n.shares, 0) < coalesce(o.shares, 0) then 'trimmed'
             else 'flat'
           end as class
      from tx_now n
      full join tx_before o on o.cik = n.cik
     where exists (select 1 from public.titans_13f_filers c
                    where c.period = v_period and c.cik = coalesce(n.cik, o.cik))
       and exists (select 1 from public.titans_13f_filers p
                    where p.period = v_prior and p.cik = coalesce(n.cik, o.cik));

  select jsonb_build_object(
    'cusip', v_cusip,
    'ticker', (select max(p.ticker) from public.titans_13f_positions p
                where p.period = v_period and p.cusip = v_cusip),
    'issuer', (select max(p.issuer) from public.titans_13f_positions p
                where p.period = v_period and p.cusip = v_cusip),
    'period', v_period,
    'prior_period', v_prior,
    'holders_now', (select count(*) from tx_now),
    'holders_prior', (select count(*) from tx_before),
    'buyers', (select count(*) from tx_ch where class in ('new', 'doubled', 'added')),
    'sellers', (select count(*) from tx_ch where class in ('trimmed', 'exited')),
    'new', (select count(*) from tx_ch where class = 'new'),
    'exited', (select count(*) from tx_ch where class = 'exited'),
    'value_usd', (select coalesce(sum(value_usd), 0) from tx_now),
    'shares', (select coalesce(sum(shares), 0) from tx_now),
    'shares_prior', (select coalesce(sum(shares), 0) from tx_before),
    'ladder_total', (select count(*) from tx_now),
    'ladder', coalesce((
      select jsonb_agg(x order by x.value_usd desc)
        from (select n.cik, n.filer_name, n.value_usd,
                     n.value_usd / nullif(n.book, 0) as weight,
                     coalesce(ch.class, 'new') as class
                from tx_now n
                left join tx_ch ch on ch.cik = n.cik
               order by n.value_usd desc nulls last
               limit v_lim offset v_off) x), '[]'::jsonb),
    'joined', coalesce((
      select jsonb_agg(x order by x.value_usd desc)
        from (select cik, filer_name, value_now as value_usd from tx_ch
               where class = 'new' order by value_now desc limit 3) x), '[]'::jsonb),
    'left', coalesce((
      select jsonb_agg(x order by x.value_prior desc)
        from (select cik, filer_name, value_prior from tx_ch
               where class = 'exited' order by value_prior desc limit 3) x), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$function$;

revoke all on function public.titans_security_xray(text, date, integer, integer) from public, anon, authenticated;
grant execute on function public.titans_security_xray(text, date, integer, integer) to service_role;

-- ── 5c. Twin funds ────────────────────────────────────────────────────────
-- The three filers among the top 500 by reported value whose equity weight
-- vectors overlap one filer's most (sum of min(wA, wB) over shared CUSIPs),
-- with the largest shared and distinct names for the compare block. Only
-- the target's CUSIPs are scanned for the overlap, by index.
create or replace function public.titans_fund_twins(p_cik text, p_period date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cik text := lpad(regexp_replace(coalesce(p_cik, ''), '\D', '', 'g'), 10, '0');
  v_period date := (date_trunc('quarter', p_period) + interval '3 months' - interval '1 day')::date;
  v_book numeric;
  v_payload jsonb;
begin
  select book into v_book from public.titans_13f_filers where period = v_period and cik = v_cik;
  if v_book is null or v_book = 0 then
    return '[]'::jsonb;
  end if;

  drop table if exists tw_top, tw_a, tw_b, tw_pick, tw_three;

  create temp table tw_top on commit drop as
    select cik, filer_name, book
      from public.titans_13f_filers
     where period = v_period and cik <> v_cik and book > 0
     order by book desc nulls last
     limit 500;

  -- The target's equity weights.
  create temp table tw_a on commit drop as
    select cusip, max(ticker) as ticker, sum(value_usd) / v_book as w
      from public.titans_13f_positions
     where period = v_period and cik = v_cik and cusip is not null and put_call = ''
     group by cusip;
  analyze tw_a;

  -- Candidate weights on the target's CUSIPs only.
  create temp table tw_b on commit drop as
    select p.cik, p.cusip, max(p.ticker) as ticker, sum(p.value_usd) / max(t.book) as w
      from public.titans_13f_positions p
      join tw_top t on t.cik = p.cik
     where p.period = v_period and p.put_call = ''
       and p.cusip in (select cusip from tw_a)
     group by p.cik, p.cusip;
  analyze tw_b;

  create temp table tw_pick on commit drop as
    select b.cik, sum(least(a.w, b.w)) as overlap, count(*) as shared
      from tw_b b join tw_a a on a.cusip = b.cusip
     group by b.cik
     order by sum(least(a.w, b.w)) desc
     limit 3;

  -- The three twins' full equity weights, for their distinct names.
  create temp table tw_three on commit drop as
    select p.cik, p.cusip, max(p.ticker) as ticker, sum(p.value_usd) / max(t.book) as w
      from public.titans_13f_positions p
      join tw_top t on t.cik = p.cik
     where p.period = v_period and p.put_call = '' and p.cusip is not null
       and p.cik in (select cik from tw_pick)
     group by p.cik, p.cusip;

  select coalesce(jsonb_agg(tw order by tw.overlap desc), '[]'::jsonb) into v_payload
    from (
      select k.cik, t.filer_name, t.book, k.overlap, k.shared,
             (select jsonb_agg(s.ticker order by s.mw desc)
                from (select coalesce(a.ticker, b.ticker) as ticker, least(a.w, b.w) as mw
                        from tw_a a join tw_b b on b.cusip = a.cusip and b.cik = k.cik
                       where coalesce(a.ticker, b.ticker) is not null
                       order by least(a.w, b.w) desc limit 6) s) as shared_tickers,
             (select jsonb_agg(s.ticker order by s.w desc)
                from (select a.ticker, a.w from tw_a a
                       where a.ticker is not null
                         and not exists (select 1 from tw_three b where b.cik = k.cik and b.cusip = a.cusip)
                       order by a.w desc limit 6) s) as only_a,
             (select jsonb_agg(s.ticker order by s.w desc)
                from (select b.ticker, b.w from tw_three b
                       where b.cik = k.cik and b.ticker is not null
                         and not exists (select 1 from tw_a a where a.cusip = b.cusip)
                       order by b.w desc limit 6) s) as only_b
        from tw_pick k
        join tw_top t on t.cik = k.cik
    ) tw;

  return v_payload;
end;
$function$;

revoke all on function public.titans_fund_twins(text, date) from public, anon, authenticated;
grant execute on function public.titans_fund_twins(text, date) to service_role;

-- ── 6. Schedule the open quarter (the complete quarter already runs at :55) ─
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'titans-institutional-open';
    perform cron.schedule(
      'titans-institutional-open',
      '25 * * * *',
      'select public.refresh_titans_institutional_open()'
    );
  end if;
end $$;
