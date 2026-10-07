-- 20261007000200_capitol_confidence_and_award_returns.sql
-- 1. hub_ticker_committee_holders: for each ticker, every full committee with
--    at least one member who still holds it (inferred from disclosures), with
--    seats, holders and the share of the committee holding. The hub ranks
--    tickers by their highest committee share (the confidence score).
-- 2. mv_award_window_trades: every disclosed trade by a politician, corporate
--    insider, institution (13F change) or whale (13D/13G stake) within 30 days
--    of a federal contract award to the same company, with the close at the
--    trade, 30 days later and latest, and the side-adjusted 30-day return.
-- 3. mv_award_company_moves: each company's stock move in the 30 days after
--    each award date.
-- 4. Rankings (hub_award_leaders, hub_award_companies), the per-transaction
--    feed (hub_award_window_top), the Quick Step badge rule, and the signed-in
--    user's own Quick Step progress (my_quick_step_progress).
-- 5. award_price_targets: the tickers and date ranges the price sync fills.
-- Prices come from price_data_cache, filled by /api/cron/sync-award-prices.

-- ── 1. committee holders per ticker ────────────────────────────────────
create or replace function public.hub_ticker_committee_holders(p_tickers text[])
returns table(ticker text, committee_thomas_id text, committee text, chamber text,
              seats integer, holders integer, share_pct numeric, holder_names text[])
language sql
stable
set search_path to 'public'
as $function$
  with tk as (
    select distinct upper(t) as ticker
    from unnest(coalesce(p_tickers, '{}'::text[])) t
    where coalesce(t, '') <> ''
    limit 60
  ),
  seats as (
    select s.committee_thomas_id, max(s.committee) as committee, max(s.chamber) as chamber,
           upper(s.bioguide_id) as bioguide_id
    from ezq_committee_seats s
    where not coalesce(s.is_subcommittee, false)
    group by s.committee_thomas_id, upper(s.bioguide_id)
  ),
  n as (
    select committee_thomas_id, max(committee) as committee, max(chamber) as chamber,
           count(*)::int as seats
    from seats group by committee_thomas_id
  ),
  held as (
    select distinct upper(o.bioguide_id) as bioguide_id, upper(o.ticker) as ticker, o.member_name
    from congress_open_positions o
    join tk on tk.ticker = upper(o.ticker)
  )
  select h.ticker, s.committee_thomas_id, n.committee, n.chamber, n.seats,
         count(distinct h.bioguide_id)::int,
         round(100.0 * count(distinct h.bioguide_id) / nullif(n.seats, 0), 1),
         (array_agg(distinct h.member_name))[1:8]
  from held h
  join seats s using (bioguide_id)
  join n using (committee_thomas_id)
  group by h.ticker, s.committee_thomas_id, n.committee, n.chamber, n.seats;
$function$;
revoke all on function public.hub_ticker_committee_holders(text[]) from public, anon, authenticated;
grant execute on function public.hub_ticker_committee_holders(text[]) to service_role;

-- ── 2. trades near awards, with returns ────────────────────────────────
drop function if exists public.hub_award_window_top(integer);
drop materialized view if exists public.mv_award_window_trades;
create materialized view public.mv_award_window_trades as
with awards as (
  select ticker, action_date, generated_award_id, award_amount, awarding_agency
  from public.mv_contract_award_tickers
  where action_date <= current_date
),
ev as (
  select 'politician'::text as actor_type,
         upper(e.bioguide_id) as actor_id,
         e.member_name        as actor_name,
         e.party              as actor_detail,
         upper(e.ticker)      as ticker,
         case when e.type = 'purchase' then 'buy' else 'sell' end as side,
         e.transaction_date   as trade_date,
         'trade'::text        as date_basis,
         e.id::text           as source_id
  from public.congress_trades_enriched e
  where e.ticker is not null and e.ticker <> ''
    and e.type in ('purchase', 'sale', 'sale_partial')
    and e.transaction_date >= current_date - 730
  union all
  select 'insider', s.reporter_cik, s.reporter_name, s.reporter_title, upper(s.issuer_ticker),
         case when s.transaction_code = 'P' then 'buy' else 'sell' end,
         s.transaction_date, 'trade',
         s.accession_no || ':' || s.table_kind || ':' || s.line_no
  from public.sec_insider_transactions s
  where s.transaction_code in ('P', 'S')
    and coalesce(s.issuer_ticker, '') <> '' and s.transaction_date is not null
  union all
  -- 13F changes and 13D/13G stakes carry no trade date: measured from the filing.
  select case when w.kind = 'institutional' then 'institution' else 'whale' end,
         coalesce(w.filer_cik, w.filer_name), w.filer_name,
         coalesce(w.form, w.change_type), upper(w.ticker),
         case when w.change_type = 'trimmed' then 'sell' else 'buy' end,
         w.filed_at::date, 'filing', w.id::text
  from public.whale_moves w
  where coalesce(w.ticker, '') <> '' and w.filed_at is not null
    and (w.kind = 'activist' or w.change_type in ('added', 'doubled', 'trimmed'))
),
matched as (
  select ev.*, a.generated_award_id, a.action_date as award_date, a.award_amount,
         a.awarding_agency, (ev.trade_date - a.action_date) as days_from_award
  from ev
  join lateral (
    select a.*
    from awards a
    where a.ticker = ev.ticker
      and a.action_date between ev.trade_date - 30 and ev.trade_date + 30
    order by abs(ev.trade_date - a.action_date), a.award_amount desc nulls last
    limit 1
  ) a on true
)
select m.*,
       p0.date  as entry_date,  p0.close  as entry_close,
       p30.date as exit_date,   p30.close as exit_close,
       pl.date  as latest_date, pl.close  as latest_close,
       case when p0.close > 0 and p30.close is not null then
         round(((p30.close / p0.close - 1) * (case when m.side = 'buy' then 1 else -1 end) * 100)::numeric, 2)
       end as ret_30d_pct,
       case when p0.close > 0 and pl.close is not null then
         round(((pl.close / p0.close - 1) * (case when m.side = 'buy' then 1 else -1 end) * 100)::numeric, 2)
       end as ret_to_date_pct
from matched m
left join lateral (
  select p.date, p.close::numeric as close from public.price_data_cache p
  where p.ticker = m.ticker and p.date between m.trade_date and m.trade_date + 6
  order by p.date limit 1
) p0 on true
left join lateral (
  select p.date, p.close::numeric as close from public.price_data_cache p
  where p.ticker = m.ticker and p0.date is not null
    and p.date between p0.date + 30 and p0.date + 37
  order by p.date limit 1
) p30 on true
left join lateral (
  select p.date, p.close::numeric as close from public.price_data_cache p
  where p.ticker = m.ticker order by p.date desc limit 1
) pl on true;

create unique index mv_award_window_trades_pk
  on public.mv_award_window_trades (actor_type, source_id);
create index mv_award_window_trades_ret
  on public.mv_award_window_trades (ret_30d_pct desc nulls last);
create index mv_award_window_trades_actor
  on public.mv_award_window_trades (actor_type, actor_id);
revoke all on public.mv_award_window_trades from public, anon, authenticated;
grant select on public.mv_award_window_trades to service_role;

-- ── 3. company moves after awards ──────────────────────────────────────
drop materialized view if exists public.mv_award_company_moves;
create materialized view public.mv_award_company_moves as
with d as (
  select ticker, action_date, count(*)::int as awards, sum(award_amount) as award_value,
         mode() within group (order by awarding_agency) as top_agency
  from public.mv_contract_award_tickers
  where action_date <= current_date
  group by ticker, action_date
)
select d.*, p0.date as entry_date, p0.close as entry_close,
       p30.date as exit_date, p30.close as exit_close,
       case when p0.close > 0 and p30.close is not null then
         round(((p30.close / p0.close - 1) * 100)::numeric, 2)
       end as move_30d_pct
from d
left join lateral (
  select p.date, p.close::numeric as close from public.price_data_cache p
  where p.ticker = d.ticker and p.date between d.action_date and d.action_date + 6
  order by p.date limit 1
) p0 on true
left join lateral (
  select p.date, p.close::numeric as close from public.price_data_cache p
  where p.ticker = d.ticker and p0.date is not null
    and p.date between p0.date + 30 and p0.date + 37
  order by p.date limit 1
) p30 on true;

create unique index mv_award_company_moves_pk
  on public.mv_award_company_moves (ticker, action_date);
revoke all on public.mv_award_company_moves from public, anon, authenticated;
grant select on public.mv_award_company_moves to service_role;

-- One refresh for both; the price sync and award crons call it.
create or replace function public.refresh_award_window_trades()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    refresh materialized view concurrently public.mv_award_window_trades;
  exception when others then
    refresh materialized view public.mv_award_window_trades;
  end;
  begin
    refresh materialized view concurrently public.mv_award_company_moves;
  exception when others then
    refresh materialized view public.mv_award_company_moves;
  end;
end;
$$;
revoke all on function public.refresh_award_window_trades() from public, anon, authenticated;
grant execute on function public.refresh_award_window_trades() to service_role;

-- ── 4. Quick Step rule, feed and rankings ──────────────────────────────
-- Quick Step: at least 3 measured trades near awards, 60% or more of them
-- ahead 30 days later (side-adjusted), averaging +5% or better.
-- Companies: at least 3 measured award dates, 60% or more followed by a rise,
-- averaging +3% or better 30 days after the award.
create or replace function public.quick_step_earned(p_n integer, p_hit numeric, p_avg numeric)
returns boolean
language sql
immutable
as $$ select coalesce(p_n, 0) >= 3 and coalesce(p_hit, 0) >= 0.6 and coalesce(p_avg, 0) >= 5 $$;

create or replace function public.hub_award_window_top(p_limit integer default 10)
returns setof public.mv_award_window_trades
language sql
stable
set search_path to 'public'
as $$
  select * from mv_award_window_trades
  where ret_30d_pct is not null
  order by ret_30d_pct desc, award_amount desc nulls last
  limit least(greatest(p_limit, 1), 50);
$$;
revoke all on function public.hub_award_window_top(integer) from public, anon, authenticated;
grant execute on function public.hub_award_window_top(integer) to service_role;

-- Insight score: average 30-day return x hit rate, shrunk toward zero for
-- small samples (n / (n + 2)), so one lucky trade does not top the table.
create or replace function public.hub_award_leaders(p_limit integer default 10, p_min_trades integer default 2)
returns table(actor_type text, actor_id text, actor_name text, actor_detail text,
              trades integer, avg_ret_pct numeric, hit_rate numeric, best_ret_pct numeric,
              best_ticker text, score numeric, quick_step boolean)
language sql
stable
set search_path to 'public'
as $$
  with m as (
    select * from mv_award_window_trades where ret_30d_pct is not null
  ),
  g as (
    select actor_type, actor_id, max(actor_name) as actor_name, max(actor_detail) as actor_detail,
           count(*)::int as trades,
           round(avg(ret_30d_pct), 2) as avg_ret_pct,
           round(avg(case when ret_30d_pct > 0 then 1.0 else 0 end), 3) as hit_rate,
           max(ret_30d_pct) as best_ret_pct,
           (array_agg(ticker order by ret_30d_pct desc))[1] as best_ticker
    from m group by actor_type, actor_id
  )
  select g.*, round(g.avg_ret_pct * g.hit_rate * g.trades / (g.trades + 2.0), 2) as score,
         quick_step_earned(g.trades, g.hit_rate, g.avg_ret_pct)
  from g
  where g.trades >= greatest(p_min_trades, 1)
  order by score desc nulls last, trades desc
  limit least(greatest(p_limit, 1), 50);
$$;
revoke all on function public.hub_award_leaders(integer, integer) from public, anon, authenticated;
grant execute on function public.hub_award_leaders(integer, integer) to service_role;

create or replace function public.hub_award_companies(p_limit integer default 10)
returns table(ticker text, award_dates integer, award_value numeric, avg_move_pct numeric,
              hit_rate numeric, top_agency text, quick_step boolean)
language sql
stable
set search_path to 'public'
as $$
  with g as (
    select ticker, count(*)::int as award_dates, sum(award_value) as award_value,
           round(avg(move_30d_pct), 2) as avg_move_pct,
           round(avg(case when move_30d_pct > 0 then 1.0 else 0 end), 3) as hit_rate,
           mode() within group (order by top_agency) as top_agency
    from mv_award_company_moves
    where move_30d_pct is not null
    group by ticker
  )
  select g.*, (g.award_dates >= 3 and g.hit_rate >= 0.6 and g.avg_move_pct >= 3)
  from g
  where g.award_dates >= 2
  order by (g.award_dates >= 3 and g.hit_rate >= 0.6 and g.avg_move_pct >= 3) desc,
           g.avg_move_pct * g.hit_rate desc nulls last
  limit least(greatest(p_limit, 1), 50);
$$;
revoke all on function public.hub_award_companies(integer) from public, anon, authenticated;
grant execute on function public.hub_award_companies(integer) to service_role;

-- The signed-in user's own progress, from their linked-brokerage trades.
create or replace function public.my_quick_step_progress()
returns table(near_award_trades integer, measured integer, avg_ret_pct numeric,
              hit_rate numeric, earned boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  with t as (
    select upper(u.ticker) as ticker, lower(u.type) as side, u.trade_date::date as d
    from unified_transactions u
    where u.user_id = auth.uid()
      and lower(u.type) in ('buy', 'sell')
      and coalesce(u.ticker, '') <> ''
      and u.trade_date >= current_date - 730
  ),
  near as (
    select t.* from t
    where exists (
      select 1 from mv_contract_award_tickers a
      where a.ticker = t.ticker and a.action_date between t.d - 30 and t.d + 30
        and a.action_date <= current_date
    )
  ),
  r as (
    select n.*,
      (select (p30.close::numeric / nullif(p0.close::numeric, 0) - 1)
              * (case when n.side = 'buy' then 1 else -1 end) * 100
       from (select date, close from price_data_cache p
             where p.ticker = n.ticker and p.date between n.d and n.d + 6
             order by p.date limit 1) p0
       join lateral (select close from price_data_cache p
                     where p.ticker = n.ticker and p.date between p0.date + 30 and p0.date + 37
                     order by p.date limit 1) p30 on true) as ret
    from near n
  )
  select count(*)::int,
         count(ret)::int,
         round(avg(ret), 2),
         round(avg(case when ret > 0 then 1.0 when ret is not null then 0 end), 3),
         quick_step_earned(count(ret)::int,
                           avg(case when ret > 0 then 1.0 when ret is not null then 0 end),
                           avg(ret))
  from r
  where auth.uid() is not null;
$$;
revoke all on function public.my_quick_step_progress() from public, anon;
grant execute on function public.my_quick_step_progress() to authenticated, service_role;

-- ── 5. what the price sync fills ───────────────────────────────────────
create or replace function public.award_price_targets()
returns table(ticker text, from_date date, last_date date)
language sql
stable
set search_path to 'public'
as $$
  with need as (
    select a.ticker, min(a.action_date) - 40 as from_date
    from mv_contract_award_tickers a
    where a.action_date <= current_date
    group by a.ticker
  )
  select n.ticker, n.from_date,
         (select max(p.date) from price_data_cache p where p.ticker = n.ticker)
  from need n
  order by n.ticker;
$$;
revoke all on function public.award_price_targets() from public, anon, authenticated;
grant execute on function public.award_price_targets() to service_role;
