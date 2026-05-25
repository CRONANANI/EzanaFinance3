-- Idempotent catch-up: ensure user_learning_elo view exists for Learning Center ELO display.
CREATE OR REPLACE VIEW public.user_learning_elo AS
SELECT
  ue.user_id,
  ue.current_rating AS total_elo,
  COALESCE(weekly.delta_sum, 0)::INTEGER AS weekly_delta,
  ue.tier,
  ue.last_activity_at AS last_activity
FROM public.user_elo ue
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(delta), 0) AS delta_sum
  FROM public.elo_transactions
  WHERE user_id = ue.user_id
    AND category = 'learning'
    AND created_at > now() - INTERVAL '7 days'
) weekly ON TRUE;

GRANT SELECT ON public.user_learning_elo TO authenticated;
