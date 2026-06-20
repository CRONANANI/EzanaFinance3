-- Echo: make article rows able to hold the curated rich-article shape so the
-- reader can be served entirely from the database (no mock module at render
-- time). Adds the structured content fields the editorial catalog uses and
-- relaxes author_id for editorial/system-authored pieces.
-- Safe to re-run.

ALTER TABLE public.echo_articles
  ADD COLUMN IF NOT EXISTS content_blocks JSONB,
  ADD COLUMN IF NOT EXISTS content_paragraphs JSONB,
  ADD COLUMN IF NOT EXISTS hero_image JSONB,
  ADD COLUMN IF NOT EXISTS tags JSONB,
  ADD COLUMN IF NOT EXISTS tickers JSONB,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- Editorial/seeded articles have no platform user as author.
ALTER TABLE public.echo_articles ALTER COLUMN author_id DROP NOT NULL;

COMMENT ON COLUMN public.echo_articles.content_blocks IS 'Structured rich-article blocks (paragraph/heading/stat-grid/chart/quote/callout).';
COMMENT ON COLUMN public.echo_articles.hero_image IS 'Hero image descriptor { src, alt, caption, kind }.';
COMMENT ON COLUMN public.echo_articles.is_featured IS 'Featured on the Echo hub.';

NOTIFY pgrst, 'reload schema';
