-- 20261008000700_award_readers.sql
-- Who reads contract awards best: hub_award_leaders keeps only trades with a
-- measured 30-day return (7 of 57 near an award), so insiders and whales never
-- appeared. hub_award_readers lists every actor with a trade within 30 days of
-- an award to the same company, how many traded ahead of it and the average
-- lead in days, and scores only the measured trades (same formula as
-- hub_award_leaders: avg return x hit rate, shrunk for small samples).
--
-- Applied in the SQL Editor on 2026-10-08; this file mirrors the live
-- definition.

CREATE OR REPLACE FUNCTION public.hub_award_readers(p_limit_per_type integer DEFAULT 15)
 RETURNS TABLE(actor_type text, actor_id text, actor_name text, actor_detail text, trades integer, before_award integer, avg_lead_days numeric, measured integer, avg_ret_pct numeric, hit_rate numeric, best_ticker text, best_ret_pct numeric, award_value numeric, score numeric, quick_step boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with m as (
    select * from mv_award_window_trades
  ),
  aw as (
    select actor_type, actor_id, sum(award_amount) as award_value
    from (select distinct actor_type, actor_id, generated_award_id, award_amount from m) x
    group by actor_type, actor_id
  ),
  g as (
    select m.actor_type, m.actor_id,
           max(m.actor_name)   as actor_name,
           max(m.actor_detail) as actor_detail,
           count(*)::int       as trades,
           count(*) filter (where m.days_from_award < 0)::int as before_award,
           round(avg(-m.days_from_award) filter (where m.days_from_award < 0), 1) as avg_lead_days,
           count(m.ret_30d_pct)::int as measured,
           round(avg(m.ret_30d_pct), 2) as avg_ret_pct,
           round(avg(case when m.ret_30d_pct > 0 then 1.0
                          when m.ret_30d_pct is not null then 0.0 end), 3) as hit_rate,
           (array_agg(m.ticker order by m.ret_30d_pct desc nulls last,
                                        m.award_amount desc nulls last))[1] as best_ticker,
           max(m.ret_30d_pct) as best_ret_pct
    from m
    group by m.actor_type, m.actor_id
  ),
  s as (
    select g.*, aw.award_value,
           case when g.measured > 0
                then round(g.avg_ret_pct * g.hit_rate * g.measured / (g.measured + 2.0), 2) end as score,
           case when g.measured > 0
                then quick_step_earned(g.measured, g.hit_rate, g.avg_ret_pct) else false end as quick_step
    from g
    left join aw using (actor_type, actor_id)
  ),
  ranked as (
    select s.*,
           row_number() over (partition by s.actor_type
                              order by s.score desc nulls last, s.before_award desc,
                                       s.trades desc, s.actor_id) as rn
    from s
  )
  select actor_type, actor_id, actor_name, actor_detail, trades, before_award, avg_lead_days,
         measured, avg_ret_pct, hit_rate, best_ticker, best_ret_pct, award_value, score, quick_step
  from ranked
  where rn <= least(greatest(coalesce(p_limit_per_type, 15), 1), 50)
  order by score desc nulls last, before_award desc, trades desc, actor_id;
$function$;

revoke all on function public.hub_award_readers(integer) from public, anon, authenticated;
grant execute on function public.hub_award_readers(integer) to service_role;
