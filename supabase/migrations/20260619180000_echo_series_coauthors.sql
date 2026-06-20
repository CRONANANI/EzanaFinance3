-- Echo: article series (collections) + co-authoring.
--
-- A writer can group articles into an ordered series and credit co-authors on
-- an article. Reads are public; writes go through the API (service role) after
-- ownership/writer checks. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.echo_series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.echo_articles
  ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES public.echo_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_order INTEGER;

CREATE TABLE IF NOT EXISTS public.echo_article_coauthors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES public.echo_articles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_echo_series_owner ON public.echo_series(owner_id);
CREATE INDEX IF NOT EXISTS idx_echo_articles_series ON public.echo_articles(series_id);
CREATE INDEX IF NOT EXISTS idx_echo_coauthors_article ON public.echo_article_coauthors(article_id);
CREATE INDEX IF NOT EXISTS idx_echo_coauthors_user ON public.echo_article_coauthors(user_id);

ALTER TABLE public.echo_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.echo_article_coauthors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'echo_series' AND policyname = 'Anyone can read series') THEN
    CREATE POLICY "Anyone can read series" ON public.echo_series FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'echo_series' AND policyname = 'Owners manage series') THEN
    CREATE POLICY "Owners manage series" ON public.echo_series FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'echo_article_coauthors' AND policyname = 'Anyone can read coauthors') THEN
    CREATE POLICY "Anyone can read coauthors" ON public.echo_article_coauthors FOR SELECT USING (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
