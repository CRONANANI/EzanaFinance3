-- Per-university roles with custom permission sets, and many-to-many member↔role
-- assignment with union-of-permissions semantics (Shopify-style).
--
-- org_members.role is UNCHANGED and still holds one of
-- ('executive','portfolio_manager','analyst'). It is now an internal permission
-- TIER consumed by ~214 existing RLS policies. Every org_role maps to a tier via
-- permission_tier; when a member holds several roles, org_members.role is set to
-- their HIGHEST tier so RLS keeps behaving correctly. User-facing role names come
-- from org_roles.name, never from org_members.role.

CREATE TABLE IF NOT EXISTS public.org_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- The university's own role name, exactly as they use it.
  -- e.g. 'Chief Investment Officer', 'Junior Executive', 'Director, Mentorship'
  name TEXT NOT NULL,
  slug TEXT NOT NULL,

  -- Which of the three legal tiers this role maps to. Drives org_members.role
  -- so existing RLS policies continue to work untouched.
  permission_tier TEXT NOT NULL
    CHECK (permission_tier IN ('executive','portfolio_manager','analyst')),

  -- This role's OWN permission set. Union'd across all of a member's roles.
  permissions TEXT[] NOT NULL DEFAULT '{}',

  -- Presentation + grouping.
  category TEXT,          -- 'Advisors' | 'Executives' | 'Investment Council' | 'Management' | …
  rank INT NOT NULL DEFAULT 100,   -- lower = more senior; drives org-chart ordering
  is_advisory BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_org_roles_org ON public.org_roles(org_id);

-- Many-to-many: a member may hold several roles at once.
CREATE TABLE IF NOT EXISTS public.org_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  org_member_id UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  org_role_id UUID NOT NULL REFERENCES public.org_roles(id) ON DELETE CASCADE,

  -- Exactly one primary role per member: the one shown as their headline title
  -- and the one whose reports_to chain they sit in.
  is_primary BOOLEAN NOT NULL DEFAULT false,

  -- Sector/desk context for this specific role assignment, e.g. a PM role held
  -- for 'Natural Resources'. NULL for non-sector roles.
  team_id UUID REFERENCES public.org_teams(id) ON DELETE SET NULL,

  assigned_by UUID REFERENCES public.org_members(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_member_id, org_role_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_org_member_roles_member ON public.org_member_roles(org_member_id);
CREATE INDEX IF NOT EXISTS idx_org_member_roles_role   ON public.org_member_roles(org_role_id);

-- At most one primary role per member.
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_member_roles_one_primary
  ON public.org_member_roles(org_member_id) WHERE is_primary;

-- ── RLS ──
ALTER TABLE public.org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_member_roles ENABLE ROW LEVEL SECURITY;

-- Any active member of the org may READ their org's roles and assignments.
CREATE POLICY org_roles_read ON public.org_roles
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.org_members
               WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY org_member_roles_read ON public.org_member_roles
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.org_members
               WHERE user_id = auth.uid() AND is_active = true)
  );

-- Only executives/PMs may WRITE roles and assignments. Mirrors the existing
-- manager-write pattern used across org tables.
CREATE POLICY org_roles_write ON public.org_roles
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.org_members
               WHERE user_id = auth.uid()
                 AND role IN ('executive','portfolio_manager')
                 AND is_active = true)
  );

CREATE POLICY org_member_roles_write ON public.org_member_roles
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.org_members
               WHERE user_id = auth.uid()
                 AND role IN ('executive','portfolio_manager')
                 AND is_active = true)
  );

COMMENT ON TABLE public.org_roles IS
  'Per-university role definitions with custom permission sets. permission_tier maps each role onto the three legal org_members.role values so existing RLS policies keep working.';
COMMENT ON TABLE public.org_member_roles IS
  'Many-to-many member↔role. A member holding several roles receives the UNION of their permissions.';
COMMENT ON COLUMN public.org_members.role IS
  'INTERNAL permission tier consumed by RLS. Set to the member''s highest tier across org_member_roles. User-facing role names live in org_roles.name.';

-- ── Tier sync trigger ───────────────────────────────────────────────────────
-- Keep org_members.role in lockstep with the member's HIGHEST-precedence role
-- tier: executive > portfolio_manager > analyst. SECURITY DEFINER is required —
-- the trigger writes org_members.role, which a non-manager caller can't update
-- directly under RLS. SET search_path = public hardens the definer function
-- against search-path attacks; do not omit it.
CREATE OR REPLACE FUNCTION public.sync_member_role_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_member UUID := COALESCE(NEW.org_member_id, OLD.org_member_id);
  best TEXT;
BEGIN
  SELECT r.permission_tier INTO best
  FROM public.org_member_roles mr
  JOIN public.org_roles r ON r.id = mr.org_role_id
  WHERE mr.org_member_id = target_member
  ORDER BY CASE r.permission_tier
             WHEN 'executive' THEN 1
             WHEN 'portfolio_manager' THEN 2
             ELSE 3
           END
  LIMIT 1;

  -- No roles left → fall back to analyst (least privilege), never NULL, since
  -- the column is NOT NULL and RLS reads it.
  UPDATE public.org_members
     SET role = COALESCE(best, 'analyst')
   WHERE id = target_member;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_member_role_tier ON public.org_member_roles;
CREATE TRIGGER trg_sync_member_role_tier
AFTER INSERT OR UPDATE OR DELETE ON public.org_member_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_member_role_tier();
