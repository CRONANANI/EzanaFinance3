-- ════════════════════════════════════════════════════════════════════════════
-- Platform Changelog — admin-authored entries visible to all authenticated users
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.platform_changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Title shown in the list (e.g., "Mock trading defaults to portfolio chart")
  title TEXT NOT NULL,
  -- Markdown body — supports basic formatting in renderer
  body TEXT NOT NULL,
  -- Category tag for visual grouping (feature/improvement/fix/announcement)
  category TEXT NOT NULL DEFAULT 'improvement'
    CHECK (category IN ('feature', 'improvement', 'fix', 'announcement', 'breaking')),
  -- Display order (newest first by default; pinned entries jump to top)
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  -- Whether to show on the public changelog. Drafts are hidden.
  is_published BOOLEAN NOT NULL DEFAULT true,
  -- Author email for accountability (NOT shown to public; admin-only metadata)
  author_email TEXT,
  -- The "release date" shown on the entry — defaults to creation date but
  -- admins can backdate entries to match when the change actually shipped
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelog_published_release
  ON public.platform_changelog_entries (is_published, released_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_changelog_pinned
  ON public.platform_changelog_entries (is_pinned, released_at DESC)
  WHERE is_pinned = true;

COMMENT ON TABLE public.platform_changelog_entries IS
  'Public changelog entries visible to all authenticated users; written by admins via /api/admin/changelog';

-- ─────────────────────────────────────────────────────────────────────────
-- RLS: anyone authenticated can READ published entries; writes via service role
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.platform_changelog_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "changelog readable by all when published" ON public.platform_changelog_entries;
CREATE POLICY "changelog readable by all when published"
  ON public.platform_changelog_entries FOR SELECT TO authenticated
  USING (is_published = true);

-- All writes go through the service-role admin endpoint; no policy needed for INSERT/UPDATE/DELETE
-- (service role bypasses RLS)

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger to keep updated_at fresh
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_changelog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_changelog_updated_at ON public.platform_changelog_entries;
CREATE TRIGGER trg_changelog_updated_at
  BEFORE UPDATE ON public.platform_changelog_entries
  FOR EACH ROW EXECUTE PROCEDURE public.set_changelog_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Optional seed: a "welcome" entry so the page isn't empty on first deploy
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.platform_changelog_entries (title, body, category, released_at)
SELECT
  'Welcome to the Platform Changelog',
  'This page tracks all the updates and improvements we''re making to Ezana. New entries are added regularly as we ship features.',
  'announcement',
  NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (
  SELECT 1 FROM public.platform_changelog_entries
  WHERE title = 'Welcome to the Platform Changelog'
);
