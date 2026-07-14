-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: "infinite recursion detected in policy for relation ..."
--
-- ROOT CAUSE: the SELECT policy ON public.org_members queried public.org_members
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() ...)
-- The inner SELECT is itself subject to org_members' RLS, so Postgres re-runs the
-- same policy to evaluate it → forever. Every org_* policy that resolves
-- membership via that subquery inherits the cycle; the error surfaces on whatever
-- table you queried (e.g. org_assignments), not the table with the broken policy.
--
-- FIX: SECURITY DEFINER helper functions run as the function owner and are NOT
-- subject to the caller's RLS, which breaks the cycle. They are the standard
-- Supabase remedy and are already used elsewhere in this repo. Access rules are
-- preserved byte-for-byte: the helpers apply exactly the same
-- user_id / is_active / role filters the inline subqueries did.
--
-- This migration ONLY redefines policies and adds functions. Historical
-- migrations are left untouched. A commented rollback is at the bottom.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── SECURITY DEFINER membership helpers ──────────────────────────────────────

-- Orgs the current user actively belongs to.
CREATE OR REPLACE FUNCTION public.auth_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.org_members
   WHERE user_id = auth.uid() AND is_active = true;
$$;

-- Orgs where the current user is a manager (executive / portfolio_manager).
CREATE OR REPLACE FUNCTION public.auth_manager_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.org_members
   WHERE user_id = auth.uid() AND is_active = true
     AND role IN ('executive', 'portfolio_manager');
$$;

-- Orgs where the current user is an executive.
CREATE OR REPLACE FUNCTION public.auth_executive_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.org_members
   WHERE user_id = auth.uid() AND is_active = true
     AND role = 'executive';
$$;

-- The caller's own org_members.id rows (policies that compare member ids).
CREATE OR REPLACE FUNCTION public.auth_member_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.org_members
   WHERE user_id = auth.uid() AND is_active = true;
$$;

REVOKE ALL ON FUNCTION public.auth_org_ids()           FROM public;
REVOKE ALL ON FUNCTION public.auth_manager_org_ids()   FROM public;
REVOKE ALL ON FUNCTION public.auth_executive_org_ids() FROM public;
REVOKE ALL ON FUNCTION public.auth_member_ids()        FROM public;
GRANT EXECUTE ON FUNCTION public.auth_org_ids()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_manager_org_ids()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_executive_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_member_ids()        TO authenticated;

-- ── Redefine every org_* policy that used the recursive membership subquery ──
-- Mechanical, semantics-preserving substitution:
--   (SELECT org_id FROM org_members WHERE user_id=auth.uid() AND is_active)                       -> auth_org_ids()
--   (SELECT org_id FROM org_members WHERE ... role IN ('executive','portfolio_manager') ...)      -> auth_manager_org_ids()
--   (SELECT org_id FROM org_members WHERE ... role = 'executive' ...)                             -> auth_executive_org_ids()
--   (SELECT id     FROM org_members WHERE user_id=auth.uid() AND is_active)                       -> auth_member_ids()

-- [20260330120000_org_login.sql] public.org_members
DROP POLICY IF EXISTS "Org members read members" ON public.org_members;
CREATE POLICY "Org members read members" ON public.org_members
  FOR SELECT USING (
    org_id IN (SELECT public.auth_org_ids())
  );

-- [20260330120000_org_login.sql] public.org_teams
DROP POLICY IF EXISTS "Org members read teams" ON public.org_teams;
CREATE POLICY "Org members read teams" ON public.org_teams
  FOR SELECT USING (
    org_id IN (SELECT public.auth_org_ids())
  );

-- [20260330120000_org_login.sql] public.org_tasks
DROP POLICY IF EXISTS "Managers write tasks" ON public.org_tasks;
CREATE POLICY "Managers write tasks" ON public.org_tasks
  FOR ALL
  USING (
    org_id IN (SELECT public.auth_manager_org_ids())
  )
  WITH CHECK (
    org_id IN (SELECT public.auth_manager_org_ids())
  );

-- [20260330120000_org_login.sql] public.org_events
DROP POLICY IF EXISTS "Members read events" ON public.org_events;
CREATE POLICY "Members read events" ON public.org_events
  FOR SELECT USING (
    org_id IN (SELECT public.auth_org_ids())
  );

-- [20260330120000_org_login.sql] public.org_events
DROP POLICY IF EXISTS "Managers write events" ON public.org_events;
CREATE POLICY "Managers write events" ON public.org_events
  FOR ALL
  USING (
    org_id IN (SELECT public.auth_manager_org_ids())
  )
  WITH CHECK (
    org_id IN (SELECT public.auth_manager_org_ids())
  );

-- [20260330120000_org_login.sql] public.org_learning_content
DROP POLICY IF EXISTS "Members read learning" ON public.org_learning_content;
CREATE POLICY "Members read learning" ON public.org_learning_content
  FOR SELECT USING (
    org_id IN (SELECT public.auth_org_ids())
  );

-- [20260330120000_org_login.sql] public.org_learning_content
DROP POLICY IF EXISTS "Managers write learning" ON public.org_learning_content;
CREATE POLICY "Managers write learning" ON public.org_learning_content
  FOR ALL
  USING (
    org_id IN (SELECT public.auth_manager_org_ids())
  )
  WITH CHECK (
    org_id IN (SELECT public.auth_manager_org_ids())
  );

-- [20260330120000_org_login.sql] public.org_posts
DROP POLICY IF EXISTS "Members read posts" ON public.org_posts;
CREATE POLICY "Members read posts" ON public.org_posts
  FOR SELECT USING (
    org_id IN (SELECT public.auth_org_ids())
  );

-- [20260330120000_org_login.sql] public.org_posts
DROP POLICY IF EXISTS "Members write posts" ON public.org_posts;
CREATE POLICY "Members write posts" ON public.org_posts
  FOR INSERT WITH CHECK (
    org_id IN (SELECT public.auth_org_ids())
    AND author_id = auth.uid()
  );

-- [20260520120000_org_position_flags.sql] public.org_position_flags
DROP POLICY IF EXISTS "members read own flags" ON public.org_position_flags;
CREATE POLICY "members read own flags" ON public.org_position_flags FOR SELECT USING (
  raiser_member_id IN (SELECT public.auth_member_ids())
  OR recipient_member_id IN (SELECT public.auth_member_ids())
);

-- [20260520120000_org_position_flags.sql] public.org_position_flags
DROP POLICY IF EXISTS "members create own flags" ON public.org_position_flags;
CREATE POLICY "members create own flags" ON public.org_position_flags FOR INSERT WITH CHECK (
  raiser_member_id IN (SELECT public.auth_member_ids())
);

-- [20260520120000_org_position_flags.sql] public.org_position_flags
DROP POLICY IF EXISTS "members update flags they are part of" ON public.org_position_flags;
CREATE POLICY "members update flags they are part of" ON public.org_position_flags FOR UPDATE USING (
  raiser_member_id IN (SELECT public.auth_member_ids())
  OR recipient_member_id IN (SELECT public.auth_member_ids())
);

-- [20260520120000_org_position_flags.sql] public.org_flag_attachments
DROP POLICY IF EXISTS "read attachments for visible flags" ON public.org_flag_attachments;
CREATE POLICY "read attachments for visible flags" ON public.org_flag_attachments FOR SELECT USING (
  flag_id IN (
    SELECT id FROM public.org_position_flags
    WHERE raiser_member_id IN (SELECT public.auth_member_ids())
       OR recipient_member_id IN (SELECT public.auth_member_ids())
  )
);

-- [20260520120000_org_position_flags.sql] public.org_flag_attachments
DROP POLICY IF EXISTS "members add attachments to own flags" ON public.org_flag_attachments;
CREATE POLICY "members add attachments to own flags" ON public.org_flag_attachments FOR INSERT WITH CHECK (
  flag_id IN (
    SELECT id FROM public.org_position_flags
    WHERE raiser_member_id IN (SELECT public.auth_member_ids())
  )
);

-- [20260520120000_org_position_flags.sql] public.org_flag_messages
DROP POLICY IF EXISTS "read messages for visible flags" ON public.org_flag_messages;
CREATE POLICY "read messages for visible flags" ON public.org_flag_messages FOR SELECT USING (
  flag_id IN (
    SELECT id FROM public.org_position_flags
    WHERE raiser_member_id IN (SELECT public.auth_member_ids())
       OR recipient_member_id IN (SELECT public.auth_member_ids())
  )
);

-- [20260520120000_org_position_flags.sql] public.org_flag_messages
DROP POLICY IF EXISTS "members post messages on visible flags" ON public.org_flag_messages;
CREATE POLICY "members post messages on visible flags" ON public.org_flag_messages FOR INSERT WITH CHECK (
  author_member_id IN (SELECT public.auth_member_ids())
  AND flag_id IN (
    SELECT id FROM public.org_position_flags
    WHERE raiser_member_id IN (SELECT public.auth_member_ids())
       OR recipient_member_id IN (SELECT public.auth_member_ids())
  )
);

-- [20260520120000_org_position_flags.sql] public.org_member_permissions
DROP POLICY IF EXISTS "members read own permission overrides" ON public.org_member_permissions;
CREATE POLICY "members read own permission overrides" ON public.org_member_permissions FOR SELECT USING (
  org_member_id IN (SELECT public.auth_member_ids())
);

-- [20260522120000_org_messaging_and_notifications.sql] public.org_direct_messages
DROP POLICY IF EXISTS "members read own dms" ON public.org_direct_messages;
CREATE POLICY "members read own dms" ON public.org_direct_messages FOR SELECT USING (
  sender_member_id IN (SELECT public.auth_member_ids())
  OR recipient_member_id IN (SELECT public.auth_member_ids())
);

-- [20260522120000_org_messaging_and_notifications.sql] public.org_direct_messages
DROP POLICY IF EXISTS "members update own received dms" ON public.org_direct_messages;
CREATE POLICY "members update own received dms" ON public.org_direct_messages FOR UPDATE USING (
  recipient_member_id IN (SELECT public.auth_member_ids())
);

-- [20260522120000_org_messaging_and_notifications.sql] public.org_notification_preferences
DROP POLICY IF EXISTS "members read own notif prefs" ON public.org_notification_preferences;
CREATE POLICY "members read own notif prefs" ON public.org_notification_preferences FOR SELECT USING (
  org_member_id IN (SELECT public.auth_member_ids())
);

-- [20260522120000_org_messaging_and_notifications.sql] public.org_notification_preferences
DROP POLICY IF EXISTS "members insert own notif prefs" ON public.org_notification_preferences;
CREATE POLICY "members insert own notif prefs" ON public.org_notification_preferences FOR INSERT WITH CHECK (
  org_member_id IN (SELECT public.auth_member_ids())
);

-- [20260522120000_org_messaging_and_notifications.sql] public.org_notification_preferences
DROP POLICY IF EXISTS "members update own notif prefs" ON public.org_notification_preferences;
CREATE POLICY "members update own notif prefs" ON public.org_notification_preferences FOR UPDATE USING (
  org_member_id IN (SELECT public.auth_member_ids())
);

-- [20260603000000_org_pitch_pipeline.sql] public.org_pitches
DROP POLICY IF EXISTS "org members read pitches" ON public.org_pitches;
CREATE POLICY "org members read pitches" ON public.org_pitches FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
);

-- [20260603000000_org_pitch_pipeline.sql] public.org_pitch_stage_history
DROP POLICY IF EXISTS "org members read pitch history" ON public.org_pitch_stage_history;
CREATE POLICY "org members read pitch history" ON public.org_pitch_stage_history FOR SELECT USING (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT public.auth_org_ids())
  )
);

-- [20260603000000_org_pitch_pipeline.sql] public.org_pitch_deliverables
DROP POLICY IF EXISTS "org members read deliverables" ON public.org_pitch_deliverables;
CREATE POLICY "org members read deliverables" ON public.org_pitch_deliverables FOR SELECT USING (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT public.auth_org_ids())
  )
);

-- [20260603000000_org_pitch_pipeline.sql] public.org_pitch_votes
DROP POLICY IF EXISTS "org members read votes" ON public.org_pitch_votes;
CREATE POLICY "org members read votes" ON public.org_pitch_votes FOR SELECT USING (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT public.auth_org_ids())
  )
);

-- [20260603000000_org_pitch_pipeline.sql] public.org_pitch_discussion_messages
DROP POLICY IF EXISTS "org members read discussion" ON public.org_pitch_discussion_messages;
CREATE POLICY "org members read discussion" ON public.org_pitch_discussion_messages FOR SELECT USING (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT public.auth_org_ids())
  )
);

-- [20260603000000_org_pitch_pipeline.sql] public.org_pitch_hindsight
DROP POLICY IF EXISTS "org members read hindsight" ON public.org_pitch_hindsight;
CREATE POLICY "org members read hindsight" ON public.org_pitch_hindsight FOR SELECT USING (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT public.auth_org_ids())
  )
);

-- [20260603100000_org_pitch_write_policies.sql] public.org_pitches
DROP POLICY IF EXISTS "members insert pitches" ON public.org_pitches;
CREATE POLICY "members insert pitches" ON public.org_pitches FOR INSERT WITH CHECK (
  org_id IN (SELECT public.auth_org_ids())
  AND analyst_member_id IN (SELECT public.auth_member_ids())
);

-- [20260603100000_org_pitch_write_policies.sql] public.org_pitches
DROP POLICY IF EXISTS "members update pitches in org" ON public.org_pitches;
CREATE POLICY "members update pitches in org" ON public.org_pitches FOR UPDATE USING (
  org_id IN (SELECT public.auth_org_ids())
);

-- [20260603100000_org_pitch_write_policies.sql] public.org_pitch_stage_history
DROP POLICY IF EXISTS "members insert pitch history" ON public.org_pitch_stage_history;
CREATE POLICY "members insert pitch history" ON public.org_pitch_stage_history FOR INSERT WITH CHECK (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT public.auth_org_ids())
  )
);

-- [20260603100000_org_pitch_write_policies.sql] public.org_pitch_deliverables
DROP POLICY IF EXISTS "members insert deliverables" ON public.org_pitch_deliverables;
CREATE POLICY "members insert deliverables" ON public.org_pitch_deliverables FOR INSERT WITH CHECK (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT public.auth_org_ids())
  )
);

-- [20260603100000_org_pitch_write_policies.sql] public.org_pitch_votes
DROP POLICY IF EXISTS "members insert votes" ON public.org_pitch_votes;
CREATE POLICY "members insert votes" ON public.org_pitch_votes FOR INSERT WITH CHECK (
  voter_member_id IN (SELECT public.auth_member_ids())
);

-- [20260603100000_org_pitch_write_policies.sql] public.org_pitch_discussion_messages
DROP POLICY IF EXISTS "members insert discussion" ON public.org_pitch_discussion_messages;
CREATE POLICY "members insert discussion" ON public.org_pitch_discussion_messages FOR INSERT WITH CHECK (
  author_member_id IN (SELECT public.auth_member_ids())
);

-- [20260620000000_org_chart_backbone.sql] public.org_sector_coverage
DROP POLICY IF EXISTS "members read sector coverage" ON public.org_sector_coverage;
CREATE POLICY "members read sector coverage" ON public.org_sector_coverage
  FOR SELECT USING (
    org_id IN (SELECT public.auth_org_ids())
  );

-- [20260620000000_org_chart_backbone.sql] public.org_sector_coverage
DROP POLICY IF EXISTS "managers write sector coverage" ON public.org_sector_coverage;
CREATE POLICY "managers write sector coverage" ON public.org_sector_coverage
  FOR ALL USING (
    org_id IN (SELECT public.auth_manager_org_ids())
  ) WITH CHECK (
    org_id IN (SELECT public.auth_manager_org_ids())
  );

-- [20260620000000_org_chart_backbone.sql] public.org_advisor_oversight
DROP POLICY IF EXISTS "members read advisor oversight" ON public.org_advisor_oversight;
CREATE POLICY "members read advisor oversight" ON public.org_advisor_oversight
  FOR SELECT USING (
    org_id IN (SELECT public.auth_org_ids())
  );

-- [20260620000000_org_chart_backbone.sql] public.org_advisor_oversight
DROP POLICY IF EXISTS "executives write advisor oversight" ON public.org_advisor_oversight;
CREATE POLICY "executives write advisor oversight" ON public.org_advisor_oversight
  FOR ALL USING (
    org_id IN (SELECT public.auth_executive_org_ids())
  ) WITH CHECK (
    org_id IN (SELECT public.auth_executive_org_ids())
  );

-- [20260620000000_org_chart_backbone.sql] public.org_members
DROP POLICY IF EXISTS "managers update org members" ON public.org_members;
CREATE POLICY "managers update org members" ON public.org_members
  FOR UPDATE USING (
    org_id IN (SELECT public.auth_manager_org_ids())
  ) WITH CHECK (
    org_id IN (SELECT public.auth_manager_org_ids())
  );

-- [20260621000000_org_social_hub.sql] public.org_research_notes
DROP POLICY IF EXISTS "members read notes" ON public.org_research_notes;
CREATE POLICY "members read notes" ON public.org_research_notes FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
  AND (visibility <> 'private' OR author_id = auth.uid())
);

-- [20260621000000_org_social_hub.sql] public.org_research_notes
DROP POLICY IF EXISTS "members write own notes" ON public.org_research_notes;
CREATE POLICY "members write own notes" ON public.org_research_notes FOR ALL USING (
  author_id = auth.uid()
  AND org_id IN (SELECT public.auth_org_ids())
) WITH CHECK (
  author_id = auth.uid()
  AND org_id IN (SELECT public.auth_org_ids())
);

-- [20260621000000_org_social_hub.sql] public.org_research_notes
DROP POLICY IF EXISTS "managers moderate notes" ON public.org_research_notes;
CREATE POLICY "managers moderate notes" ON public.org_research_notes FOR UPDATE USING (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260621000000_org_social_hub.sql] public.org_research_notes
DROP POLICY IF EXISTS "managers delete notes" ON public.org_research_notes;
CREATE POLICY "managers delete notes" ON public.org_research_notes FOR DELETE USING (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260621000000_org_social_hub.sql] public.org_position_threads
DROP POLICY IF EXISTS "members read threads" ON public.org_position_threads;
CREATE POLICY "members read threads" ON public.org_position_threads FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260621000000_org_social_hub.sql] public.org_position_threads
DROP POLICY IF EXISTS "members write own threads" ON public.org_position_threads;
CREATE POLICY "members write own threads" ON public.org_position_threads FOR INSERT WITH CHECK (
  author_id = auth.uid() AND org_id IN (SELECT public.auth_org_ids()));

-- [20260621000000_org_social_hub.sql] public.org_reactions
DROP POLICY IF EXISTS "members read reactions" ON public.org_reactions;
CREATE POLICY "members read reactions" ON public.org_reactions FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260621000000_org_social_hub.sql] public.org_mentions
DROP POLICY IF EXISTS "members create mentions" ON public.org_mentions;
CREATE POLICY "members create mentions" ON public.org_mentions FOR INSERT WITH CHECK (
  author_id = auth.uid() AND org_id IN (SELECT public.auth_org_ids()));

-- [20260621000000_org_social_hub.sql] public.org_recognition
DROP POLICY IF EXISTS "members read recognition" ON public.org_recognition;
CREATE POLICY "members read recognition" ON public.org_recognition FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260621000000_org_social_hub.sql] public.org_recognition
DROP POLICY IF EXISTS "managers award recognition" ON public.org_recognition;
CREATE POLICY "managers award recognition" ON public.org_recognition FOR INSERT WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids()));

-- [20260621000000_org_social_hub.sql] public.org_meetings
DROP POLICY IF EXISTS "members read meetings" ON public.org_meetings;
CREATE POLICY "members read meetings" ON public.org_meetings FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260621000000_org_social_hub.sql] public.org_meetings
DROP POLICY IF EXISTS "managers run meetings" ON public.org_meetings;
CREATE POLICY "managers run meetings" ON public.org_meetings FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids()));

-- [20260622000000_org_academic.sql] public.org_cohorts
DROP POLICY IF EXISTS "members read cohorts" ON public.org_cohorts;
CREATE POLICY "members read cohorts" ON public.org_cohorts FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260622000000_org_academic.sql] public.org_cohorts
DROP POLICY IF EXISTS "executives write cohorts" ON public.org_cohorts;
CREATE POLICY "executives write cohorts" ON public.org_cohorts FOR ALL USING (
  org_id IN (SELECT public.auth_executive_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_executive_org_ids()));

-- [20260622000000_org_academic.sql] public.org_grades
DROP POLICY IF EXISTS "students read own grades" ON public.org_grades;
CREATE POLICY "students read own grades" ON public.org_grades FOR SELECT USING (
  student_id = auth.uid()
  OR org_id IN (SELECT public.auth_executive_org_ids()));

-- [20260622000000_org_academic.sql] public.org_grades
DROP POLICY IF EXISTS "advisors write grades" ON public.org_grades;
CREATE POLICY "advisors write grades" ON public.org_grades FOR ALL USING (
  org_id IN (SELECT public.auth_executive_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_executive_org_ids()));

-- [20260622000000_org_academic.sql] public.org_assignments
DROP POLICY IF EXISTS "members read own assignments" ON public.org_assignments;
CREATE POLICY "members read own assignments" ON public.org_assignments FOR SELECT USING (
  assigned_to = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids()));

-- [20260622000000_org_academic.sql] public.org_assignments
DROP POLICY IF EXISTS "managers write assignments" ON public.org_assignments;
CREATE POLICY "managers write assignments" ON public.org_assignments FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids()));

-- [20260622000000_org_academic.sql] public.competition_org_entries
DROP POLICY IF EXISTS "members read comp entries" ON public.competition_org_entries;
CREATE POLICY "members read comp entries" ON public.competition_org_entries FOR SELECT USING (
  competition_id IN (
    SELECT competition_id FROM public.competition_org_entries e2
    WHERE e2.org_id IN (SELECT public.auth_org_ids())
  ));

-- [20260622000000_org_academic.sql] public.competition_org_entries
DROP POLICY IF EXISTS "managers manage comp entries" ON public.competition_org_entries;
CREATE POLICY "managers manage comp entries" ON public.competition_org_entries FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids()));

-- [20260622000000_org_academic.sql] public.org_ips_rules
DROP POLICY IF EXISTS "members read ips rules" ON public.org_ips_rules;
CREATE POLICY "members read ips rules" ON public.org_ips_rules FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260622000000_org_academic.sql] public.org_ips_rules
DROP POLICY IF EXISTS "executives write ips rules" ON public.org_ips_rules;
CREATE POLICY "executives write ips rules" ON public.org_ips_rules FOR ALL USING (
  org_id IN (SELECT public.auth_executive_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_executive_org_ids()));

-- [20260622000000_org_academic.sql] public.org_ips_violations
DROP POLICY IF EXISTS "members read violations" ON public.org_ips_violations;
CREATE POLICY "members read violations" ON public.org_ips_violations FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260622000000_org_academic.sql] public.org_ips_violations
DROP POLICY IF EXISTS "managers resolve violations" ON public.org_ips_violations;
CREATE POLICY "managers resolve violations" ON public.org_ips_violations FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids()));

-- [20260622000000_org_academic.sql] public.org_ips_violations
DROP POLICY IF EXISTS "members log violations" ON public.org_ips_violations;
CREATE POLICY "members log violations" ON public.org_ips_violations FOR INSERT WITH CHECK (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260623000000_org_analytics.sql] public.org_fund_snapshots
DROP POLICY IF EXISTS "members read fund snapshots" ON public.org_fund_snapshots;
CREATE POLICY "members read fund snapshots" ON public.org_fund_snapshots FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260623000000_org_analytics.sql] public.org_fund_snapshots
DROP POLICY IF EXISTS "managers write fund snapshots" ON public.org_fund_snapshots;
CREATE POLICY "managers write fund snapshots" ON public.org_fund_snapshots FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids()));

-- [20260623000000_org_analytics.sql] public.org_reports
DROP POLICY IF EXISTS "members read reports" ON public.org_reports;
CREATE POLICY "members read reports" ON public.org_reports FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260623000000_org_analytics.sql] public.org_reports
DROP POLICY IF EXISTS "managers write reports" ON public.org_reports;
CREATE POLICY "managers write reports" ON public.org_reports FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids()));

-- [20260625000000_org_hierarchy_tiers.sql] public.org_role_changes
DROP POLICY IF EXISTS "Org members read role changes" ON public.org_role_changes;
CREATE POLICY "Org members read role changes" ON public.org_role_changes
  FOR SELECT USING (
    org_id IN (SELECT public.auth_org_ids())
  );

-- [20260626000000_org_settings_phase2_invites_fund_config.sql] public.org_invites
DROP POLICY IF EXISTS "execs manage invites" ON public.org_invites;
CREATE POLICY "execs manage invites" ON public.org_invites FOR ALL USING (
  org_id IN (SELECT public.auth_executive_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_executive_org_ids())
);

-- [20260626000000_org_settings_phase2_invites_fund_config.sql] public.org_fund_config
DROP POLICY IF EXISTS "members read fund config" ON public.org_fund_config;
CREATE POLICY "members read fund config" ON public.org_fund_config FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
);

-- [20260626000000_org_settings_phase2_invites_fund_config.sql] public.org_fund_config
DROP POLICY IF EXISTS "execs write fund config" ON public.org_fund_config;
CREATE POLICY "execs write fund config" ON public.org_fund_config FOR ALL USING (
  org_id IN (SELECT public.auth_executive_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_executive_org_ids())
);

-- [20260627000000_org_settings_phase3_audit_governance.sql] public.org_audit_log
DROP POLICY IF EXISTS "executives read audit" ON public.org_audit_log;
CREATE POLICY "executives read audit" ON public.org_audit_log FOR SELECT USING (
  org_id IN (SELECT public.auth_executive_org_ids())
);

-- [20260627000000_org_settings_phase3_audit_governance.sql] public.org_governance_settings
DROP POLICY IF EXISTS "members read governance" ON public.org_governance_settings;
CREATE POLICY "members read governance" ON public.org_governance_settings FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
);

-- [20260720000000_org_assignments_2a.sql] public.org_assignment_assignees
DROP POLICY IF EXISTS "read assignment assignees" ON public.org_assignment_assignees;
CREATE POLICY "read assignment assignees" ON public.org_assignment_assignees FOR SELECT USING (
  org_id IN (SELECT public.auth_manager_org_ids())
  OR EXISTS (SELECT 1 FROM public.org_assignments a WHERE a.id = assignment_id AND a.assigned_to = auth.uid())
  OR (target_type = 'member' AND target_id IN (SELECT public.auth_member_ids()))
);

-- [20260720000000_org_assignments_2a.sql] public.org_assignment_assignees
DROP POLICY IF EXISTS "managers write assignment assignees" ON public.org_assignment_assignees;
CREATE POLICY "managers write assignment assignees" ON public.org_assignment_assignees FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260720000000_org_assignments_2a.sql] public.org_assignment_submissions
DROP POLICY IF EXISTS "read assignment submissions" ON public.org_assignment_submissions;
CREATE POLICY "read assignment submissions" ON public.org_assignment_submissions FOR SELECT USING (
  org_id IN (SELECT public.auth_manager_org_ids())
  OR submitted_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.org_assignments a WHERE a.id = assignment_id AND a.assigned_to = auth.uid())
);

-- [20260720000000_org_assignments_2a.sql] public.org_assignment_submissions
DROP POLICY IF EXISTS "assignee or manager writes submissions" ON public.org_assignment_submissions;
CREATE POLICY "assignee or manager writes submissions" ON public.org_assignment_submissions FOR ALL USING (
  submitted_by = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  submitted_by = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260720000000_org_assignments_2a.sql] public.org_assignment_comments
DROP POLICY IF EXISTS "read assignment comments" ON public.org_assignment_comments;
CREATE POLICY "read assignment comments" ON public.org_assignment_comments FOR SELECT USING (
  org_id IN (SELECT public.auth_manager_org_ids())
  OR author_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.org_assignments a WHERE a.id = assignment_id AND a.assigned_to = auth.uid())
);

-- [20260720000000_org_assignments_2a.sql] public.org_assignment_comments
DROP POLICY IF EXISTS "author or manager writes comments" ON public.org_assignment_comments;
CREATE POLICY "author or manager writes comments" ON public.org_assignment_comments FOR ALL USING (
  author_id = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  author_id = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260720000000_org_assignments_2a.sql] public.org_assignment_attachments
DROP POLICY IF EXISTS "read assignment attachments" ON public.org_assignment_attachments;
CREATE POLICY "read assignment attachments" ON public.org_assignment_attachments FOR SELECT USING (
  org_id IN (SELECT public.auth_manager_org_ids())
  OR uploaded_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.org_assignments a WHERE a.id = assignment_id AND a.assigned_to = auth.uid())
);

-- [20260720000000_org_assignments_2a.sql] public.org_assignment_attachments
DROP POLICY IF EXISTS "uploader or manager writes attachments" ON public.org_assignment_attachments;
CREATE POLICY "uploader or manager writes attachments" ON public.org_assignment_attachments FOR ALL USING (
  uploaded_by = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  uploaded_by = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260720000000_org_assignments_2a.sql] public.org_assignment_templates
DROP POLICY IF EXISTS "members read templates" ON public.org_assignment_templates;
CREATE POLICY "members read templates" ON public.org_assignment_templates FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
);

-- [20260720000000_org_assignments_2a.sql] public.org_assignment_templates
DROP POLICY IF EXISTS "managers write templates" ON public.org_assignment_templates;
CREATE POLICY "managers write templates" ON public.org_assignment_templates FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260721000000_org_pitch_pipeline_2a.sql] public.org_ic_meetings
DROP POLICY IF EXISTS "members read ic meetings" ON public.org_ic_meetings;
CREATE POLICY "members read ic meetings" ON public.org_ic_meetings FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
);

-- [20260721000000_org_pitch_pipeline_2a.sql] public.org_ic_meetings
DROP POLICY IF EXISTS "managers write ic meetings" ON public.org_ic_meetings;
CREATE POLICY "managers write ic meetings" ON public.org_ic_meetings FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260721000000_org_pitch_pipeline_2a.sql] public.org_pitch_templates
DROP POLICY IF EXISTS "members read pitch templates" ON public.org_pitch_templates;
CREATE POLICY "members read pitch templates" ON public.org_pitch_templates FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
);

-- [20260721000000_org_pitch_pipeline_2a.sql] public.org_pitch_templates
DROP POLICY IF EXISTS "managers write pitch templates" ON public.org_pitch_templates;
CREATE POLICY "managers write pitch templates" ON public.org_pitch_templates FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260722000000_org_research_library_2a.sql] public.org_research_versions
DROP POLICY IF EXISTS "read research versions" ON public.org_research_versions;
CREATE POLICY "read research versions" ON public.org_research_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.org_research_notes n WHERE n.id = note_id
          AND n.org_id IN (SELECT public.auth_org_ids())
          AND (n.visibility <> 'private' OR n.author_id = auth.uid())));

-- [20260722000000_org_research_library_2a.sql] public.org_research_versions
DROP POLICY IF EXISTS "write research versions" ON public.org_research_versions;
CREATE POLICY "write research versions" ON public.org_research_versions FOR ALL USING (
  edited_by = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  edited_by = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260722000000_org_research_library_2a.sql] public.org_research_attachments
DROP POLICY IF EXISTS "read research attachments" ON public.org_research_attachments;
CREATE POLICY "read research attachments" ON public.org_research_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.org_research_notes n WHERE n.id = note_id
          AND n.org_id IN (SELECT public.auth_org_ids())
          AND (n.visibility <> 'private' OR n.author_id = auth.uid())));

-- [20260722000000_org_research_library_2a.sql] public.org_research_attachments
DROP POLICY IF EXISTS "write research attachments" ON public.org_research_attachments;
CREATE POLICY "write research attachments" ON public.org_research_attachments FOR ALL USING (
  uploaded_by = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  uploaded_by = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260722000000_org_research_library_2a.sql] public.org_research_comments
DROP POLICY IF EXISTS "read research comments" ON public.org_research_comments;
CREATE POLICY "read research comments" ON public.org_research_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.org_research_notes n WHERE n.id = note_id
          AND n.org_id IN (SELECT public.auth_org_ids())
          AND (n.visibility <> 'private' OR n.author_id = auth.uid())));

-- [20260722000000_org_research_library_2a.sql] public.org_research_comments
DROP POLICY IF EXISTS "write research comments" ON public.org_research_comments;
CREATE POLICY "write research comments" ON public.org_research_comments FOR ALL USING (
  author_id = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  author_id = auth.uid()
  OR org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260722000000_org_research_library_2a.sql] public.org_research_templates
DROP POLICY IF EXISTS "read research templates" ON public.org_research_templates;
CREATE POLICY "read research templates" ON public.org_research_templates FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260722000000_org_research_library_2a.sql] public.org_research_templates
DROP POLICY IF EXISTS "managers write research templates" ON public.org_research_templates;
CREATE POLICY "managers write research templates" ON public.org_research_templates FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260722000000_org_research_library_2a.sql] public.org_research_collections
DROP POLICY IF EXISTS "owner rw collections" ON public.org_research_collections;
CREATE POLICY "owner rw collections" ON public.org_research_collections FOR ALL USING (
  owner_id = auth.uid()
) WITH CHECK (
  owner_id = auth.uid()
  AND org_id IN (SELECT public.auth_org_ids())
);

-- [20260722000000_org_research_library_2a.sql] public.org_coverage_lineage
DROP POLICY IF EXISTS "read coverage lineage" ON public.org_coverage_lineage;
CREATE POLICY "read coverage lineage" ON public.org_coverage_lineage FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260722000000_org_research_library_2a.sql] public.org_coverage_lineage
DROP POLICY IF EXISTS "managers write coverage lineage" ON public.org_coverage_lineage;
CREATE POLICY "managers write coverage lineage" ON public.org_coverage_lineage FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260723000000_org_meetings_2a.sql] public.org_meeting_attendees
DROP POLICY IF EXISTS "read meeting attendees" ON public.org_meeting_attendees;
CREATE POLICY "read meeting attendees" ON public.org_meeting_attendees FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260723000000_org_meetings_2a.sql] public.org_meeting_attendees
DROP POLICY IF EXISTS "write meeting attendees" ON public.org_meeting_attendees;
CREATE POLICY "write meeting attendees" ON public.org_meeting_attendees FOR ALL USING (
  member_id IN (SELECT public.auth_member_ids())
  OR org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  member_id IN (SELECT public.auth_member_ids())
  OR org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260723000000_org_meetings_2a.sql] public.org_meeting_sentiment
DROP POLICY IF EXISTS "read meeting sentiment" ON public.org_meeting_sentiment;
CREATE POLICY "read meeting sentiment" ON public.org_meeting_sentiment FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260723000000_org_meetings_2a.sql] public.org_meeting_sentiment
DROP POLICY IF EXISTS "managers write meeting sentiment" ON public.org_meeting_sentiment;
CREATE POLICY "managers write meeting sentiment" ON public.org_meeting_sentiment FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260723000000_org_meetings_2a.sql] public.org_meeting_deliverables
DROP POLICY IF EXISTS "read meeting deliverables" ON public.org_meeting_deliverables;
CREATE POLICY "read meeting deliverables" ON public.org_meeting_deliverables FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260723000000_org_meetings_2a.sql] public.org_meeting_deliverables
DROP POLICY IF EXISTS "managers write meeting deliverables" ON public.org_meeting_deliverables;
CREATE POLICY "managers write meeting deliverables" ON public.org_meeting_deliverables FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260723000000_org_meetings_2a.sql] public.org_meeting_votes
DROP POLICY IF EXISTS "read meeting votes" ON public.org_meeting_votes;
CREATE POLICY "read meeting votes" ON public.org_meeting_votes FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260723000000_org_meetings_2a.sql] public.org_meeting_votes
DROP POLICY IF EXISTS "cast meeting vote" ON public.org_meeting_votes;
CREATE POLICY "cast meeting vote" ON public.org_meeting_votes FOR ALL USING (
  voter_member_id IN (SELECT public.auth_member_ids())
  OR org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  voter_member_id IN (SELECT public.auth_member_ids())
  OR org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260723000000_org_meetings_2a.sql] public.org_recorder_integrations
DROP POLICY IF EXISTS "managers manage recorders" ON public.org_recorder_integrations;
CREATE POLICY "managers manage recorders" ON public.org_recorder_integrations FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260724000000_org_recognition_rating_2a.sql] public.org_member_rating
DROP POLICY IF EXISTS "members read ratings" ON public.org_member_rating;
CREATE POLICY "members read ratings" ON public.org_member_rating FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260724000000_org_recognition_rating_2a.sql] public.org_member_rating
DROP POLICY IF EXISTS "managers write ratings" ON public.org_member_rating;
CREATE POLICY "managers write ratings" ON public.org_member_rating FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260724000000_org_recognition_rating_2a.sql] public.org_rating_transactions
DROP POLICY IF EXISTS "members read rating tx" ON public.org_rating_transactions;
CREATE POLICY "members read rating tx" ON public.org_rating_transactions FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260724000000_org_recognition_rating_2a.sql] public.org_rating_transactions
DROP POLICY IF EXISTS "managers write rating tx" ON public.org_rating_transactions;
CREATE POLICY "managers write rating tx" ON public.org_rating_transactions FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260724000000_org_recognition_rating_2a.sql] public.org_rating_categories
DROP POLICY IF EXISTS "members read rating categories" ON public.org_rating_categories;
CREATE POLICY "members read rating categories" ON public.org_rating_categories FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260724000000_org_recognition_rating_2a.sql] public.org_rating_categories
DROP POLICY IF EXISTS "managers write rating categories" ON public.org_rating_categories;
CREATE POLICY "managers write rating categories" ON public.org_rating_categories FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260724000000_org_recognition_rating_2a.sql] public.org_rating_weights
DROP POLICY IF EXISTS "members read rating weights" ON public.org_rating_weights;
CREATE POLICY "members read rating weights" ON public.org_rating_weights FOR SELECT USING (
  org_id IS NULL
  OR org_id IN (SELECT public.auth_org_ids()));

-- [20260724000000_org_recognition_rating_2a.sql] public.org_rating_weights
DROP POLICY IF EXISTS "managers write rating weights" ON public.org_rating_weights;
CREATE POLICY "managers write rating weights" ON public.org_rating_weights FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260725000000_org_cohort_1a.sql] public.org_applicants
DROP POLICY IF EXISTS "read applicants" ON public.org_applicants;
CREATE POLICY "read applicants" ON public.org_applicants FOR SELECT USING (
  org_id IN (SELECT public.auth_manager_org_ids())
  OR EXISTS (SELECT 1 FROM public.org_applicant_scores s
             WHERE s.applicant_id = id
               AND s.interviewer_id IN (SELECT public.auth_member_ids()))
);

-- [20260725000000_org_cohort_1a.sql] public.org_applicants
DROP POLICY IF EXISTS "managers write applicants" ON public.org_applicants;
CREATE POLICY "managers write applicants" ON public.org_applicants FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260725000000_org_cohort_1a.sql] public.org_applicant_scores
DROP POLICY IF EXISTS "read applicant scores" ON public.org_applicant_scores;
CREATE POLICY "read applicant scores" ON public.org_applicant_scores FOR SELECT USING (
  interviewer_id IN (SELECT public.auth_member_ids())
  OR org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260725000000_org_cohort_1a.sql] public.org_applicant_scores
DROP POLICY IF EXISTS "write applicant scores" ON public.org_applicant_scores;
CREATE POLICY "write applicant scores" ON public.org_applicant_scores FOR ALL USING (
  interviewer_id IN (SELECT public.auth_member_ids())
  OR org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  interviewer_id IN (SELECT public.auth_member_ids())
  OR org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260725000000_org_cohort_1a.sql] public.org_application_forms
DROP POLICY IF EXISTS "managers manage forms" ON public.org_application_forms;
CREATE POLICY "managers manage forms" ON public.org_application_forms FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260725000000_org_cohort_1a.sql] public.org_onboarding_tasks
DROP POLICY IF EXISTS "read onboarding tasks" ON public.org_onboarding_tasks;
CREATE POLICY "read onboarding tasks" ON public.org_onboarding_tasks FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260725000000_org_cohort_1a.sql] public.org_onboarding_tasks
DROP POLICY IF EXISTS "managers write onboarding tasks" ON public.org_onboarding_tasks;
CREATE POLICY "managers write onboarding tasks" ON public.org_onboarding_tasks FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260725000000_org_cohort_1a.sql] public.org_alumni_records
DROP POLICY IF EXISTS "read alumni" ON public.org_alumni_records;
CREATE POLICY "read alumni" ON public.org_alumni_records FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

-- [20260725000000_org_cohort_1a.sql] public.org_alumni_records
DROP POLICY IF EXISTS "managers write alumni" ON public.org_alumni_records;
CREATE POLICY "managers write alumni" ON public.org_alumni_records FOR ALL USING (
  org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (
  org_id IN (SELECT public.auth_manager_org_ids())
);

-- [20260726000000_org_flag_object.sql] public.org_position_flags
DROP POLICY IF EXISTS "org members read org flags" ON public.org_position_flags;
CREATE POLICY "org members read org flags" ON public.org_position_flags FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
);

-- [20260726000000_org_flag_object.sql] public.org_flag_evidence
DROP POLICY IF EXISTS "org members read flag evidence" ON public.org_flag_evidence;
CREATE POLICY "org members read flag evidence" ON public.org_flag_evidence FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
);

-- [20260726000000_org_flag_object.sql] public.org_flag_evidence
DROP POLICY IF EXISTS "org members add flag evidence" ON public.org_flag_evidence;
CREATE POLICY "org members add flag evidence" ON public.org_flag_evidence FOR INSERT WITH CHECK (
  org_id IN (SELECT public.auth_org_ids())
);

-- [20260726000000_org_flag_object.sql] public.org_flag_response
DROP POLICY IF EXISTS "org members read flag responses" ON public.org_flag_response;
CREATE POLICY "org members read flag responses" ON public.org_flag_response FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
);

-- [20260726000000_org_flag_object.sql] public.org_flag_response
DROP POLICY IF EXISTS "members write own flag responses" ON public.org_flag_response;
CREATE POLICY "members write own flag responses" ON public.org_flag_response FOR INSERT WITH CHECK (
  responder_member_id IN (SELECT public.auth_member_ids())
);

-- [20260726000000_org_flag_object.sql] public.org_flag_outcome
DROP POLICY IF EXISTS "org members read flag outcomes" ON public.org_flag_outcome;
CREATE POLICY "org members read flag outcomes" ON public.org_flag_outcome FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
);

-- Reload PostgREST's schema cache so the new policies/functions take effect.
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (down-migration) — uncomment to restore the pre-fix policy bodies,
-- then drop the helper functions. RESTORES THE RECURSION BUG; for emergency use.
--
-- Step 1 — restore original policy definitions:
-- DROP POLICY IF EXISTS "Org members read members" ON public.org_members;
-- CREATE POLICY "Org members read members" ON public.org_members
--   FOR SELECT USING (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   );

-- DROP POLICY IF EXISTS "Org members read teams" ON public.org_teams;
-- CREATE POLICY "Org members read teams" ON public.org_teams
--   FOR SELECT USING (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   );

-- DROP POLICY IF EXISTS "Managers write tasks" ON public.org_tasks;
-- CREATE POLICY "Managers write tasks" ON public.org_tasks
--   FOR ALL
--   USING (
--     org_id IN (
--       SELECT org_id FROM public.org_members
--       WHERE user_id = auth.uid() AND role IN ('executive', 'portfolio_manager') AND is_active = true
--     )
--   )
--   WITH CHECK (
--     org_id IN (
--       SELECT org_id FROM public.org_members
--       WHERE user_id = auth.uid() AND role IN ('executive', 'portfolio_manager') AND is_active = true
--     )
--   );

-- DROP POLICY IF EXISTS "Members read events" ON public.org_events;
-- CREATE POLICY "Members read events" ON public.org_events
--   FOR SELECT USING (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   );

-- DROP POLICY IF EXISTS "Managers write events" ON public.org_events;
-- CREATE POLICY "Managers write events" ON public.org_events
--   FOR ALL
--   USING (
--     org_id IN (
--       SELECT org_id FROM public.org_members
--       WHERE user_id = auth.uid() AND role IN ('executive', 'portfolio_manager') AND is_active = true
--     )
--   )
--   WITH CHECK (
--     org_id IN (
--       SELECT org_id FROM public.org_members
--       WHERE user_id = auth.uid() AND role IN ('executive', 'portfolio_manager') AND is_active = true
--     )
--   );

-- DROP POLICY IF EXISTS "Members read learning" ON public.org_learning_content;
-- CREATE POLICY "Members read learning" ON public.org_learning_content
--   FOR SELECT USING (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   );

-- DROP POLICY IF EXISTS "Managers write learning" ON public.org_learning_content;
-- CREATE POLICY "Managers write learning" ON public.org_learning_content
--   FOR ALL
--   USING (
--     org_id IN (
--       SELECT org_id FROM public.org_members
--       WHERE user_id = auth.uid() AND role IN ('executive', 'portfolio_manager') AND is_active = true
--     )
--   )
--   WITH CHECK (
--     org_id IN (
--       SELECT org_id FROM public.org_members
--       WHERE user_id = auth.uid() AND role IN ('executive', 'portfolio_manager') AND is_active = true
--     )
--   );

-- DROP POLICY IF EXISTS "Members read posts" ON public.org_posts;
-- CREATE POLICY "Members read posts" ON public.org_posts
--   FOR SELECT USING (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   );

-- DROP POLICY IF EXISTS "Members write posts" ON public.org_posts;
-- CREATE POLICY "Members write posts" ON public.org_posts
--   FOR INSERT WITH CHECK (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--     AND author_id = auth.uid()
--   );

-- DROP POLICY IF EXISTS "members read own flags" ON public.org_position_flags;
-- CREATE POLICY "members read own flags" ON public.org_position_flags FOR SELECT USING (
--   raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   OR recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members create own flags" ON public.org_position_flags;
-- CREATE POLICY "members create own flags" ON public.org_position_flags FOR INSERT WITH CHECK (
--   raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members update flags they are part of" ON public.org_position_flags;
-- CREATE POLICY "members update flags they are part of" ON public.org_position_flags FOR UPDATE USING (
--   raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   OR recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read attachments for visible flags" ON public.org_flag_attachments;
-- CREATE POLICY "read attachments for visible flags" ON public.org_flag_attachments FOR SELECT USING (
--   flag_id IN (
--     SELECT id FROM public.org_position_flags
--     WHERE raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--        OR recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   )
-- );

-- DROP POLICY IF EXISTS "members add attachments to own flags" ON public.org_flag_attachments;
-- CREATE POLICY "members add attachments to own flags" ON public.org_flag_attachments FOR INSERT WITH CHECK (
--   flag_id IN (
--     SELECT id FROM public.org_position_flags
--     WHERE raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   )
-- );

-- DROP POLICY IF EXISTS "read messages for visible flags" ON public.org_flag_messages;
-- CREATE POLICY "read messages for visible flags" ON public.org_flag_messages FOR SELECT USING (
--   flag_id IN (
--     SELECT id FROM public.org_position_flags
--     WHERE raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--        OR recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   )
-- );

-- DROP POLICY IF EXISTS "members post messages on visible flags" ON public.org_flag_messages;
-- CREATE POLICY "members post messages on visible flags" ON public.org_flag_messages FOR INSERT WITH CHECK (
--   author_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   AND flag_id IN (
--     SELECT id FROM public.org_position_flags
--     WHERE raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--        OR recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   )
-- );

-- DROP POLICY IF EXISTS "members read own permission overrides" ON public.org_member_permissions;
-- CREATE POLICY "members read own permission overrides" ON public.org_member_permissions FOR SELECT USING (
--   org_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read own dms" ON public.org_direct_messages;
-- CREATE POLICY "members read own dms" ON public.org_direct_messages FOR SELECT USING (
--   sender_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   OR recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members update own received dms" ON public.org_direct_messages;
-- CREATE POLICY "members update own received dms" ON public.org_direct_messages FOR UPDATE USING (
--   recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read own notif prefs" ON public.org_notification_preferences;
-- CREATE POLICY "members read own notif prefs" ON public.org_notification_preferences FOR SELECT USING (
--   org_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members insert own notif prefs" ON public.org_notification_preferences;
-- CREATE POLICY "members insert own notif prefs" ON public.org_notification_preferences FOR INSERT WITH CHECK (
--   org_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members update own notif prefs" ON public.org_notification_preferences;
-- CREATE POLICY "members update own notif prefs" ON public.org_notification_preferences FOR UPDATE USING (
--   org_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "org members read pitches" ON public.org_pitches;
-- CREATE POLICY "org members read pitches" ON public.org_pitches FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "org members read pitch history" ON public.org_pitch_stage_history;
-- CREATE POLICY "org members read pitch history" ON public.org_pitch_stage_history FOR SELECT USING (
--   pitch_id IN (
--     SELECT id FROM public.org_pitches
--     WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   )
-- );

-- DROP POLICY IF EXISTS "org members read deliverables" ON public.org_pitch_deliverables;
-- CREATE POLICY "org members read deliverables" ON public.org_pitch_deliverables FOR SELECT USING (
--   pitch_id IN (
--     SELECT id FROM public.org_pitches
--     WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   )
-- );

-- DROP POLICY IF EXISTS "org members read votes" ON public.org_pitch_votes;
-- CREATE POLICY "org members read votes" ON public.org_pitch_votes FOR SELECT USING (
--   pitch_id IN (
--     SELECT id FROM public.org_pitches
--     WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   )
-- );

-- DROP POLICY IF EXISTS "org members read discussion" ON public.org_pitch_discussion_messages;
-- CREATE POLICY "org members read discussion" ON public.org_pitch_discussion_messages FOR SELECT USING (
--   pitch_id IN (
--     SELECT id FROM public.org_pitches
--     WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   )
-- );

-- DROP POLICY IF EXISTS "org members read hindsight" ON public.org_pitch_hindsight;
-- CREATE POLICY "org members read hindsight" ON public.org_pitch_hindsight FOR SELECT USING (
--   pitch_id IN (
--     SELECT id FROM public.org_pitches
--     WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   )
-- );

-- DROP POLICY IF EXISTS "members insert pitches" ON public.org_pitches;
-- CREATE POLICY "members insert pitches" ON public.org_pitches FOR INSERT WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   AND analyst_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members update pitches in org" ON public.org_pitches;
-- CREATE POLICY "members update pitches in org" ON public.org_pitches FOR UPDATE USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members insert pitch history" ON public.org_pitch_stage_history;
-- CREATE POLICY "members insert pitch history" ON public.org_pitch_stage_history FOR INSERT WITH CHECK (
--   pitch_id IN (
--     SELECT id FROM public.org_pitches
--     WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   )
-- );

-- DROP POLICY IF EXISTS "members insert deliverables" ON public.org_pitch_deliverables;
-- CREATE POLICY "members insert deliverables" ON public.org_pitch_deliverables FOR INSERT WITH CHECK (
--   pitch_id IN (
--     SELECT id FROM public.org_pitches
--     WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   )
-- );

-- DROP POLICY IF EXISTS "members insert votes" ON public.org_pitch_votes;
-- CREATE POLICY "members insert votes" ON public.org_pitch_votes FOR INSERT WITH CHECK (
--   voter_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members insert discussion" ON public.org_pitch_discussion_messages;
-- CREATE POLICY "members insert discussion" ON public.org_pitch_discussion_messages FOR INSERT WITH CHECK (
--   author_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read sector coverage" ON public.org_sector_coverage;
-- CREATE POLICY "members read sector coverage" ON public.org_sector_coverage
--   FOR SELECT USING (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   );

-- DROP POLICY IF EXISTS "managers write sector coverage" ON public.org_sector_coverage;
-- CREATE POLICY "managers write sector coverage" ON public.org_sector_coverage
--   FOR ALL USING (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
--   ) WITH CHECK (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
--   );

-- DROP POLICY IF EXISTS "members read advisor oversight" ON public.org_advisor_oversight;
-- CREATE POLICY "members read advisor oversight" ON public.org_advisor_oversight
--   FOR SELECT USING (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   );

-- DROP POLICY IF EXISTS "executives write advisor oversight" ON public.org_advisor_oversight;
-- CREATE POLICY "executives write advisor oversight" ON public.org_advisor_oversight
--   FOR ALL USING (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
--   ) WITH CHECK (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
--   );

-- DROP POLICY IF EXISTS "managers update org members" ON public.org_members;
-- CREATE POLICY "managers update org members" ON public.org_members
--   FOR UPDATE USING (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
--   ) WITH CHECK (
--     org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
--   );

-- DROP POLICY IF EXISTS "members read notes" ON public.org_research_notes;
-- CREATE POLICY "members read notes" ON public.org_research_notes FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   AND (visibility <> 'private' OR author_id = auth.uid())
-- );

-- DROP POLICY IF EXISTS "members write own notes" ON public.org_research_notes;
-- CREATE POLICY "members write own notes" ON public.org_research_notes FOR ALL USING (
--   author_id = auth.uid()
--   AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- ) WITH CHECK (
--   author_id = auth.uid()
--   AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "managers moderate notes" ON public.org_research_notes;
-- CREATE POLICY "managers moderate notes" ON public.org_research_notes FOR UPDATE USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "managers delete notes" ON public.org_research_notes;
-- CREATE POLICY "managers delete notes" ON public.org_research_notes FOR DELETE USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read threads" ON public.org_position_threads;
-- CREATE POLICY "members read threads" ON public.org_position_threads FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "members write own threads" ON public.org_position_threads;
-- CREATE POLICY "members write own threads" ON public.org_position_threads FOR INSERT WITH CHECK (
--   author_id = auth.uid() AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "members read reactions" ON public.org_reactions;
-- CREATE POLICY "members read reactions" ON public.org_reactions FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "members create mentions" ON public.org_mentions;
-- CREATE POLICY "members create mentions" ON public.org_mentions FOR INSERT WITH CHECK (
--   author_id = auth.uid() AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "members read recognition" ON public.org_recognition;
-- CREATE POLICY "members read recognition" ON public.org_recognition FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers award recognition" ON public.org_recognition;
-- CREATE POLICY "managers award recognition" ON public.org_recognition FOR INSERT WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

-- DROP POLICY IF EXISTS "members read meetings" ON public.org_meetings;
-- CREATE POLICY "members read meetings" ON public.org_meetings FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers run meetings" ON public.org_meetings;
-- CREATE POLICY "managers run meetings" ON public.org_meetings FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

-- DROP POLICY IF EXISTS "members read cohorts" ON public.org_cohorts;
-- CREATE POLICY "members read cohorts" ON public.org_cohorts FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "executives write cohorts" ON public.org_cohorts;
-- CREATE POLICY "executives write cohorts" ON public.org_cohorts FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true));

-- DROP POLICY IF EXISTS "students read own grades" ON public.org_grades;
-- CREATE POLICY "students read own grades" ON public.org_grades FOR SELECT USING (
--   student_id = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true));

-- DROP POLICY IF EXISTS "advisors write grades" ON public.org_grades;
-- CREATE POLICY "advisors write grades" ON public.org_grades FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true));

-- DROP POLICY IF EXISTS "members read own assignments" ON public.org_assignments;
-- CREATE POLICY "members read own assignments" ON public.org_assignments FOR SELECT USING (
--   assigned_to = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

-- DROP POLICY IF EXISTS "managers write assignments" ON public.org_assignments;
-- CREATE POLICY "managers write assignments" ON public.org_assignments FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

-- DROP POLICY IF EXISTS "members read comp entries" ON public.competition_org_entries;
-- CREATE POLICY "members read comp entries" ON public.competition_org_entries FOR SELECT USING (
--   competition_id IN (
--     SELECT competition_id FROM public.competition_org_entries e2
--     WHERE e2.org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   ));

-- DROP POLICY IF EXISTS "managers manage comp entries" ON public.competition_org_entries;
-- CREATE POLICY "managers manage comp entries" ON public.competition_org_entries FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

-- DROP POLICY IF EXISTS "members read ips rules" ON public.org_ips_rules;
-- CREATE POLICY "members read ips rules" ON public.org_ips_rules FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "executives write ips rules" ON public.org_ips_rules;
-- CREATE POLICY "executives write ips rules" ON public.org_ips_rules FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true));

-- DROP POLICY IF EXISTS "members read violations" ON public.org_ips_violations;
-- CREATE POLICY "members read violations" ON public.org_ips_violations FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers resolve violations" ON public.org_ips_violations;
-- CREATE POLICY "managers resolve violations" ON public.org_ips_violations FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

-- DROP POLICY IF EXISTS "members log violations" ON public.org_ips_violations;
-- CREATE POLICY "members log violations" ON public.org_ips_violations FOR INSERT WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "members read fund snapshots" ON public.org_fund_snapshots;
-- CREATE POLICY "members read fund snapshots" ON public.org_fund_snapshots FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers write fund snapshots" ON public.org_fund_snapshots;
-- CREATE POLICY "managers write fund snapshots" ON public.org_fund_snapshots FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

-- DROP POLICY IF EXISTS "members read reports" ON public.org_reports;
-- CREATE POLICY "members read reports" ON public.org_reports FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers write reports" ON public.org_reports;
-- CREATE POLICY "managers write reports" ON public.org_reports FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

-- DROP POLICY IF EXISTS "Org members read role changes" ON public.org_role_changes;
-- CREATE POLICY "Org members read role changes" ON public.org_role_changes
--   FOR SELECT USING (
--     org_id IN (
--       SELECT org_id FROM public.org_members
--       WHERE user_id = auth.uid() AND is_active = true
--     )
--   );

-- DROP POLICY IF EXISTS "execs manage invites" ON public.org_invites;
-- CREATE POLICY "execs manage invites" ON public.org_invites FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read fund config" ON public.org_fund_config;
-- CREATE POLICY "members read fund config" ON public.org_fund_config FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "execs write fund config" ON public.org_fund_config;
-- CREATE POLICY "execs write fund config" ON public.org_fund_config FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "executives read audit" ON public.org_audit_log;
-- CREATE POLICY "executives read audit" ON public.org_audit_log FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read governance" ON public.org_governance_settings;
-- CREATE POLICY "members read governance" ON public.org_governance_settings FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read assignment assignees" ON public.org_assignment_assignees;
-- CREATE POLICY "read assignment assignees" ON public.org_assignment_assignees FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
--   OR EXISTS (SELECT 1 FROM public.org_assignments a WHERE a.id = assignment_id AND a.assigned_to = auth.uid())
--   OR (target_type = 'member' AND target_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true))
-- );

-- DROP POLICY IF EXISTS "managers write assignment assignees" ON public.org_assignment_assignees;
-- CREATE POLICY "managers write assignment assignees" ON public.org_assignment_assignees FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read assignment submissions" ON public.org_assignment_submissions;
-- CREATE POLICY "read assignment submissions" ON public.org_assignment_submissions FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
--   OR submitted_by = auth.uid()
--   OR EXISTS (SELECT 1 FROM public.org_assignments a WHERE a.id = assignment_id AND a.assigned_to = auth.uid())
-- );

-- DROP POLICY IF EXISTS "assignee or manager writes submissions" ON public.org_assignment_submissions;
-- CREATE POLICY "assignee or manager writes submissions" ON public.org_assignment_submissions FOR ALL USING (
--   submitted_by = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   submitted_by = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read assignment comments" ON public.org_assignment_comments;
-- CREATE POLICY "read assignment comments" ON public.org_assignment_comments FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
--   OR author_id = auth.uid()
--   OR EXISTS (SELECT 1 FROM public.org_assignments a WHERE a.id = assignment_id AND a.assigned_to = auth.uid())
-- );

-- DROP POLICY IF EXISTS "author or manager writes comments" ON public.org_assignment_comments;
-- CREATE POLICY "author or manager writes comments" ON public.org_assignment_comments FOR ALL USING (
--   author_id = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   author_id = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read assignment attachments" ON public.org_assignment_attachments;
-- CREATE POLICY "read assignment attachments" ON public.org_assignment_attachments FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
--   OR uploaded_by = auth.uid()
--   OR EXISTS (SELECT 1 FROM public.org_assignments a WHERE a.id = assignment_id AND a.assigned_to = auth.uid())
-- );

-- DROP POLICY IF EXISTS "uploader or manager writes attachments" ON public.org_assignment_attachments;
-- CREATE POLICY "uploader or manager writes attachments" ON public.org_assignment_attachments FOR ALL USING (
--   uploaded_by = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   uploaded_by = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read templates" ON public.org_assignment_templates;
-- CREATE POLICY "members read templates" ON public.org_assignment_templates FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "managers write templates" ON public.org_assignment_templates;
-- CREATE POLICY "managers write templates" ON public.org_assignment_templates FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read ic meetings" ON public.org_ic_meetings;
-- CREATE POLICY "members read ic meetings" ON public.org_ic_meetings FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "managers write ic meetings" ON public.org_ic_meetings;
-- CREATE POLICY "managers write ic meetings" ON public.org_ic_meetings FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read pitch templates" ON public.org_pitch_templates;
-- CREATE POLICY "members read pitch templates" ON public.org_pitch_templates FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "managers write pitch templates" ON public.org_pitch_templates;
-- CREATE POLICY "managers write pitch templates" ON public.org_pitch_templates FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read research versions" ON public.org_research_versions;
-- CREATE POLICY "read research versions" ON public.org_research_versions FOR SELECT USING (
--   EXISTS (SELECT 1 FROM public.org_research_notes n WHERE n.id = note_id
--           AND n.org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--           AND (n.visibility <> 'private' OR n.author_id = auth.uid())));

-- DROP POLICY IF EXISTS "write research versions" ON public.org_research_versions;
-- CREATE POLICY "write research versions" ON public.org_research_versions FOR ALL USING (
--   edited_by = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   edited_by = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read research attachments" ON public.org_research_attachments;
-- CREATE POLICY "read research attachments" ON public.org_research_attachments FOR SELECT USING (
--   EXISTS (SELECT 1 FROM public.org_research_notes n WHERE n.id = note_id
--           AND n.org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--           AND (n.visibility <> 'private' OR n.author_id = auth.uid())));

-- DROP POLICY IF EXISTS "write research attachments" ON public.org_research_attachments;
-- CREATE POLICY "write research attachments" ON public.org_research_attachments FOR ALL USING (
--   uploaded_by = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   uploaded_by = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read research comments" ON public.org_research_comments;
-- CREATE POLICY "read research comments" ON public.org_research_comments FOR SELECT USING (
--   EXISTS (SELECT 1 FROM public.org_research_notes n WHERE n.id = note_id
--           AND n.org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--           AND (n.visibility <> 'private' OR n.author_id = auth.uid())));

-- DROP POLICY IF EXISTS "write research comments" ON public.org_research_comments;
-- CREATE POLICY "write research comments" ON public.org_research_comments FOR ALL USING (
--   author_id = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   author_id = auth.uid()
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read research templates" ON public.org_research_templates;
-- CREATE POLICY "read research templates" ON public.org_research_templates FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers write research templates" ON public.org_research_templates;
-- CREATE POLICY "managers write research templates" ON public.org_research_templates FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "owner rw collections" ON public.org_research_collections;
-- CREATE POLICY "owner rw collections" ON public.org_research_collections FOR ALL USING (
--   owner_id = auth.uid()
-- ) WITH CHECK (
--   owner_id = auth.uid()
--   AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read coverage lineage" ON public.org_coverage_lineage;
-- CREATE POLICY "read coverage lineage" ON public.org_coverage_lineage FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers write coverage lineage" ON public.org_coverage_lineage;
-- CREATE POLICY "managers write coverage lineage" ON public.org_coverage_lineage FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read meeting attendees" ON public.org_meeting_attendees;
-- CREATE POLICY "read meeting attendees" ON public.org_meeting_attendees FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "write meeting attendees" ON public.org_meeting_attendees;
-- CREATE POLICY "write meeting attendees" ON public.org_meeting_attendees FOR ALL USING (
--   member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read meeting sentiment" ON public.org_meeting_sentiment;
-- CREATE POLICY "read meeting sentiment" ON public.org_meeting_sentiment FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers write meeting sentiment" ON public.org_meeting_sentiment;
-- CREATE POLICY "managers write meeting sentiment" ON public.org_meeting_sentiment FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read meeting deliverables" ON public.org_meeting_deliverables;
-- CREATE POLICY "read meeting deliverables" ON public.org_meeting_deliverables FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers write meeting deliverables" ON public.org_meeting_deliverables;
-- CREATE POLICY "managers write meeting deliverables" ON public.org_meeting_deliverables FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read meeting votes" ON public.org_meeting_votes;
-- CREATE POLICY "read meeting votes" ON public.org_meeting_votes FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "cast meeting vote" ON public.org_meeting_votes;
-- CREATE POLICY "cast meeting vote" ON public.org_meeting_votes FOR ALL USING (
--   voter_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   voter_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "managers manage recorders" ON public.org_recorder_integrations;
-- CREATE POLICY "managers manage recorders" ON public.org_recorder_integrations FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read ratings" ON public.org_member_rating;
-- CREATE POLICY "members read ratings" ON public.org_member_rating FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers write ratings" ON public.org_member_rating;
-- CREATE POLICY "managers write ratings" ON public.org_member_rating FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read rating tx" ON public.org_rating_transactions;
-- CREATE POLICY "members read rating tx" ON public.org_rating_transactions FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers write rating tx" ON public.org_rating_transactions;
-- CREATE POLICY "managers write rating tx" ON public.org_rating_transactions FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read rating categories" ON public.org_rating_categories;
-- CREATE POLICY "members read rating categories" ON public.org_rating_categories FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers write rating categories" ON public.org_rating_categories;
-- CREATE POLICY "managers write rating categories" ON public.org_rating_categories FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members read rating weights" ON public.org_rating_weights;
-- CREATE POLICY "members read rating weights" ON public.org_rating_weights FOR SELECT USING (
--   org_id IS NULL
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers write rating weights" ON public.org_rating_weights;
-- CREATE POLICY "managers write rating weights" ON public.org_rating_weights FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read applicants" ON public.org_applicants;
-- CREATE POLICY "read applicants" ON public.org_applicants FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
--   OR EXISTS (SELECT 1 FROM public.org_applicant_scores s
--              WHERE s.applicant_id = id
--                AND s.interviewer_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true))
-- );

-- DROP POLICY IF EXISTS "managers write applicants" ON public.org_applicants;
-- CREATE POLICY "managers write applicants" ON public.org_applicants FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read applicant scores" ON public.org_applicant_scores;
-- CREATE POLICY "read applicant scores" ON public.org_applicant_scores FOR SELECT USING (
--   interviewer_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "write applicant scores" ON public.org_applicant_scores;
-- CREATE POLICY "write applicant scores" ON public.org_applicant_scores FOR ALL USING (
--   interviewer_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   interviewer_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
--   OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "managers manage forms" ON public.org_application_forms;
-- CREATE POLICY "managers manage forms" ON public.org_application_forms FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read onboarding tasks" ON public.org_onboarding_tasks;
-- CREATE POLICY "read onboarding tasks" ON public.org_onboarding_tasks FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers write onboarding tasks" ON public.org_onboarding_tasks;
-- CREATE POLICY "managers write onboarding tasks" ON public.org_onboarding_tasks FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "read alumni" ON public.org_alumni_records;
-- CREATE POLICY "read alumni" ON public.org_alumni_records FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

-- DROP POLICY IF EXISTS "managers write alumni" ON public.org_alumni_records;
-- CREATE POLICY "managers write alumni" ON public.org_alumni_records FOR ALL USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- ) WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "org members read org flags" ON public.org_position_flags;
-- CREATE POLICY "org members read org flags" ON public.org_position_flags FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "org members read flag evidence" ON public.org_flag_evidence;
-- CREATE POLICY "org members read flag evidence" ON public.org_flag_evidence FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "org members add flag evidence" ON public.org_flag_evidence;
-- CREATE POLICY "org members add flag evidence" ON public.org_flag_evidence FOR INSERT WITH CHECK (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "org members read flag responses" ON public.org_flag_response;
-- CREATE POLICY "org members read flag responses" ON public.org_flag_response FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "members write own flag responses" ON public.org_flag_response;
-- CREATE POLICY "members write own flag responses" ON public.org_flag_response FOR INSERT WITH CHECK (
--   responder_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- DROP POLICY IF EXISTS "org members read flag outcomes" ON public.org_flag_outcome;
-- CREATE POLICY "org members read flag outcomes" ON public.org_flag_outcome FOR SELECT USING (
--   org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
-- );

-- Step 2 — drop the helper functions:
-- DROP FUNCTION IF EXISTS public.auth_org_ids();
-- DROP FUNCTION IF EXISTS public.auth_manager_org_ids();
-- DROP FUNCTION IF EXISTS public.auth_executive_org_ids();
-- DROP FUNCTION IF EXISTS public.auth_member_ids();
-- Step 3 — NOTIFY pgrst, 'reload schema';
-- ─────────────────────────────────────────────────────────────────────────────
