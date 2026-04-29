-- ════════════════════════════════════════════════════════════════════════════
-- ELO Ranking System — Foundational Schema
--
-- This migration creates the core tables for a platform-wide skill rating that
-- moves both directions based on:
--   - Course completions (Pillar A — Sprint 2)
--   - Portfolio performance (Pillar B — Sprint 4)
--   - Social influence / copy requests (Pillar C — Sprint 3)
--   - Competition results (Sprint 5)
--   - Inactivity decay (Sprint 5)
--
-- Cap: 0 to 10,000 (floor protects new users; cap maintains scarcity).
-- Tier mapping: Novice → Apprentice → Strategist → Tactician → Master → Grandmaster
--
-- Parallel to but distinct from the existing XP system (xp_transactions /
-- user_rewards). XP is engagement; ELO is skill-adjusted performance.
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. user_elo: one row per user, holds current rating + tier
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_elo (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_rating INTEGER NOT NULL DEFAULT 0
    CHECK (current_rating >= 0 AND current_rating <= 10000),
  peak_rating INTEGER NOT NULL DEFAULT 0
    CHECK (peak_rating >= 0 AND peak_rating <= 10000),
  tier TEXT NOT NULL DEFAULT 'novice'
    CHECK (tier IN ('novice','apprentice','strategist','tactician','master','grandmaster')),
  last_decay_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ,  -- updated by Sprint 2 hooks; null = never traded/posted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_elo_rating
  ON public.user_elo (current_rating DESC);

CREATE INDEX IF NOT EXISTS idx_user_elo_tier
  ON public.user_elo (tier);

COMMENT ON TABLE public.user_elo IS
  'Platform-wide skill rating per user. Distinct from XP (which is engagement-driven).';
COMMENT ON COLUMN public.user_elo.current_rating IS
  'Current ELO. Floor at 0, cap at 10000. Driven by elo_transactions deltas.';
COMMENT ON COLUMN public.user_elo.peak_rating IS
  'Highest rating ever achieved — for "peak" leaderboards. Never decreases.';
COMMENT ON COLUMN public.user_elo.last_decay_check IS
  'Last time the decay job examined this user. Used to avoid double-applying decay.';
COMMENT ON COLUMN public.user_elo.last_activity_at IS
  'Last meaningful activity (trade, post, course completion). NULL means inactive — eligible for decay after 90 days from created_at.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. elo_transactions: append-only log of every ELO change with reason
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.elo_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,  -- positive (gain) or negative (penalty)
  reason TEXT NOT NULL,    -- human-readable, e.g. "Completed course: Stocks Basic 1"
  category TEXT NOT NULL
    CHECK (category IN ('learning','activity','portfolio','social','competition','decay','admin')),
  metadata JSONB DEFAULT '{}'::jsonb,  -- e.g. {"course_id": "stocks-basic-1", "tier": "bronze"}
  rating_before INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elo_transactions_user_recent
  ON public.elo_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_elo_transactions_category
  ON public.elo_transactions (category, created_at DESC);

COMMENT ON TABLE public.elo_transactions IS
  'Append-only audit log of every ELO change. Lets users see "why did my rating change" and lets admin reverse fraudulent awards if needed.';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. RLS Policies
--   - Users can READ their own elo + transactions
--   - All users can READ public leaderboard fields (current_rating, tier)
--   - Only service role can INSERT/UPDATE
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_elo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elo_transactions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read user_elo (for public leaderboards / profiles)
DROP POLICY IF EXISTS "user_elo readable by all authenticated" ON public.user_elo;
CREATE POLICY "user_elo readable by all authenticated"
  ON public.user_elo
  FOR SELECT
  TO authenticated
  USING (true);

-- Only the user can read their own transaction history (privacy: don't show other users' decay penalties)
DROP POLICY IF EXISTS "elo_transactions readable by owner" ON public.elo_transactions;
CREATE POLICY "elo_transactions readable by owner"
  ON public.elo_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No client-side INSERT or UPDATE on either table. Service role only.

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Seed user_elo rows for ALL existing users (backfill prep)
--   - Sprint 1 only creates the row at 0/novice
--   - Sprint 2 backfills ELO from existing course_completion records
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.user_elo (user_id, current_rating, peak_rating, tier)
SELECT id, 0, 0, 'novice'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Auto-create user_elo row when a new user signs up
--   - Trigger on auth.users insert (existing pattern: profiles is created similarly)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_elo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_elo (user_id, current_rating, peak_rating, tier)
  VALUES (NEW.id, 0, 0, 'novice')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_elo ON auth.users;
CREATE TRIGGER on_auth_user_created_elo
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user_elo();
