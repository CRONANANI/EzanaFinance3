/* Shared ATS helpers for the applicant routes (not a route file).
   The pure rules (redaction, aggregation, anti-anchoring) live in
   src/lib/org-ats.js so the Cohorts sample bundle applies the same ones; the
   database helper below is the only part that touches the client. */

export {
  MANAGER_ROLES,
  ATS_STAGES,
  BOARD_STAGES,
  ARCHIVE_STAGES,
  PRE_INTERVIEW_STAGES,
  RUBRIC_CRITERIA,
  initialsOf,
  blindIdFor,
  shapeApplicant,
  aggregateStar,
  submittedInterviewerCount,
  scoresView,
} from '@/lib/org-ats';

/* Is blind screening on for a cohort? A property of its latest form. */
export async function cohortBlindScreening(supabase, orgId, cohortId) {
  if (!cohortId) return false;
  const { data: form } = await supabase
    .from('org_application_forms')
    .select('blind_screening')
    .eq('org_id', orgId)
    .eq('cohort_id', cohortId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return !!form?.blind_screening;
}
