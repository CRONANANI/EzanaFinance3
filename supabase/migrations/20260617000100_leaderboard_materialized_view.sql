-- Phase 2 (scale-out): precomputed leaderboard read model.
--
-- The community leaderboard recomputes per-user returns from
-- portfolio_value_snapshots on every (cache-missed) request. This materialized
-- view precomputes, per user and per standard period, the snapshot-based return
-- so the read path becomes a single indexed scan instead of a full-table
-- snapshot scan + in-app first/last computation.
--
-- Refresh is driven by refresh_leaderboard_mat() (called from a cron). The mock-
-- portfolio fallback for users without snapshots stays in application code.

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_portfolio_leaderboard AS
WITH periods AS (
  SELECT * FROM (VALUES
    ('daily', 1),
    ('weekly', 7),
    ('monthly', 30),
    ('yearly', 365)
  ) AS p(period, days)
),
windowed AS (
  SELECT
    s.user_id,
    p.period,
    first_value(s.total_value) OVER w AS start_value,
    last_value(s.total_value)  OVER w AS end_value,
    row_number() OVER (PARTITION BY s.user_id, p.period ORDER BY s.snapshot_date)            AS rn,
    count(*)     OVER (PARTITION BY s.user_id, p.period)                                     AS n
  FROM periods p
  JOIN public.portfolio_value_snapshots s
    ON s.snapshot_date >= (CURRENT_DATE - (p.days + 2))
  WINDOW w AS (
    PARTITION BY s.user_id, p.period
    ORDER BY s.snapshot_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  )
)
SELECT
  user_id,
  period,
  start_value,
  end_value,
  CASE
    WHEN start_value > 0 AND end_value > 0
    THEN round(((end_value - start_value) / start_value) * 100, 2)
    ELSE NULL
  END AS return_pct
FROM windowed
WHERE rn = 1 AND n >= 2;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY (non-blocking
-- refresh). Also serves the per-period read query.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_portfolio_leaderboard
  ON public.mv_portfolio_leaderboard (period, user_id);

-- Refresh helper, callable from the service role via RPC:
--   await admin.rpc('refresh_leaderboard_mat')
-- Falls back to a blocking refresh if CONCURRENTLY can't run (e.g. first
-- populate). SECURITY DEFINER so the cron's service-role call can refresh it.
CREATE OR REPLACE FUNCTION public.refresh_leaderboard_mat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_portfolio_leaderboard;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_portfolio_leaderboard;
  END;
END;
$$;

-- Read-only access for the API. RLS does not apply to materialized views, so we
-- grant SELECT explicitly; only non-sensitive aggregate return data is exposed.
GRANT SELECT ON public.mv_portfolio_leaderboard TO anon, authenticated, service_role;
