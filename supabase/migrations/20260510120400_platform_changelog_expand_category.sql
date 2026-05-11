-- Allow changelog categories used by the public page + v13 seed (design, content, etc.)

ALTER TABLE public.platform_changelog_entries
  DROP CONSTRAINT IF EXISTS platform_changelog_entries_category_check;

ALTER TABLE public.platform_changelog_entries
  ADD CONSTRAINT platform_changelog_entries_category_check
  CHECK (category IN (
    'feature',
    'improvement',
    'fix',
    'announcement',
    'breaking',
    'security',
    'design',
    'performance',
    'data',
    'content'
  ));
