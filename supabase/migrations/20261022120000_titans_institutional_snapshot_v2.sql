-- Titans Shadow: Institutional snapshot v2, for the 13F page redesign.
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor,
-- after 20261006000400_titans_institutional_snapshot.sql.
--
-- What it does:
--   1. refresh_titans_institutional(): same signature, same grants, every
--      existing payload key kept. Adds the redesign aggregates (prior-quarter
--      headline counts, per-CUSIP change classes and breadth, per-CUSIP median
--      holder weight, sector rollups for both quarters, largest exits,
--      pct_of_book on new_positions, per-filer effective N, option notional by
--      underlying, all-filer sector weights). The hourly cron also calls it
--      for the OPEN period, so the partial quarter has a snapshot of its own.
--   2. titans_filing_curve(p_period): cumulative filings per day for the open
--      period and its prior, plus the largest early movers.
--   3. titans_security_xray(p_key, ...): one security across both quarters
--      (holders, breadth, ladder, joined and left) for the Security X-ray.
--   4. titans_fund_twins(p_cik, p_period): the three filers with the highest
--      weight overlap with one filer, with shared and distinct names.
--
-- Change classes match classifyChange() in src/lib/whale-score.js exactly:
--   prior 0 and now > 0 -> new; now 0 and prior > 0 -> exited;
--   now >= 2 x prior -> doubled (checked before added); > -> added;
--   < -> trimmed; equal -> flat.
-- Buyers are filers whose class is new, doubled or added; sellers trimmed or
-- exited; both only over filers that filed in BOTH quarters.
--
-- No new table, no new ingest, no new source. RLS on titans_snapshots is
-- already enabled (v1); the functions below are service_role only.

create or replace function public.refresh_titans_institutional(p_period date, p_limit integer default 25)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_prior date := (date_trunc('quarter', p_period) - interval '1 day')::date;
  v_lim integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_payload jsonb;
begin
  -- Latest filing (amendments included) per filer for the quarter, parsed only.
  create temp table t_cur on commit drop as
    select distinct on (f.cik) f.accession_no, f.cik, f.filer_name, f.filed_at
      from public.sec_filings f
     where f.form_family = 'institutional'
       and f.period_of_report = p_period
       and exists (select 1 from public.sec_13f_holdings h where h.accession_no = f.accession_no)
     order by f.cik, f.filed_at desc;

  create temp table t_prior on commit drop as
    select distinct on (f.cik) f.accession_no, f.cik, f.filer_name
      from public.sec_filings f
     where f.form_family = 'institutional'
       and f.period_of_report = v_prior
       and exists (select 1 from public.sec_13f_holdings h where h.accession_no = f.accession_no)
     order by f.cik, f.filed_at desc;

  create temp table t_hold on commit drop as
    select c.cik, c.filer_name, c.accession_no, h.name_of_issuer,
           upper(trim(h.cusip)) as cusip, h.ticker, h.value_usd, h.shares, h.put_call
      from t_cur c
      join public.sec_13f_holdings h on h.accession_no = c.accession_no;

  create temp table t_prior_hold on commit drop as
    select distinct p.cik, upper(trim(ph.cusip)) as cusip
      from t_prior p
      join public.sec_13f_holdings ph on ph.accession_no = p.accession_no
     where ph.cusip is not null;

  -- Prior filing-of-record rows with shares and value per (cik, cusip),
  -- equity only, plus the prior quarter's full row set for its headline counts.
  create temp table t_prior_all on commit drop as
    select p.cik, p.filer_name, upper(trim(ph.cusip)) as cusip, ph.ticker,
           ph.name_of_issuer, ph.value_usd, ph.shares, ph.put_call
      from t_prior p
      join public.sec_13f_holdings ph on ph.accession_no = p.accession_no;

  create temp table t_prior_full on commit drop as
    select cik, cusip, max(ticker) as ticker, max(name_of_issuer) as issuer,
           sum(shares) as shares, sum(value_usd) as value_usd
      from t_prior_all
     where cusip is not null and coalesce(put_call, '') = ''
     group by cik, cusip;

  -- Current equity positions per (cik, cusip).
  create temp table t_cur_eq on commit drop as
    select cik, cusip, max(ticker) as ticker, max(name_of_issuer) as issuer,
           sum(shares) as shares, sum(value_usd) as value_usd
      from t_hold
     where cusip is not null and coalesce(put_call, '') = ''
     group by cik, cusip;

  -- Books: a filer's total reported value (options included, as reported).
  create temp table t_book on commit drop as
    select cik, sum(value_usd) as book from t_hold group by cik;
  create temp table t_prior_book on commit drop as
    select cik, sum(value_usd) as book from t_prior_all group by cik;

  -- One row per (cik, cusip) across both periods, filers in BOTH quarters.
  -- class matches classifyChange() in src/lib/whale-score.js.
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

  analyze t_cur; analyze t_hold; analyze t_prior_hold;
  analyze t_prior_all; analyze t_prior_full; analyze t_cur_eq;
  analyze t_book; analyze t_prior_book; analyze t_change;

  -- Per-CUSIP breadth over the two-quarter base.
  create temp table t_breadth on commit drop as
    select ch.cusip,
           max(ch.ticker) as ticker,
           max(ch.issuer) as issuer,
           count(*) filter (where ch.class in ('new', 'doubled', 'added')) as buyers,
           count(*) filter (where ch.class in ('trimmed', 'exited')) as sellers,
           count(*) filter (where ch.class = 'new') as new,
           count(*) filter (where ch.class = 'exited') as exited,
           (select count(distinct e.cik) from t_cur_eq e where e.cusip = ch.cusip) as holders_now,
           (select count(distinct o.cik) from t_prior_full o where o.cusip = ch.cusip) as holders_prior
      from t_change ch
     group by ch.cusip;
  analyze t_breadth;

  select jsonb_build_object(
    'period', p_period,
    'prior_period', v_prior,
    'filers', (select count(*) from t_cur),
    'filers_with_prior', (select count(*) from t_cur c where exists (select 1 from t_prior p where p.cik = c.cik)),
    'holdings', (select count(*) from t_hold),
    'total_value_usd', (select coalesce(sum(value_usd), 0) from t_hold),
    'top_filers', coalesce((
      select jsonb_agg(x order by x.total_value_usd desc)
        from (select c.cik, max(c.filer_name) as filer_name, max(c.accession_no) as accession_no,
                     max(c.filed_at) as filed_at,
                     sum(h.value_usd) as total_value_usd, count(*) as positions,
                     (select t.ticker from t_cur_eq t
                       where t.cik = c.cik and t.ticker is not null
                       order by t.value_usd desc nulls last limit 1) as top_ticker,
                     (select t.value_usd / nullif(sum(h.value_usd), 0) from t_cur_eq t
                       where t.cik = c.cik and t.ticker is not null
                       order by t.value_usd desc nulls last limit 1) as top_weight
                from t_hold h join t_cur c on c.cik = h.cik group by c.cik
               order by sum(h.value_usd) desc nulls last
               limit v_lim) x), '[]'::jsonb),
    'widely_held', coalesce((
      select jsonb_agg(x order by x.holders desc, x.value_usd desc)
        from (select e.cusip, max(e.ticker) as ticker, max(e.issuer) as issuer,
                     count(distinct e.cik) as holders, sum(e.value_usd) as value_usd,
                     sum(e.shares) as shares,
                     coalesce((select b.buyers - b.sellers from t_breadth b where b.cusip = e.cusip), 0) as net_breadth,
                     coalesce((select b.holders_prior from t_breadth b where b.cusip = e.cusip), 0) as holders_prior
                from t_cur_eq e
               group by e.cusip
               order by count(distinct e.cik) desc, sum(e.value_usd) desc nulls last
               limit v_lim) x), '[]'::jsonb),
    'new_positions', coalesce((
      select jsonb_agg(x order by x.value_usd desc)
        from (select h.cik, h.filer_name, h.cusip, h.ticker, h.name_of_issuer as issuer,
                     h.value_usd, h.shares,
                     h.value_usd / nullif(b.book, 0) as pct_of_book
                from t_hold h
                join t_prior p on p.cik = h.cik
                left join t_prior_hold ph on ph.cik = h.cik and ph.cusip = h.cusip
                left join t_book b on b.cik = h.cik
               where ph.cik is null
                 and h.cusip is not null
                 and coalesce(h.put_call, '') = ''
               order by h.value_usd desc nulls last
               limit v_lim) x), '[]'::jsonb),
    'prior', jsonb_build_object(
      'filers', (select count(*) from t_prior),
      'holdings', (select count(*) from t_prior_all),
      'total_value_usd', (select coalesce(sum(value_usd), 0) from t_prior_all)),
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
                     count(distinct e.cik) as holders,
                     percentile_cont(0.5) within group
                       (order by e.value_usd / nullif(b.book, 0)) as median_weight,
                     sum(e.value_usd) as value_usd,
                     max(ts.sector) as sector
                from t_cur_eq e
                join t_book b on b.cik = e.cik
                left join public.ticker_sectors ts on ts.ticker = e.ticker
               group by e.cusip
              having count(distinct e.cik) >= 10
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
        from (select ch.cik, max(p.filer_name) as filer_name, ch.cusip, ch.ticker, ch.issuer,
                     ch.value_prior, ch.shares_prior,
                     ch.value_prior / nullif(pb.book, 0) as pct_of_prior_book
                from t_change ch
                join t_prior p on p.cik = ch.cik
                left join t_prior_book pb on pb.cik = ch.cik
               where ch.class = 'exited'
               group by ch.cik, ch.cusip, ch.ticker, ch.issuer, ch.value_prior,
                        ch.shares_prior, pb.book
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
        from (select upper(trim(h.cusip)) as cusip, max(h.ticker) as ticker,
                     max(h.name_of_issuer) as issuer,
                     coalesce(sum(h.value_usd) filter (where upper(h.put_call) like 'C%'), 0) as call_usd,
                     coalesce(sum(h.value_usd) filter (where upper(h.put_call) like 'P%'), 0) as put_usd,
                     count(distinct h.cik) filter (where upper(h.put_call) like 'C%') as call_filers,
                     count(distinct h.cik) filter (where upper(h.put_call) like 'P%') as put_filers
                from t_hold h
               where coalesce(h.put_call, '') <> '' and h.cusip is not null
               group by upper(trim(h.cusip))
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
  values ('institutional:' || p_period::text, v_payload, now())
  on conflict (key) do update set payload = excluded.payload, computed_at = excluded.computed_at;

  return jsonb_build_object(
    'period', p_period,
    'filers', v_payload->'filers',
    'holdings', v_payload->'holdings'
  );
end;
$function$;

revoke all on function public.refresh_titans_institutional(date, integer) from public, anon, authenticated;
grant execute on function public.refresh_titans_institutional(date, integer) to service_role;

-- ── Filing Season Clock ─────────────────────────────────────────────────
-- Cumulative distinct filers per day since quarter end, for the open period
-- and its prior period, plus the largest filers already in for the open one.
create or replace function public.titans_filing_curve(p_period date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_prior date := (date_trunc('quarter', p_period) - interval '1 day')::date;
  v_payload jsonb;
begin
  create temp table t_days on commit drop as
    select f.period_of_report as period,
           greatest(0, least(60, (f.filed_at::date - f.period_of_report))) as day,
           count(distinct f.cik) as filers
      from public.sec_filings f
     where f.form_family = 'institutional'
       and f.period_of_report in (p_period, v_prior)
       and exists (select 1 from public.sec_13f_holdings h where h.accession_no = f.accession_no)
     group by 1, 2;

  create temp table t_open_filers on commit drop as
    select distinct on (f.cik) f.cik, f.filer_name, f.filed_at, f.accession_no
      from public.sec_filings f
     where f.form_family = 'institutional'
       and f.period_of_report = p_period
       and exists (select 1 from public.sec_13f_holdings h where h.accession_no = f.accession_no)
     order by f.cik, f.filed_at desc;

  select jsonb_build_object(
    'period', p_period,
    'prior_period', v_prior,
    'open', coalesce((
      select jsonb_agg(jsonb_build_array(d.day, d.cum) order by d.day)
        from (select day, sum(filers) over (order by day) as cum
                from t_days where period = p_period) d), '[]'::jsonb),
    'prior', coalesce((
      select jsonb_agg(jsonb_build_array(d.day, d.cum) order by d.day)
        from (select day, sum(filers) over (order by day) as cum
                from t_days where period = v_prior) d), '[]'::jsonb),
    'prior_final', coalesce((select sum(filers) from t_days where period = v_prior), 0),
    'early_movers', coalesce((
      select jsonb_agg(x order by x.value_usd desc)
        from (
          select o.cik, o.filer_name, o.filed_at::date as filed_at,
                 sum(h.value_usd) as value_usd, count(*) as positions
            from t_open_filers o
            join public.sec_13f_holdings h on h.accession_no = o.accession_no
           group by o.cik, o.filer_name, o.filed_at
           order by sum(h.value_usd) desc nulls last
           limit 4) x), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$function$;

revoke all on function public.titans_filing_curve(date) from public, anon, authenticated;
grant execute on function public.titans_filing_curve(date) to service_role;

-- ── Security X-ray ──────────────────────────────────────────────────────
-- One security (ticker or 9-char CUSIP) across the period and its prior:
-- identity, holders, breadth, the holder ladder (paged), who joined and who
-- left. Price and the cross-signal block are added by the server read.
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
  v_prior date := (date_trunc('quarter', p_period) - interval '1 day')::date;
  v_key text := upper(trim(p_key));
  v_cusip text;
  v_lim integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_payload jsonb;
begin
  create temp table tx_cur on commit drop as
    select distinct on (f.cik) f.accession_no, f.cik, f.filer_name
      from public.sec_filings f
     where f.form_family = 'institutional'
       and f.period_of_report = p_period
       and exists (select 1 from public.sec_13f_holdings h where h.accession_no = f.accession_no)
     order by f.cik, f.filed_at desc;
  create temp table tx_prior on commit drop as
    select distinct on (f.cik) f.accession_no, f.cik, f.filer_name
      from public.sec_filings f
     where f.form_family = 'institutional'
       and f.period_of_report = v_prior
       and exists (select 1 from public.sec_13f_holdings h where h.accession_no = f.accession_no)
     order by f.cik, f.filed_at desc;

  -- Resolve the key to one CUSIP (prefer the largest current one for a ticker).
  select x.cusip into v_cusip
    from (
      select upper(trim(h.cusip)) as cusip, sum(h.value_usd) as v
        from tx_cur c join public.sec_13f_holdings h on h.accession_no = c.accession_no
       where (upper(trim(h.cusip)) = v_key or upper(h.ticker) = v_key)
         and h.cusip is not null
       group by 1 order by sum(h.value_usd) desc nulls last limit 1
    ) x;
  if v_cusip is null then
    return null;
  end if;

  create temp table tx_now on commit drop as
    select c.cik, c.filer_name, sum(h.shares) as shares, sum(h.value_usd) as value_usd
      from tx_cur c
      join public.sec_13f_holdings h on h.accession_no = c.accession_no
     where upper(trim(h.cusip)) = v_cusip and coalesce(h.put_call, '') = ''
     group by c.cik, c.filer_name;
  create temp table tx_before on commit drop as
    select p.cik, p.filer_name, sum(h.shares) as shares, sum(h.value_usd) as value_usd
      from tx_prior p
      join public.sec_13f_holdings h on h.accession_no = p.accession_no
     where upper(trim(h.cusip)) = v_cusip and coalesce(h.put_call, '') = ''
     group by p.cik, p.filer_name;

  create temp table tx_book on commit drop as
    select c.cik, sum(h.value_usd) as book
      from tx_cur c join public.sec_13f_holdings h on h.accession_no = c.accession_no
     where c.cik in (select cik from tx_now)
     group by c.cik;

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
     where exists (select 1 from tx_cur c where c.cik = coalesce(n.cik, o.cik))
       and exists (select 1 from tx_prior p where p.cik = coalesce(n.cik, o.cik));

  select jsonb_build_object(
    'cusip', v_cusip,
    'ticker', (select max(h.ticker) from tx_cur c join public.sec_13f_holdings h on h.accession_no = c.accession_no
                where upper(trim(h.cusip)) = v_cusip),
    'issuer', (select max(h.name_of_issuer) from tx_cur c join public.sec_13f_holdings h on h.accession_no = c.accession_no
                where upper(trim(h.cusip)) = v_cusip),
    'period', p_period,
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
                     n.value_usd / nullif(b.book, 0) as weight,
                     coalesce(ch.class, 'new') as class
                from tx_now n
                left join tx_book b on b.cik = n.cik
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

-- ── Twin funds ──────────────────────────────────────────────────────────
-- The three filers among the top 500 by reported value whose equity weight
-- vectors overlap one filer's most (sum of min(wA, wB) over shared CUSIPs),
-- with the largest shared and distinct names for the compare block.
create or replace function public.titans_fund_twins(p_cik text, p_period date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cik text := lpad(regexp_replace(coalesce(p_cik, ''), '\D', '', 'g'), 10, '0');
  v_payload jsonb;
begin
  create temp table tw_cur on commit drop as
    select distinct on (f.cik) f.accession_no, f.cik, f.filer_name
      from public.sec_filings f
     where f.form_family = 'institutional'
       and f.period_of_report = p_period
       and exists (select 1 from public.sec_13f_holdings h where h.accession_no = f.accession_no)
     order by f.cik, f.filed_at desc;

  create temp table tw_top on commit drop as
    select c.cik, max(c.filer_name) as filer_name, sum(h.value_usd) as book
      from tw_cur c join public.sec_13f_holdings h on h.accession_no = c.accession_no
     group by c.cik
     order by sum(h.value_usd) desc nulls last
     limit 500;

  if not exists (select 1 from tw_cur where cik = v_cik) then
    return '[]'::jsonb;
  end if;

  create temp table tw_w on commit drop as
    select c.cik, upper(trim(h.cusip)) as cusip, max(h.ticker) as ticker,
           sum(h.value_usd) / nullif(max(t.book), 0) as w
      from tw_cur c
      join public.sec_13f_holdings h on h.accession_no = c.accession_no
      join (select cik, book from tw_top union select c2.cik, sum(h2.value_usd)
              from tw_cur c2 join public.sec_13f_holdings h2 on h2.accession_no = c2.accession_no
             where c2.cik = v_cik group by c2.cik) t on t.cik = c.cik
     where (c.cik in (select cik from tw_top) or c.cik = v_cik)
       and h.cusip is not null and coalesce(h.put_call, '') = ''
     group by c.cik, upper(trim(h.cusip));
  analyze tw_w;

  select coalesce(jsonb_agg(tw order by tw.overlap desc), '[]'::jsonb) into v_payload
    from (
      select b.cik,
             max(t.filer_name) as filer_name,
             max(t.book) as book,
             sum(least(a.w, b.w)) as overlap,
             count(*) as shared,
             (select jsonb_agg(s.ticker order by s.mw desc)
                from (select coalesce(a2.ticker, b2.ticker) as ticker, least(a2.w, b2.w) as mw
                        from tw_w a2 join tw_w b2 on b2.cusip = a2.cusip and b2.cik = b.cik
                       where a2.cik = v_cik and coalesce(a2.ticker, b2.ticker) is not null
                       order by least(a2.w, b2.w) desc limit 6) s) as shared_tickers,
             (select jsonb_agg(s.ticker order by s.w desc)
                from (select a2.ticker, a2.w from tw_w a2
                       where a2.cik = v_cik and a2.ticker is not null
                         and not exists (select 1 from tw_w b2 where b2.cik = b.cik and b2.cusip = a2.cusip)
                       order by a2.w desc limit 6) s) as only_a,
             (select jsonb_agg(s.ticker order by s.w desc)
                from (select b2.ticker, b2.w from tw_w b2
                       where b2.cik = b.cik and b2.ticker is not null
                         and not exists (select 1 from tw_w a2 where a2.cik = v_cik and a2.cusip = b2.cusip)
                       order by b2.w desc limit 6) s) as only_b
        from tw_w a
        join tw_w b on b.cusip = a.cusip and b.cik <> v_cik
        join tw_top t on t.cik = b.cik
       where a.cik = v_cik
       group by b.cik
       order by sum(least(a.w, b.w)) desc
       limit 3
    ) tw;

  return v_payload;
end;
$function$;

revoke all on function public.titans_fund_twins(text, date) from public, anon, authenticated;
grant execute on function public.titans_fund_twins(text, date) to service_role;
