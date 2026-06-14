-- Multi-tenant university support: multiple login domains + per-org brand colors.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS email_domains TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#059669',
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#d4a853',
  ADD COLUMN IF NOT EXISTS fund_display_name TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT;

-- Backfill email_domains from the existing single email_domain so nothing breaks.
UPDATE public.organizations
  SET email_domains = ARRAY[email_domain]
  WHERE (email_domains IS NULL OR array_length(email_domains, 1) IS NULL)
    AND email_domain IS NOT NULL;

-- GIN index for fast domain membership lookup.
CREATE INDEX IF NOT EXISTS idx_org_email_domains ON public.organizations USING GIN (email_domains);

NOTIFY pgrst, 'reload schema';
