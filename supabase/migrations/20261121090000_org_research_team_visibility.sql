-- Applied to production 2026-11-15 via Supabase MCP (org_research_team_visibility).
-- Skips itself where the org tables do not exist (the RLS test harness replays
-- migrations onto a stub schema without them).
DO $mig$
BEGIN
  IF to_regclass('public.org_members') IS NULL OR to_regclass('public.org_research_notes') IS NULL THEN
    RETURN;
  END IF;
  EXECUTE $sql$
-- Teams the current user actively belongs to, per council.
CREATE OR REPLACE FUNCTION public.auth_team_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.org_members
   WHERE user_id = auth.uid() AND is_active = true AND team_id IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.auth_team_ids() FROM public;
GRANT EXECUTE ON FUNCTION public.auth_team_ids() TO authenticated;

-- The documents themselves.
DROP POLICY IF EXISTS "members read notes" ON public.org_research_notes;
CREATE POLICY "members read notes" ON public.org_research_notes FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
  AND (
    author_id = auth.uid()
    OR visibility = 'org'
    OR (
      visibility = 'team'
      AND (
        org_id IN (SELECT public.auth_manager_org_ids())
        OR (team_id IS NOT NULL AND team_id IN (SELECT public.auth_team_ids()))
      )
    )
  )
);

-- Versions, files and comments follow the parent document.
DROP POLICY IF EXISTS "read research versions" ON public.org_research_versions;
CREATE POLICY "read research versions" ON public.org_research_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.org_research_notes n
     WHERE n.id = note_id
       AND n.org_id IN (SELECT public.auth_org_ids())
       AND (
         n.author_id = auth.uid()
         OR n.visibility = 'org'
         OR (
           n.visibility = 'team'
           AND (
             n.org_id IN (SELECT public.auth_manager_org_ids())
             OR (n.team_id IS NOT NULL AND n.team_id IN (SELECT public.auth_team_ids()))
           )
         )
       )
  )
);

DROP POLICY IF EXISTS "read research attachments" ON public.org_research_attachments;
CREATE POLICY "read research attachments" ON public.org_research_attachments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.org_research_notes n
     WHERE n.id = note_id
       AND n.org_id IN (SELECT public.auth_org_ids())
       AND (
         n.author_id = auth.uid()
         OR n.visibility = 'org'
         OR (
           n.visibility = 'team'
           AND (
             n.org_id IN (SELECT public.auth_manager_org_ids())
             OR (n.team_id IS NOT NULL AND n.team_id IN (SELECT public.auth_team_ids()))
           )
         )
       )
  )
);

DROP POLICY IF EXISTS "read research comments" ON public.org_research_comments;
CREATE POLICY "read research comments" ON public.org_research_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.org_research_notes n
     WHERE n.id = note_id
       AND n.org_id IN (SELECT public.auth_org_ids())
       AND (
         n.author_id = auth.uid()
         OR n.visibility = 'org'
         OR (
           n.visibility = 'team'
           AND (
             n.org_id IN (SELECT public.auth_manager_org_ids())
             OR (n.team_id IS NOT NULL AND n.team_id IN (SELECT public.auth_team_ids()))
           )
         )
       )
  )
);
  $sql$;
END
$mig$;
