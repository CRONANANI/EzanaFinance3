-- ═══════════════════════════════════════════════════════════════════════
-- ECHO ARTICLE ARCHIVE — admin-controlled state layered on read-only articles
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.echo_article_status (
  article_id TEXT PRIMARY KEY,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_by_email TEXT,
  republished_at TIMESTAMPTZ,
  republished_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  republished_by_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_echo_article_status_archived
  ON public.echo_article_status(is_archived, archived_at DESC);

ALTER TABLE public.echo_article_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read echo_article_status"
  ON public.echo_article_status FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "service role write echo_article_status"
  ON public.echo_article_status FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_echo_article_status_updated ON public.echo_article_status;
CREATE TRIGGER trg_echo_article_status_updated
  BEFORE UPDATE ON public.echo_article_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
