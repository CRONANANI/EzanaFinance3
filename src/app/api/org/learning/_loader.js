/**
 * Council learning: the server side of GET /api/org/learning.
 *
 * Every read runs as the signed-in member through the RLS-scoped client and
 * is scoped to the member's own council; the row policies stay the gate. No
 * service-role client. Each part fails on its own (null) so the band shows
 * that card's error and the rest keeps working.
 *
 *   assignments    Assignments' own loader (the same rows the Assignments page
 *                  shows this viewer). A member who is not a manager receives
 *                  only their own, with no assignee lists.
 *   learningItems  the viewer's own council learning items (the row policy
 *                  admits only rows assigned to or by the viewer; this reads
 *                  only rows assigned to them)
 *   content        the council's learning material (the council path)
 *   onboarding     the viewer's own cohort checklist and ONLY the viewer's own
 *                  completion (their own submissions)
 *   grades         the viewer's own grades ONLY, from the Grades loader, in
 *                  the member shape. An executive's council-wide grade list is
 *                  narrowed to their own entries here; nothing about another
 *                  member leaves this file. While the council has paused grade
 *                  visibility a member receives none (hidden: true).
 *   roster, learningScores   managers only: who can be given work, and each
 *                  member's Learning category from the council rating
 *
 * Private course progress (anyone's) is never read here.
 */
import { assertOrgRole } from '@/lib/org-trading-server';
import { httpUrlOrNull } from '@/lib/sanitize';
import { memberGradeView } from '@/lib/org-grades-model';
import { MANAGER_ROLES } from '@/lib/org-learning-model';
import { loadAssignments } from '@/app/api/org/assignments/_loader';
import { loadGrades } from '@/app/api/org/grades/_loader';

const slim = (a, withPeople) => ({
  id: a.id,
  title: a.title,
  type: a.type || a.assignment_type,
  status: a.status,
  due_date: a.due_date || null,
  mine: Boolean(a.mine),
  ...(withPeople
    ? {
        assignees: (a.assignees || []).map((p) => ({
          member_id: p.member_id,
          name: p.name,
          role: p.role,
        })),
      }
    : {}),
});

async function assignmentsPart(supabase, member, manager) {
  try {
    const { error, payload } = await loadAssignments(supabase, member);
    if (error) return { assignments: null, roster: null, orgName: null };
    const list = payload.assignments || [];
    return {
      assignments: manager
        ? list.map((a) => slim(a, true))
        : list.filter((a) => a.mine).map((a) => slim(a, false)),
      roster: manager
        ? (payload.roster || []).map((m) => ({
            member_id: m.member_id,
            user_id: m.user_id,
            display_name: m.display_name,
            role: m.role,
          }))
        : null,
      orgName: payload.orgName || null,
    };
  } catch {
    return { assignments: null, roster: null, orgName: null };
  }
}

async function learningItemsPart(supabase, member) {
  const { data, error } = await supabase
    .from('org_learning_assignments')
    .select(
      'id, status, due_date, completed_at, content:org_learning_content(id, org_id, title, content_type, content_url)',
    )
    .eq('assigned_to', member.user_id)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(50);
  if (error) return null;
  return (data || [])
    .filter((r) => r.content && r.content.org_id === member.org_id)
    .map((r) => ({
      id: r.id,
      title: r.content.title,
      content_type: r.content.content_type || 'document',
      url: httpUrlOrNull(r.content.content_url),
      status: r.status || 'assigned',
      due_date: r.due_date || null,
      completed_at: r.completed_at || null,
    }));
}

async function contentPart(supabase, member) {
  const { data, error } = await supabase
    .from('org_learning_content')
    .select('id, title, content_type, content_url, team_id, created_at')
    .eq('org_id', member.org_id)
    .order('created_at', { ascending: true })
    .limit(20);
  if (error) return null;
  return (data || [])
    .filter(
      (c) => !c.team_id || c.team_id === member.team_id || assertOrgRole(member, MANAGER_ROLES),
    )
    .map((c) => ({
      id: c.id,
      title: c.title,
      content_type: c.content_type || 'document',
      url: httpUrlOrNull(c.content_url),
      created_at: c.created_at,
    }));
}

async function onboardingPart(supabase, member) {
  if (!member.cohort_id) return { cohortName: null, gateEnabled: false, tasks: [] };
  const [{ data: cohort, error: cErr }, { data: links, error: lErr }] = await Promise.all([
    supabase
      .from('org_cohorts')
      .select('id, name, onboarding_gate')
      .eq('id', member.cohort_id)
      .eq('org_id', member.org_id)
      .maybeSingle(),
    supabase
      .from('org_onboarding_tasks')
      .select('id, assignment_id, sort_order, is_gate')
      .eq('org_id', member.org_id)
      .eq('cohort_id', member.cohort_id)
      .order('sort_order', { ascending: true }),
  ]);
  if (cErr || lErr) return null;
  const ids = (links || []).map((t) => t.assignment_id);
  let titles = new Map();
  const done = new Set();
  if (ids.length) {
    const [{ data: asg }, { data: subs, error: sErr }] = await Promise.all([
      supabase.from('org_assignments').select('id, title').in('id', ids),
      /* Only the viewer's own submissions: a submission is a completed task. */
      supabase
        .from('org_assignment_submissions')
        .select('assignment_id')
        .in('assignment_id', ids)
        .eq('submitted_by', member.user_id),
    ]);
    if (sErr) return null;
    titles = new Map((asg || []).map((a) => [a.id, a.title]));
    for (const s of subs || []) done.add(s.assignment_id);
  }
  return {
    cohortName: cohort?.name || null,
    gateEnabled: Boolean(cohort?.onboarding_gate),
    tasks: (links || []).map((t) => ({
      id: t.id,
      assignment_id: t.assignment_id,
      title: titles.get(t.assignment_id) || 'Onboarding task',
      is_gate: Boolean(t.is_gate),
      sort_order: t.sort_order ?? 0,
      done: done.has(t.assignment_id),
    })),
  };
}

/** The viewer's own grades only, whatever their role. */
async function gradesPart(supabase, member) {
  try {
    const { payload, error } = await loadGrades(supabase, member);
    if (error || !payload) return null;
    if (payload.gradingHidden) return { hidden: true, grades: [] };
    const own = payload.viewer?.canGrade
      ? (payload.grades || []).filter((g) => g.student_id === member.user_id).map(memberGradeView)
      : (payload.grades || []).map(memberGradeView);
    return { hidden: false, grades: own };
  } catch {
    return null;
  }
}

async function learningScoresPart(supabase, member) {
  const { data, error } = await supabase
    .from('org_rating_categories')
    .select('member_id, score')
    .eq('org_id', member.org_id)
    .eq('category', 'learning');
  if (error) return null;
  const out = {};
  for (const r of data || []) {
    const v = Number(r.score);
    if (r.member_id && Number.isFinite(v)) out[r.member_id] = v;
  }
  return out;
}

export async function loadCouncilLearning(supabase, member, now = Date.now()) {
  const manager = assertOrgRole(member, MANAGER_ROLES);
  const [asg, learningItems, content, onboarding, grades, learningScores, org] = await Promise.all([
    assignmentsPart(supabase, member, manager),
    learningItemsPart(supabase, member).catch(() => null),
    contentPart(supabase, member).catch(() => null),
    onboardingPart(supabase, member).catch(() => null),
    gradesPart(supabase, member),
    manager ? learningScoresPart(supabase, member).catch(() => null) : Promise.resolve(null),
    supabase
      .from('organizations')
      .select('name, university_name')
      .eq('id', member.org_id)
      .maybeSingle()
      .then(
        (r) => r.data || null,
        () => null,
      ),
  ]);
  return {
    now,
    viewer: {
      memberId: member.id,
      userId: member.user_id,
      role: member.role,
      subRole: member.sub_role || member.title || null,
      canManage: manager,
    },
    council: {
      name: org?.name || asg.orgName || null,
      university:
        org?.university_name && org.university_name !== org?.name ? org.university_name : null,
    },
    assignments: asg.assignments,
    roster: manager ? asg.roster : null,
    learningScores: manager ? learningScores : null,
    learningItems,
    content,
    onboarding,
    grades,
  };
}
