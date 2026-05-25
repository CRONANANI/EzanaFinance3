-- Echo public CTA system: saved articles, newsletter, anonymous tracking, sentiment

CREATE TABLE IF NOT EXISTS public.echo_saved_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tags JSONB DEFAULT '[]'::jsonb,
  keyword_click_count INT DEFAULT 0,
  UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_echo_saved_user ON public.echo_saved_articles(user_id);

ALTER TABLE public.echo_saved_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own saves" ON public.echo_saved_articles;
CREATE POLICY "Users see own saves" ON public.echo_saved_articles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own saves" ON public.echo_saved_articles;
CREATE POLICY "Users manage own saves" ON public.echo_saved_articles
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  topics JSONB DEFAULT '[]'::jsonb,
  confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.anonymous_breadcrumbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_breadcrumbs_anon ON public.anonymous_breadcrumbs(anon_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.echo_article_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  sentiment INT NOT NULL CHECK (sentiment >= 0 AND sentiment <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_echo_sentiment_article ON public.echo_article_sentiment(article_id);

ALTER TABLE public.echo_article_sentiment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own sentiment" ON public.echo_article_sentiment;
CREATE POLICY "Users manage own sentiment" ON public.echo_article_sentiment
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone reads sentiment aggregate" ON public.echo_article_sentiment;
CREATE POLICY "Anyone reads sentiment aggregate" ON public.echo_article_sentiment
  FOR SELECT USING (true);
