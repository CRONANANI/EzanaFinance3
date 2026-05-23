-- ═══════════════════════════════════════════════════════════════════════
-- REDDIT AUTO-POSTER — config + idempotency log
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.reddit_subreddit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  voice_description TEXT,
  flair_id TEXT,
  flair_text TEXT,
  submission_type TEXT NOT NULL DEFAULT 'link',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reddit_post_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL,
  article_title TEXT NOT NULL,
  subreddit TEXT NOT NULL,
  status TEXT NOT NULL,
  reddit_post_id TEXT,
  reddit_post_url TEXT,
  caption TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reddit_post_log_unique_pair UNIQUE (article_id, subreddit)
);

CREATE INDEX IF NOT EXISTS idx_reddit_post_log_article ON public.reddit_post_log(article_id);
CREATE INDEX IF NOT EXISTS idx_reddit_post_log_created ON public.reddit_post_log(created_at DESC);

ALTER TABLE public.reddit_subreddit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reddit_post_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access on reddit_subreddit_config"
  ON public.reddit_subreddit_config FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service role full access on reddit_post_log"
  ON public.reddit_post_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed placeholder subs, ALL inactive — flip is_active=TRUE in the Table Editor
-- when you're ready to post to each one.
INSERT INTO public.reddit_subreddit_config (subreddit, is_active, voice_description, submission_type, notes)
VALUES
  ('investing',         FALSE, 'Mainstream long-term investors. Data-driven, no clickbait. No emojis. Title is a clear statement of what the article shows.',                                'link', 'Strict anti-promo rules.'),
  ('stocks',            FALSE, 'Active retail traders. Slightly casual but still substantive. Lead with the data point.',                                                                    'link', NULL),
  ('SecurityAnalysis',  FALSE, 'Serious deep-dive analysts. Academic tone. Mods reject pure link drops.',                                                                                    'self', 'Self-posts only.'),
  ('finance',           FALSE, 'General finance audience. Professional tone.',                                                                                                                'link', NULL),
  ('wallstreetbets',    FALSE, 'Irreverent retail traders. Punchy. Never use "fundamental analysis", "DCF", or "long-term".',                                                                'link', 'Use sparingly.'),
  ('CryptoCurrency',    FALSE, 'Crypto-focused. Only crypto-relevant articles.',                                                                                                              'link', 'Crypto only.'),
  ('geopolitics',       FALSE, 'Academic geopolitics. Empire/macro articles only.',                                                                                                          'link', NULL)
ON CONFLICT (subreddit) DO NOTHING;
