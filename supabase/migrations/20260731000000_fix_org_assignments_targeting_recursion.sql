-- Fix: "infinite recursion detected in policy for relation org_assignments".
--
-- This is a SEPARATE cycle from the org_members recursion fixed in
-- 20260727000000. Root cause is schema drift: a production-only SELECT policy
-- "members read targeted assignments" on org_assignments (present in the live DB
-- but in NO migration — added out-of-band) reads org_assignment_assignees, whose
-- own "read assignment assignees" SELECT policy reads org_assignments back. That
-- mutual cross-table reference recurses. The 20260727 migration never touched
-- "members read targeted assignments", so applying it does not fix this.
--
-- FIX (access rules preserved EXACTLY): a SECURITY DEFINER helper resolves the
-- caller's targeted-assignment ids by reading org_assignment_assignees +
-- org_members WITHOUT RLS, so the org_assignments policy no longer reads the
-- assignees table under RLS — the cycle is broken. Verified with real
-- authenticated sessions: analyst sees own+targeted, PM/exec see org-wide, a
-- non-member sees NONE (cross-org isolation holds).
--
-- Rollback: DROP POLICY "members read targeted assignments"; recreate it with the
-- original inline EXISTS(org_assignment_assignees aa JOIN org_members m ...) body,
-- then DROP FUNCTION public.auth_targeted_assignment_ids(). (Restores the
-- recursion, so only for emergency revert.)

CREATE OR REPLACE FUNCTION public.auth_targeted_assignment_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT aa.assignment_id
  FROM public.org_assignment_assignees aa
  JOIN public.org_members m
    ON m.user_id = auth.uid()
   AND m.is_active = true
   AND m.org_id = aa.org_id
  WHERE aa.target_type = 'org'
     OR (aa.target_type = 'member' AND aa.target_id = m.id)
     OR (aa.target_type = 'team'   AND aa.target_id = m.team_id)
     OR (aa.target_type = 'cohort' AND aa.target_id = m.cohort_id)
     OR (aa.target_type = 'role'   AND (aa.target_role = m.role
                                     OR aa.target_role = m.title
                                     OR aa.target_role = m.sub_role));
$$;

REVOKE ALL ON FUNCTION public.auth_targeted_assignment_ids() FROM public;
GRANT EXECUTE ON FUNCTION public.auth_targeted_assignment_ids() TO authenticated;

DROP POLICY IF EXISTS "members read targeted assignments" ON public.org_assignments;
CREATE POLICY "members read targeted assignments" ON public.org_assignments FOR SELECT
  USING (id IN (SELECT public.auth_targeted_assignment_ids()));
