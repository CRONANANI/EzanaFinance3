-- ML personalization tables + index helpers (idempotent where possible)

-- User segments
CREATE TABLE IF NOT EXISTS public.user_segments (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  persona TEXT NOT NULL DEFAULT 'casual_tracker',
  persona_confidence REAL DEFAULT 0.5,
  cluster_id INTEGER,
  segment_features JSONB DEFAULT '{}'::jsonb,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method TEXT DEFAULT 'heuristic'
);
ALTER TABLE public.user_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own segment" ON public.user_segments;
CREATE POLICY "users read own segment" ON public.user_segments FOR SELECT USING (auth.uid() = user_id);

-- Content rankings
CREATE TABLE IF NOT EXISTS public.ml_content_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  relevance_score REAL NOT NULL DEFAULT 0,
  ranking_features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ml_rankings_user_type
  ON public.ml_content_rankings(user_id, content_type, created_at DESC);
ALTER TABLE public.ml_content_rankings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own rankings" ON public.ml_content_rankings;
CREATE POLICY "users read own rankings" ON public.ml_content_rankings
  FOR SELECT USING (auth.uid() = user_id);

-- Similarity cache
CREATE TABLE IF NOT EXISTS public.user_similarity_cache (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  similar_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  similarity_score REAL NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, similar_user_id)
);
CREATE INDEX IF NOT EXISTS idx_similarity_user ON public.user_similarity_cache(user_id, similarity_score DESC);
ALTER TABLE public.user_similarity_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own similarities" ON public.user_similarity_cache;
CREATE POLICY "users read own similarities" ON public.user_similarity_cache
  FOR SELECT USING (auth.uid() = user_id);

-- Model registry (service-role only; no RLS = deny client by default in many setups — enable RLS no policies)
CREATE TABLE IF NOT EXISTS public.ml_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  version INTEGER NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'staging',
  trained_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sample_count INTEGER,
  UNIQUE(model_name, version)
);
ALTER TABLE public.ml_model_registry ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_breadcrumbs_user_created
  ON public.activity_breadcrumbs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_event_type
  ON public.activity_breadcrumbs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_read
  ON public.user_notifications(user_id, type, read, created_at DESC);
