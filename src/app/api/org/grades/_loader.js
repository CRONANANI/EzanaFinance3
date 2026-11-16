/**
 * Grades: the server side of `GET /api/org/grades` and of the page's first
 * render.
 *
 * Every read runs as the signed-in member (the user client); the row
 * policies stay the gate. On top of them:
 *
 * - An executive receives every grade in the council, the active analysts
 *   and portfolio managers (the members who can be graded), the cohorts and
 *   the visibility setting.
 * - Any other member receives ONLY their own grades, filtered by their own
 *   user id here as well as by the row policy, in the member shape
 *   (`memberGradeView`): no roster, no cohorts, no ids of other people. The
 *   only other name they receive is the grader's on their own entries.
 * - While the council has paused visibility, a member receives no grades at
 *   all and `gradingHidden: true`, so the page can say so.
 */
import { getGovernance } from '@/lib/org-governance';
import { GRADED_ROLES, WORK_KEYS, memberGradeView } from '@/lib/org-grades-model';

const GRADE_COLUMNS =
  'id, org_id, cohort_id, student_id, graded_by, work_type, score, max_score, letter, feedback, rubric, created_at, updated_at';
const OWN_COLUMNS =
  'id, graded_by, work_type, score, max_score, letter, feedback, rubric, created_at, updated_at';

/**
 * @returns {Promise<{ payload?: object, error?: string, status?: number }>}
 */
export async function loadGrades(supabase, member) {
  const canGrade = member.role === 'executive';
  const gov = await getGovernance(supabase, member.org_id);
  const visibility = gov.grading_visible_to_students === false ? 'paused' : 'visible';
  const viewer = { userId: member.user_id, canGrade, name: member.display_name || null };

  if (!canGrade) {
    if (visibility === 'paused') {
      return {
        payload: {
          viewer,
          visibility,
          gradingHidden: true,
          grades: [],
          roster: [],
          cohorts: [],
          workTypes: WORK_KEYS,
        },
      };
    }
    const { data, error } = await supabase
      .from('org_grades')
      .select(OWN_COLUMNS)
      .eq('org_id', member.org_id)
      .eq('student_id', member.user_id)
      .order('created_at', { ascending: false });
    if (error) return { error: 'Grades could not be loaded.', status: 500 };
    const graderIds = [...new Set((data || []).map((g) => g.graded_by).filter(Boolean))];
    let names = new Map();
    if (graderIds.length) {
      const { data: graders } = await supabase
        .from('org_members')
        .select('user_id, display_name')
        .eq('org_id', member.org_id)
        .in('user_id', graderIds);
      names = new Map((graders || []).map((m) => [m.user_id, m.display_name]));
    }
    const grades = (data || []).map((g) =>
      memberGradeView({ ...g, grader_name: g.graded_by ? names.get(g.graded_by) || null : null }),
    );
    return {
      payload: {
        viewer,
        visibility,
        gradingHidden: false,
        grades,
        roster: [],
        cohorts: [],
        workTypes: WORK_KEYS,
      },
    };
  }

  const [gradesRes, membersRes, cohortsRes] = await Promise.all([
    supabase
      .from('org_grades')
      .select(GRADE_COLUMNS)
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false }),
    /* Every member, former ones included, so a former member's grade keeps
       their name. The roster below keeps active graded roles only. */
    supabase
      .from('org_members')
      .select('user_id, display_name, role, cohort_id, is_active')
      .eq('org_id', member.org_id),
    supabase.from('org_cohorts').select('id, name').eq('org_id', member.org_id),
  ]);
  if (gradesRes.error) return { error: 'Grades could not be loaded.', status: 500 };
  const members = membersRes.data || [];
  const byUser = new Map();
  for (const m of members) {
    /* A user can have an old inactive row and a current one: prefer active. */
    if (!byUser.has(m.user_id) || m.is_active) byUser.set(m.user_id, m);
  }
  const grades = (gradesRes.data || []).map((g) => {
    const s = byUser.get(g.student_id);
    return {
      ...g,
      student_name: s?.display_name || 'Former member',
      student_former: !s || s.is_active === false,
      grader_name: g.graded_by ? byUser.get(g.graded_by)?.display_name || null : null,
    };
  });
  const roster = members
    .filter((m) => m.is_active !== false && GRADED_ROLES.includes(m.role))
    .map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      role: m.role,
      cohort_id: m.cohort_id || null,
    }));
  return {
    payload: {
      viewer,
      visibility,
      gradingHidden: false,
      grades,
      roster,
      cohorts: cohortsRes.data || [],
      workTypes: WORK_KEYS,
    },
  };
}
