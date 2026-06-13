-- Org hierarchy: fine-grained council tiers + role-change audit log.
-- The coarse `role` column ('executive'/'portfolio_manager'/'analyst') stays
-- the source of truth for feature gates everywhere else; it is re-derived
-- from `tier` on every role edit. The three coarse values are themselves
-- valid tiers, so backfilling tier := role is safe.

ALTER TABLE public.org_members
  ADD COLUMN IF NOT EXISTS tier TEXT
  CHECK (tier IS NULL OR tier IN (
    'president','vice_president','executive',
    'senior_portfolio_manager','portfolio_manager',
    'senior_analyst','analyst'
  ));

UPDATE public.org_members SET tier = role WHERE tier IS NULL;

COMMENT ON COLUMN public.org_members.tier IS
  'Council rank ladder: president > vice_president > executive > senior_portfolio_manager > portfolio_manager > senior_analyst > analyst. Drives org-chart display and hierarchical role-edit permissions.';

-- Audit trail for role edits (written via service role from the role API only).
CREATE TABLE IF NOT EXISTS public.org_role_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_member_id UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  changed_by_member_id UUID REFERENCES public.org_members(id) ON DELETE SET NULL,
  old_tier TEXT,
  new_tier TEXT,
  old_role TEXT,
  new_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_role_changes_org
  ON public.org_role_changes(org_id, created_at DESC);

ALTER TABLE public.org_role_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members read role changes" ON public.org_role_changes;
CREATE POLICY "Org members read role changes" ON public.org_role_changes
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

NOTIFY pgrst, 'reload schema';
