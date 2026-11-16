-- Applied to production 2026-11-15 via Supabase MCP (org_assignment_assignees_targeted_read).
-- Skips itself where the org tables do not exist (the RLS test harness replays
-- migrations onto a stub schema without them).
DO $mig$
BEGIN
  IF to_regclass('public.org_members') IS NULL OR to_regclass('public.org_assignment_assignees') IS NULL THEN
    RETURN;
  END IF;
  EXECUTE $sql$
-- Let a member read the assignee targets of assignments that target them
-- (member, team, cohort, role or whole council). Managers and the legacy
-- assigned_to are unchanged.
DROP POLICY IF EXISTS "read assignment assignees" ON public.org_assignment_assignees;
CREATE POLICY "read assignment assignees" ON public.org_assignment_assignees FOR SELECT USING (
  org_id IN (SELECT public.auth_manager_org_ids())
  OR EXISTS (
    SELECT 1 FROM public.org_assignments a
    WHERE a.id = assignment_id AND a.assigned_to = auth.uid()
  )
  OR (target_type = 'member' AND target_id IN (SELECT public.auth_member_ids()))
  OR assignment_id IN (SELECT public.auth_targeted_assignment_ids())
);
  $sql$;
END
$mig$;
