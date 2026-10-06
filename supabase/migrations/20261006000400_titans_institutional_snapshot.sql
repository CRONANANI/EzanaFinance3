-- Titans Shadow: Institutional overview snapshot.
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor,
-- after 20261006000300_titans_cusip_map.sql.
--
-- Why: the Institutional page ranks filers by reported 13F value, counts how
-- many filers hold each security, and lists the largest positions that were
-- absent last quarter. That needs aggregates over every 13F row of a quarter
-- (roughly 400k rows for a full quarter), which the REST API cannot express
-- and which is too heavy to run per page view. The hourly compute-whale-moves
-- cron calls refresh_titans_institutional() once per run; the page reads the
-- one stored row.

-- Anti-join on (filing, CUSIP) when finding positions absent last quarter.
create index if not exists sec_13f_holdings_acc_cusip_idx
  on public.sec_13f_holdings (accession_no, cusip);

create table if not exists public.titans_snapshots (
  key          text primary key,
  payload      jsonb not null,
  computed_at  timestamptz not null default now()
);

-- Server reads only (service role bypasses RLS); no public policy.
alter table public.titans_snapshots enable row level security;

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
    select distinct on (f.cik) f.accession_no, f.cik
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

  analyze t_cur;
  analyze t_hold;
  analyze t_prior_hold;

  select jsonb_build_object(
    'period', p_period,
    'prior_period', v_prior,
    'filers', (select count(*) from t_cur),
    'filers_with_prior', (select count(*) from t_cur c where exists (select 1 from t_prior p where p.cik = c.cik)),
    'holdings', (select count(*) from t_hold),
    'total_value_usd', (select coalesce(sum(value_usd), 0) from t_hold),
    'top_filers', coalesce((
      select jsonb_agg(x order by x.total_value_usd desc)
        from (select cik, max(filer_name) as filer_name, max(accession_no) as accession_no,
                     sum(value_usd) as total_value_usd, count(*) as positions
                from t_hold group by cik
               order by sum(value_usd) desc nulls last
               limit v_lim) x), '[]'::jsonb),
    'widely_held', coalesce((
      select jsonb_agg(x order by x.holders desc, x.value_usd desc)
        from (select cusip, max(ticker) as ticker, max(name_of_issuer) as issuer,
                     count(distinct cik) as holders, sum(value_usd) as value_usd,
                     sum(shares) as shares
                from t_hold
               where cusip is not null and coalesce(put_call, '') = ''
               group by cusip
               order by count(distinct cik) desc, sum(value_usd) desc nulls last
               limit v_lim) x), '[]'::jsonb),
    'new_positions', coalesce((
      select jsonb_agg(x order by x.value_usd desc)
        from (select h.cik, h.filer_name, h.cusip, h.ticker, h.name_of_issuer as issuer,
                     h.value_usd, h.shares
                from t_hold h
                join t_prior p on p.cik = h.cik
                left join t_prior_hold ph on ph.cik = h.cik and ph.cusip = h.cusip
               where ph.cik is null
                 and h.cusip is not null
                 and coalesce(h.put_call, '') = ''
               order by h.value_usd desc nulls last
               limit v_lim) x), '[]'::jsonb)
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
