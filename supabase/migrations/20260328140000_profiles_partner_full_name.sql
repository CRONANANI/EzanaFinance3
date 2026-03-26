-- Partner / creator recognition + searchable display name + PostgREST schema refresh
-- Safe to re-run

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS is_partner BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_type TEXT,
  ADD COLUMN IF NOT EXISTS partner_verified_at TIMESTAMPTZ;

-- Keep full_name aligned with user_settings.display_name for search (ilike on a real column)
UPDATE public.profiles
SET full_name = NULLIF(trim(COALESCE(user_settings->>'display_name', '')), '')
WHERE full_name IS NULL OR trim(COALESCE(full_name, '')) = '';

CREATE INDEX IF NOT EXISTS idx_profiles_full_name_lower ON public.profiles (lower(full_name));

NOTIFY pgrst, 'reload schema';
