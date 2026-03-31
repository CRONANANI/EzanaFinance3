-- Ensure organizations are readable for domain lookup (anon + authenticated).
-- Replaces narrower policies if present; app still filters by is_active where needed.

DROP POLICY IF EXISTS "Anyone can read active organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org members read own org" ON public.organizations;
DROP POLICY IF EXISTS "Anyone can read organizations" ON public.organizations;

CREATE POLICY "Anyone can read organizations"
  ON public.organizations
  FOR SELECT
  USING (true);
