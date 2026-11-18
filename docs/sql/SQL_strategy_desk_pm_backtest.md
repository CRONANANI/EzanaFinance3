# Strategy Desk: prediction-market backtest function (Nov 18 2026)

Read-only. Returns one row per simulated bet for the "late favourite"
prediction-market strategy family, so the API can compute hit rate, the
price-implied break-even, ROI, a confidence interval and drawdown. Entry is
the snapshot closest to `p_hours` before the market's end date (within
+/- 12 hours), priced at the best ask (falling back to the mid probability),
inside [p_min_price, p_max_price], with at least `p_min_liquidity` of
liquidity. A market counts as settled when its last recorded probability is
at or above 0.99 (YES) or at or below 0.01 (NO). Service role only.

```sql
create or replace function public.strategy_pm_late_favourite(
  p_min_price numeric default 0.85,
  p_max_price numeric default 0.97,
  p_hours int default 48,
  p_min_liquidity numeric default 1000,
  p_from timestamptz default now() - interval '400 days'
)
returns table (
  market_id text,
  platform text,
  question text,
  category text,
  end_date timestamptz,
  entry_at timestamptz,
  price numeric,
  won boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with settled as (
    select i.market_id, i.platform, i.question, i.category, i.end_date,
           (i.probability >= 0.99) as yes_won
    from public.prediction_market_index i
    where i.end_date >= p_from
      and i.end_date < now() - interval '1 hour'
      and (i.probability >= 0.99 or i.probability <= 0.01)
  ),
  entry as (
    select distinct on (s.market_id)
           s.market_id, st.platform, st.question, st.category, st.end_date,
           s.captured_at as entry_at,
           coalesce(s.best_ask, s.probability) as price,
           s.liquidity,
           st.yes_won
    from public.prediction_market_snapshots s
    join settled st on st.market_id = s.market_id
    where s.captured_at between st.end_date - make_interval(hours => p_hours + 12)
                            and st.end_date - make_interval(hours => greatest(p_hours - 12, 1))
    order by s.market_id,
             abs(extract(epoch from (st.end_date - make_interval(hours => p_hours) - s.captured_at)))
  )
  select market_id, platform, question, category, end_date, entry_at, price, yes_won
  from entry
  where price between p_min_price and p_max_price
    and coalesce(liquidity, 0) >= p_min_liquidity
  order by entry_at;
$$;

revoke all on function public.strategy_pm_late_favourite(numeric, numeric, int, numeric, timestamptz)
  from public, anon, authenticated;
grant execute on function public.strategy_pm_late_favourite(numeric, numeric, int, numeric, timestamptz)
  to service_role;
```
