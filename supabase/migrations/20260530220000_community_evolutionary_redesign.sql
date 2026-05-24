-- Community Evolutionary redesign — pulse, narratives, events, watches

CREATE TABLE IF NOT EXISTS public.community_pulse_snapshots (
  id BIGSERIAL PRIMARY KEY,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  net_sentiment INTEGER NOT NULL,
  posts_last_hour INTEGER NOT NULL DEFAULT 0,
  active_investors INTEGER NOT NULL DEFAULT 0,
  discussions_started INTEGER NOT NULL DEFAULT 0,
  hottest_ticker TEXT,
  hottest_mentions INTEGER DEFAULT 0,
  sectors JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pulse_recent ON public.community_pulse_snapshots(computed_at DESC);

ALTER TABLE public.community_pulse_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read pulse" ON public.community_pulse_snapshots;
CREATE POLICY "anyone can read pulse"
  ON public.community_pulse_snapshots FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.community_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  description TEXT,
  strength INTEGER NOT NULL DEFAULT 50 CHECK (strength >= 0 AND strength <= 100),
  direction TEXT NOT NULL DEFAULT 'flat' CHECK (direction IN ('up', 'down', 'flat')),
  delta_pct NUMERIC,
  related_tickers TEXT[] DEFAULT ARRAY[]::TEXT[],
  related_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_narratives_active_strength
  ON public.community_narratives(is_active, strength DESC);

ALTER TABLE public.community_narratives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read narratives" ON public.community_narratives;
CREATE POLICY "anyone can read narratives"
  ON public.community_narratives FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  description TEXT,
  event_at TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('earnings','macro','fed','product','political','crypto','other')),
  heat TEXT NOT NULL DEFAULT 'standard' CHECK (heat IN ('hot', 'standard')),
  watching_count INTEGER NOT NULL DEFAULT 0,
  ticker TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_upcoming ON public.community_events(event_at);

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read events" ON public.community_events;
CREATE POLICY "anyone can read events"
  ON public.community_events FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_event_watches (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

ALTER TABLE public.user_event_watches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own watches" ON public.user_event_watches;
CREATE POLICY "users manage own watches"
  ON public.user_event_watches FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.community_narratives (label, strength, direction, delta_pct, related_tickers)
SELECT * FROM (VALUES
  ('AI capex peak', 84, 'up', 23::numeric, ARRAY['NVDA','MSFT','AMZN']::text[]),
  ('Duration trade', 71, 'up', 12::numeric, ARRAY['TLT','IEF']::text[]),
  ('Energy structural', 58, 'up', 8::numeric, ARRAY['XOM','CVX']::text[]),
  ('China reopen', 42, 'down', -5::numeric, ARRAY['BABA','PDD']::text[]),
  ('Fed dovish pivot', 38, 'down', -9::numeric, ARRAY['SPY','QQQ']::text[])
) AS v(label, strength, direction, delta_pct, related_tickers)
WHERE NOT EXISTS (SELECT 1 FROM public.community_narratives LIMIT 1);

INSERT INTO public.community_events (label, event_at, category, heat, watching_count, ticker)
SELECT * FROM (VALUES
  ('Fed Minutes Release', now() + INTERVAL '1 day', 'fed', 'hot', 412, NULL::text),
  ('NVDA Q3 Earnings', now() + INTERVAL '3 days', 'earnings', 'hot', 1247, 'NVDA'),
  ('CPI Print · 3.2% est.', now() + INTERVAL '4 days', 'macro', 'standard', 234, NULL::text),
  ('TSLA Robotaxi Reveal', now() + INTERVAL '5 days', 'product', 'hot', 892, 'TSLA')
) AS v(label, event_at, category, heat, watching_count, ticker)
WHERE NOT EXISTS (SELECT 1 FROM public.community_events LIMIT 1);
