-- ═══════════════════════════════════════════════════════════════════
-- Targeted Notification System — user profiles + activity tracking
-- ═══════════════════════════════════════════════════════════════════

-- User interest profiles: computed aggregate of all behavioral signals
CREATE TABLE IF NOT EXISTS public.user_interest_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  sector_scores JSONB DEFAULT '{}'::jsonb,
  ticker_scores JSONB DEFAULT '{}'::jsonb,

  risk_score INTEGER DEFAULT 50,
  risk_category TEXT DEFAULT 'Moderate',

  feature_scores JSONB DEFAULT '{}'::jsonb,
  topic_scores JSONB DEFAULT '{}'::jsonb,

  notification_prefs JSONB DEFAULT '{
    "earnings_alerts": true,
    "macro_events": true,
    "watchlist_movers": true,
    "portfolio_alerts": true,
    "sector_shifts": true,
    "congressional_trades": true,
    "price_targets": true,
    "breaking_news": true,
    "weekly_digest": true,
    "min_severity": "noteworthy"
  }'::jsonb,

  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  total_breadcrumbs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity breadcrumbs: raw behavioral events (last 30 days, pruned by cron)
CREATE TABLE IF NOT EXISTS public.activity_breadcrumbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breadcrumbs_user ON public.activity_breadcrumbs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_type ON public.activity_breadcrumbs(event_type, created_at DESC);

-- Notification delivery log (prevents duplicate sends for the same event)
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_fingerprint TEXT NOT NULL,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_delivery_log_user ON public.notification_delivery_log(user_id, delivered_at DESC);

-- RLS
ALTER TABLE public.user_interest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_breadcrumbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own profiles" ON public.user_interest_profiles;
CREATE POLICY "users own profiles" ON public.user_interest_profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users own breadcrumbs" ON public.activity_breadcrumbs;
CREATE POLICY "users own breadcrumbs" ON public.activity_breadcrumbs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users own delivery log" ON public.notification_delivery_log;
CREATE POLICY "users own delivery log" ON public.notification_delivery_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Auto-prune breadcrumbs older than 30 days (call from cron)
CREATE OR REPLACE FUNCTION public.prune_old_breadcrumbs() RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.activity_breadcrumbs WHERE created_at < NOW() - INTERVAL '30 days';
$$;
