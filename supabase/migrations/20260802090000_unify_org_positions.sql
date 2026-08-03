-- ═══════════════════════════════════════════════════════════════════
-- Phase A: org_positions becomes the single source of truth for org
-- holdings. Backfill rows from the orphaned org_team_portfolios (seed
-- data only — nothing in the app writes to it) so the demo org does
-- not go empty when readers migrate. org_team_portfolios is kept for
-- rollback but is DEPRECATED: no new reads or writes.
-- Run in the Supabase SQL Editor. Idempotent.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.org_positions
  (org_id, team_id, ticker, name, shares, avg_cost, current_price, sector,
   source, added_by_user_id, notes, is_active, created_at)
SELECT
  t.org_id,
  tp.team_id,
  UPPER(TRIM(tp.ticker_symbol)),
  NULL,
  tp.shares,
  tp.avg_cost,
  CASE WHEN tp.shares > 0 AND tp.current_value > 0
       THEN ROUND(tp.current_value / tp.shares, 4)
       ELSE NULL END,
  tp.sector,
  'manual',
  COALESCE(
    tp.added_by,
    (SELECT om.user_id FROM public.org_members om
     WHERE om.org_id = t.org_id AND om.role = 'executive' AND om.is_active = true
     ORDER BY om.joined_at LIMIT 1)
  ),
  'Backfilled from org_team_portfolios (Phase A unification)',
  true,
  COALESCE(tp.added_at, NOW())
FROM public.org_team_portfolios tp
JOIN public.org_teams t ON t.id = tp.team_id
WHERE tp.shares > 0
  -- skip rows the backfill (or a human) already created
  AND NOT EXISTS (
    SELECT 1 FROM public.org_positions op
    WHERE op.org_id = t.org_id
      AND op.team_id IS NOT DISTINCT FROM tp.team_id
      AND op.ticker = UPPER(TRIM(tp.ticker_symbol))
      AND op.is_active = true
  )
  -- skip rows whose org has no executive to attribute (added_by null there)
  AND COALESCE(
    tp.added_by,
    (SELECT om.user_id FROM public.org_members om
     WHERE om.org_id = t.org_id AND om.role = 'executive' AND om.is_active = true
     ORDER BY om.joined_at LIMIT 1)
  ) IS NOT NULL;

COMMENT ON TABLE public.org_team_portfolios IS
  'DEPRECATED (Phase A, Aug 2026): read/write org_positions instead. Kept only for rollback; no app code should reference this table.';

-- Verification (run manually, expect matching totals for the demo org):
-- SELECT t.org_id, COUNT(*), SUM(tp.current_value) FROM org_team_portfolios tp JOIN org_teams t ON t.id = tp.team_id GROUP BY 1;
-- SELECT org_id, COUNT(*), SUM(shares * COALESCE(current_price, avg_cost)) FROM org_positions WHERE is_active GROUP BY 1;
