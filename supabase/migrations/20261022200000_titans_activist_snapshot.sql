-- Titans Shadow: Activist & Block Positions snapshot.
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor,
-- after 20261022000100_activist_parser_v2.sql.
--
-- refresh_titans_activist(p_asof) writes titans_snapshots key
-- 'activist:<p_asof>': the campaign read model (one confirmed investor on one
-- target), per-window ledgers, tag / type / funds / basis mixes, sector
-- rollups, filing-speed bins, leaderboards, crowded targets and the reparse
-- progress. Called once per hourly run by the same job that refreshes the
-- 13F snapshot. No new table (titans_snapshots exists, RLS enabled); the
-- function is service_role only.
--
-- Rules carried in SQL:
--   * A campaign is (confirmed filer_cik, target key). Unconfirmed filings
--     are never grouped; they land in `unconfirmed`.
--   * Percentages are never added across persons or investors; `crowded`
--     holders keep separate values.
--   * Nothing is extracted from Item 3 or Item 4 text.
--   * Business days exclude weekends and NYSE full-day holidays 2024 to 2027
--     (the same constant list as src/lib/titans/activist-model.js).

create or replace function public.titans_business_days(p_from date, p_to date)
returns integer
language sql
immutable
set search_path to 'public'
as $$
  select case when p_from is null or p_to is null then null else (
    select count(*)::int
      from generate_series(least(p_from, p_to) + 1, greatest(p_from, p_to), interval '1 day') d
     where extract(isodow from d) < 6
       and d::date not in (
         '2024-01-01','2024-01-15','2024-02-19','2024-03-29','2024-05-27','2024-06-19',
         '2024-07-04','2024-09-02','2024-11-28','2024-12-25',
         '2025-01-01','2025-01-20','2025-02-17','2025-04-18','2025-05-26','2025-06-19',
         '2025-07-04','2025-09-01','2025-11-27','2025-12-25',
         '2026-01-01','2026-01-19','2026-02-16','2026-04-03','2026-05-25','2026-06-19',
         '2026-07-03','2026-09-07','2026-11-26','2026-12-25',
         '2027-01-01','2027-01-18','2027-02-15','2027-03-26','2027-05-31','2027-06-18',
         '2027-07-05','2027-09-06','2027-11-25','2027-12-24')
  ) end;
$$;

revoke all on function public.titans_business_days(date, date) from public, anon, authenticated;
grant execute on function public.titans_business_days(date, date) to service_role;

create or replace function public.refresh_titans_activist(p_asof date default current_date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_payload jsonb;
  v_windows jsonb := '{}'::jsonb;
  v_win record;
begin
  -- Every filing with a parsed stake, its form kind, target key and the
  -- confirmed-investor flag. filer_source is only set by parser v2.
  create temp table t_f on commit drop as
    select p.accession_no,
           f.filed_at::date as filed,
           p.event_date::date as event,
           case when upper(coalesce(p.form_type, f.form_type)) like '%13D%' then '13D' else '13G' end as form,
           p.is_amendment,
           p.amendment_no,
           p.percent_of_class,
           p.shares,
           p.subject_name,
           upper(nullif(trim(p.subject_cusip), '')) as cusip,
           upper(nullif(trim(p.subject_ticker), '')) as ticker,
           coalesce(upper(nullif(trim(p.subject_cusip), '')),
                    'name:' || lower(regexp_replace(coalesce(p.subject_name, ''), '[^a-zA-Z0-9]+', '', 'g'))) as target_key,
           p.filer_name,
           p.filer_cik,
           (p.filer_cik is not null and p.filer_source is not null) as confirmed,
           coalesce(p.parser_version, 0) >= 2 as v2,
           p.purpose_tags,
           p.person_types,
           p.fund_sources,
           p.g_rules,
           p.sole_voting, p.shared_voting,
           ts.sector
      from public.sec_activist_positions p
      join public.sec_filings f on f.accession_no = p.accession_no
      left join public.ticker_sectors ts on ts.ticker = upper(nullif(trim(p.subject_ticker), ''))
     where f.form_family = 'activist'
       and (p.percent_of_class is not null or p.shares is not null);
  analyze t_f;

  -- Campaign rows: confirmed filings only, ordered within (filer, target).
  create temp table t_c on commit drop as
    select t.*,
           row_number() over w as seq,
           lag(t.percent_of_class) over w as prev_pct,
           lag(t.form) over w as prev_form,
           first_value(t.percent_of_class) over w as first_pct,
           count(*) over (partition by t.filer_cik, t.target_key) as n_filings,
           max(t.filed) over (partition by t.filer_cik, t.target_key) as last_filed,
           min(t.filed) over (partition by t.filer_cik, t.target_key) as first_filed
      from t_f t
     where t.confirmed and t.target_key not in ('name:')
    window w as (partition by t.filer_cik, t.target_key order by t.filed, t.accession_no);
  analyze t_c;

  create temp table t_flags on commit drop as
    select c.*,
           (c.prev_pct is not null and c.percent_of_class > c.prev_pct) as raise,
           (c.percent_of_class is not null and c.percent_of_class < 5) as exit,
           (c.prev_form = '13G' and c.form = '13D') as switch,
           (c.purpose_tags is not null and exists (
             select 1 from unnest(c.purpose_tags) tg where tg <> 'investment')) as stated_plan
      from t_c c;
  analyze t_flags;

  -- Per-window aggregates.
  for v_win in
    select * from (values
      ('30d', p_asof - 30, p_asof),
      ('90d', p_asof - 90, p_asof),
      ('12m', p_asof - 365, p_asof),
      ('all', null::date, p_asof)
    ) as w(key, start, finish)
  loop
    v_windows := v_windows || jsonb_build_object(v_win.key, (
      with win as (
        select * from t_f
         where filed <= v_win.finish and (v_win.start is null or filed > v_win.start)
      ),
      winflags as (
        select * from t_flags
         where filed <= v_win.finish and (v_win.start is null or filed > v_win.start)
      ),
      prior as (
        select * from t_f
         where v_win.start is not null
           and filed <= v_win.start and filed > v_win.start - (v_win.finish - v_win.start)
      ),
      priorflags as (
        select * from t_flags
         where v_win.start is not null
           and filed <= v_win.start and filed > v_win.start - (v_win.finish - v_win.start)
      )
      select jsonb_build_object(
        'range', jsonb_build_array(coalesce(v_win.start::text, null), v_win.finish::text),
        'ledger', jsonb_build_object(
          'new', (select count(*) from win where not is_amendment),
          'amendments', (select count(*) from win where is_amendment),
          'new_13d', (select count(*) from win where not is_amendment and form = '13D'),
          'exits', (select count(*) from winflags where exit),
          'stated_plan', (select count(*) from winflags where form = '13D' and not is_amendment and stated_plan),
          'prior', case when v_win.start is null then null else jsonb_build_object(
            'new', (select count(*) from prior where not is_amendment),
            'amendments', (select count(*) from prior where is_amendment),
            'new_13d', (select count(*) from prior where not is_amendment and form = '13D'),
            'exits', (select count(*) from priorflags where exit),
            'stated_plan', (select count(*) from priorflags where form = '13D' and not is_amendment and stated_plan)
          ) end),
        'tags_13d', coalesce((
          select jsonb_agg(x order by x.n desc)
            from (select tg as tag, count(*) as n
                    from win, unnest(coalesce(purpose_tags, '{}')) tg
                   where form = '13D' group by tg) x), '[]'::jsonb),
        'types', jsonb_build_object(
          '13D', coalesce((select jsonb_agg(x order by x.n desc)
            from (select code, count(*) as n from win, unnest(coalesce(person_types, '{}')) code
                   where form = '13D' group by code) x), '[]'::jsonb),
          '13G', coalesce((select jsonb_agg(x order by x.n desc)
            from (select code, count(*) as n from win, unnest(coalesce(person_types, '{}')) code
                   where form = '13G' group by code) x), '[]'::jsonb),
          'no_cover', (select count(*) from win where not v2 or person_types = '{}')),
        'funds_13d', coalesce((
          select jsonb_agg(x order by x.n desc)
            from (select code, count(*) as n from win, unnest(coalesce(fund_sources, '{}')) code
                   where form = '13D' group by code) x), '[]'::jsonb),
        'basis_13g', coalesce((
          select jsonb_agg(x order by x.n desc)
            from (
              with g as (
                select w.*, b.rule
                  from win w, lateral (
                    select case
                      when exists (select 1 from unnest(coalesce(w.g_rules, '{}')) gr where gr like '%b%') then 'b'
                      when exists (select 1 from unnest(coalesce(w.g_rules, '{}')) gr where gr like '%c%') then 'c'
                      when exists (select 1 from unnest(coalesce(w.g_rules, '{}')) gr where gr like '%d%') then 'd'
                    end as rule
                  ) b
                 where w.form = '13G' and b.rule is not null
              )
              select g.rule, count(*) as n,
                     (select jsonb_agg(jsonb_build_object(
                          'accession', t.accession_no, 'filer', t.filer_name,
                          'filer_cik', t.filer_cik, 'ticker', t.ticker,
                          'subject', t.subject_name, 'pct', t.percent_of_class,
                          'filed', t.filed) order by t.percent_of_class desc nulls last)
                        from (select * from g t2 where t2.rule = g.rule
                               order by t2.percent_of_class desc nulls last limit 2) t) as top
                from g
               group by g.rule) x), '[]'::jsonb),
        'sectors', coalesce((
          select jsonb_agg(x order by x.new desc)
            from (select coalesce(sector, 'Unclassified') as sector,
                         count(*) filter (where not is_amendment) as new,
                         count(*) filter (where not is_amendment and form = '13D') as new_13d,
                         coalesce((select jsonb_agg(y order by y.n desc)
                            from (select tg as tag, count(*) as n
                                    from win w2, unnest(coalesce(w2.purpose_tags, '{}')) tg
                                   where coalesce(w2.sector, 'Unclassified') = coalesce(w.sector, 'Unclassified')
                                     and w2.form = '13D'
                                   group by tg limit 6) y), '[]'::jsonb) as tags
                    from win w group by coalesce(sector, 'Unclassified')) x), '[]'::jsonb),
        'speed', (
          with sp as (
            select form, is_amendment,
                   public.titans_business_days(event, filed) as bd
              from win
          ), binned as (
            select case when bd <= 5 then bd::text
                        when bd <= 10 then '6-10'
                        when bd <= 30 then '11-30'
                        else '31+' end as bin,
                   form, is_amendment
              from sp where bd is not null and bd >= 0
          ), bins as (
            select unnest(array['0','1','2','3','4','5','6-10','11-30','31+']) as bin,
                   generate_series(1, 9) as ord
          )
          select jsonb_build_object(
            'bins', (select jsonb_agg(bin order by ord) from bins),
            'd', (select jsonb_agg(coalesce(n, 0) order by ord) from bins
                   left join (select bin, count(*) as n from binned where form = '13D' and not is_amendment group by bin) q using (bin)),
            'da', (select jsonb_agg(coalesce(n, 0) order by ord) from bins
                   left join (select bin, count(*) as n from binned where form = '13D' and is_amendment group by bin) q using (bin)),
            'g', (select jsonb_agg(coalesce(n, 0) order by ord) from bins
                   left join (select bin, count(*) as n from binned where form = '13G' group by bin) q using (bin)),
            'no_event_date', (select count(*) from win where event is null))),
        'leaderboard_13d', coalesce((
          select jsonb_agg(x order by x.campaigns desc, x.new desc)
            from (select c.filer_cik as cik, max(c.filer_name) as name,
                         (select coalesce(jsonb_agg(distinct code), '[]'::jsonb)
                            from t_flags c2, unnest(coalesce(c2.person_types, '{}')) code
                           where c2.filer_cik = c.filer_cik) as types,
                         count(distinct c.target_key) as campaigns,
                         count(*) filter (where not c.is_amendment) as new,
                         percentile_cont(0.5) within group (order by c.percent_of_class)
                           filter (where not c.is_amendment) as median_first_pct,
                         count(*) filter (where c.raise) as raises,
                         count(*) filter (where c.exit) as exits,
                         (select tg from t_flags c3, unnest(coalesce(c3.purpose_tags, '{}')) tg
                           where c3.filer_cik = c.filer_cik and c3.form = '13D'
                           group by tg order by count(*) desc, tg limit 1) as top_tag,
                         (select coalesce(jsonb_agg(distinct c4.ticker), '[]'::jsonb)
                            from t_flags c4 where c4.filer_cik = c.filer_cik and c4.ticker is not null) as tickers
                    from winflags c
                   where c.form = '13D'
                   group by c.filer_cik
                   order by count(distinct c.target_key) desc, count(*) desc
                   limit 12) x), '[]'::jsonb),
        'leaderboard_13g', coalesce((
          select jsonb_agg(x order by x.filings desc)
            from (select c.filer_cik as cik, max(c.filer_name) as name,
                         (select case
                            when exists (select 1 from unnest(coalesce(c5.g_rules, '{}')) g where g like '%b%') then 'b'
                            when exists (select 1 from unnest(coalesce(c5.g_rules, '{}')) g where g like '%c%') then 'c'
                            when exists (select 1 from unnest(coalesce(c5.g_rules, '{}')) g where g like '%d%') then 'd' end
                            from t_flags c5 where c5.filer_cik = c.filer_cik and c5.form = '13G'
                            order by c5.filed desc limit 1) as basis,
                         count(*) as filings,
                         percentile_cont(0.5) within group (order by c.percent_of_class) as median_pct,
                         (select coalesce(jsonb_agg(distinct c6.ticker), '[]'::jsonb)
                            from t_flags c6 where c6.filer_cik = c.filer_cik and c6.ticker is not null) as tickers
                    from winflags c
                   where c.form = '13G'
                   group by c.filer_cik
                   order by count(*) desc
                   limit 12) x), '[]'::jsonb)
      )
    ));
  end loop;

  select jsonb_build_object(
    'asof', p_asof,
    'reparse', jsonb_build_object(
      'v2', (select count(*) from t_f where v2),
      'total', (select count(*) from t_f)),
    'windows', v_windows,
    'campaigns', coalesce((
      select jsonb_agg(x order by x.last_filed desc)
        from (
          select c.filer_cik, max(c.filer_name) as filer,
                 c.filer_cik || ':' || c.target_key as key,
                 max(c.ticker) as ticker,
                 max(c.cusip) as cusip,
                 max(c.subject_name) as subject,
                 max(c.last_filed)::text as last_filed,
                 min(c.first_filed)::text as first_filed,
                 (array_agg(c.percent_of_class order by c.filed desc, c.accession_no desc))[1] as latest_pct,
                 case
                   when (array_agg(c.percent_of_class order by c.filed desc, c.accession_no desc))[1] < 5 then 'exited'
                   when max(c.n_filings) = 1 then 'new'
                   when (array_agg(c.percent_of_class order by c.filed desc, c.accession_no desc))[1]
                        < (array_agg(c.prev_pct order by c.filed desc, c.accession_no desc))[1] then 'unwinding'
                   when (array_agg(c.percent_of_class order by c.filed desc, c.accession_no desc))[1]
                        > (array_agg(c.first_pct order by c.filed desc, c.accession_no desc))[1] then 'building'
                   else 'holding'
                 end as status,
                 jsonb_agg(jsonb_build_object(
                   'accession', c.accession_no,
                   'filed', c.filed, 'event', c.event,
                   'form', c.form, 'amendment_no', c.amendment_no,
                   'pct', c.percent_of_class,
                   'tags', coalesce(to_jsonb(c.purpose_tags), '[]'::jsonb),
                   'g_rule', (select case
                     when exists (select 1 from unnest(coalesce(c.g_rules, '{}')) g where g like '%b%') then 'b'
                     when exists (select 1 from unnest(coalesce(c.g_rules, '{}')) g where g like '%c%') then 'c'
                     when exists (select 1 from unnest(coalesce(c.g_rules, '{}')) g where g like '%d%') then 'd' end),
                   'raise', c.raise, 'exit', c.exit, 'switch', c.switch,
                   'detail', c.v2) order by c.filed, c.accession_no) as filings
            from t_flags c
           group by c.filer_cik, c.target_key
          having max(c.last_filed) >= p_asof - 365
              or (bool_or(c.form = '13D')
                  and (array_agg(c.percent_of_class order by c.filed desc, c.accession_no desc))[1] >= 5)
           order by max(c.last_filed) desc
           limit 400
        ) x), '[]'::jsonb),
    'unconfirmed', coalesce((
      select jsonb_agg(x order by x.filed desc)
        from (select accession_no as accession, filed, event, form, is_amendment,
                     amendment_no, percent_of_class as pct, subject_name as subject,
                     ticker, cusip, v2 as detail
                from t_f where not confirmed
               order by filed desc limit 60) x), '[]'::jsonb),
    'crowded', coalesce((
      select jsonb_agg(x order by x.n desc, x.max_pct desc)
        from (
          with latest as (
            select distinct on (filer_cik, target_key)
                   filer_cik, filer_name, target_key, ticker, subject_name,
                   form, percent_of_class, filed
              from t_c
             order by filer_cik, target_key, filed desc, accession_no desc
          )
          select target_key, max(ticker) as ticker, max(subject_name) as subject,
                 count(*) as n, max(percent_of_class) as max_pct,
                 jsonb_agg(jsonb_build_object(
                   'filer_cik', filer_cik, 'filer', filer_name, 'form', form,
                   'pct', percent_of_class, 'filed', filed)
                   order by percent_of_class desc nulls last) as holders
            from latest
           where percent_of_class >= 5
           group by target_key
          having count(*) >= 2
           order by count(*) desc, max(percent_of_class) desc
           limit 25
        ) x), '[]'::jsonb)
  ) into v_payload;

  insert into public.titans_snapshots (key, payload, computed_at)
  values ('activist:' || p_asof::text, v_payload, now())
  on conflict (key) do update set payload = excluded.payload, computed_at = excluded.computed_at;

  return jsonb_build_object(
    'asof', p_asof,
    'campaigns', jsonb_array_length(v_payload->'campaigns'),
    'unconfirmed', jsonb_array_length(v_payload->'unconfirmed')
  );
end;
$function$;

revoke all on function public.refresh_titans_activist(date) from public, anon, authenticated;
grant execute on function public.refresh_titans_activist(date) to service_role;
