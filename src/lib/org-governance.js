/**
 * Org governance flags (faculty-advisor controls). Single source of truth for
 * the defaults, used by the governance API and enforced where student data is
 * served (scorecards, grades, report export).
 */
export const GOVERNANCE_DEFAULTS = {
  students_see_peer_scorecards: false,
  students_see_class_grade_distribution: false,
  who_can_export_reports: 'exec_pm_advisor', // 'exec_advisor' | 'exec_pm_advisor'
  grading_visible_to_students: true,
};

/** Effective governance flags for an org (defaults merged with stored row). */
export async function getGovernance(supabase, orgId) {
  try {
    const { data } = await supabase
      .from('org_governance_settings')
      .select(
        'students_see_peer_scorecards, students_see_class_grade_distribution, who_can_export_reports, grading_visible_to_students',
      )
      .eq('org_id', orgId)
      .maybeSingle();
    return { ...GOVERNANCE_DEFAULTS, ...(data || {}) };
  } catch {
    return { ...GOVERNANCE_DEFAULTS };
  }
}
