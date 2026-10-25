/**
 * Org assignment targeting + submission (QA ORG-4).
 *
 * An assignment can target people through `org_assignment_assignees` (member,
 * team, cohort, role, or the whole org) as well as the legacy single
 * `assigned_to`. Every targeted person may submit, exactly as the assignments
 * board (`_loader.js` "mine") and the live `auth_targeted_assignment_ids()`
 * SQL function treat them as assignees.
 */

const lower = (v) => String(v || '').toLowerCase();

/** Does one org_assignment_assignees row target `member`? Mirrors
 *  auth_targeted_assignment_ids() and resolveTargetsToMembers(). */
export function targetMatchesMember(target, member) {
  if (!target || !member) return false;
  switch (target.target_type) {
    case 'org':
      return true;
    case 'member':
      return target.target_id === member.id;
    case 'team':
      return !!member.team_id && target.target_id === member.team_id;
    case 'cohort':
      return !!member.cohort_id && target.target_id === member.cohort_id;
    case 'role': {
      const want = lower(target.target_role);
      return (
        !!want &&
        (lower(member.role) === want ||
          lower(member.title) === want ||
          lower(member.sub_role) === want)
      );
    }
    default:
      return false;
  }
}

/**
 * Is `member` an assignee of the assignment? `client` reads
 * org_assignment_assignees; pass the service-role client, because the
 * table's RLS hides team/cohort/role targets from the people they target.
 * The read is scoped to this assignment and the member's org.
 */
export async function isAssignmentTarget(client, assignment, member) {
  if (!assignment || !member) return false;
  if (assignment.assigned_to && assignment.assigned_to === member.user_id) return true;
  const { data, error } = await client
    .from('org_assignment_assignees')
    .select('target_type, target_id, target_role')
    .eq('assignment_id', assignment.id)
    .eq('org_id', member.org_id);
  if (error || !Array.isArray(data)) return false;
  return data.some((t) => targetMatchesMember(t, member));
}

/**
 * POST /api/org/assignments/[id]/submissions, minus the HTTP plumbing.
 *   userClient   RLS-bound client (the caller): reads + the submission insert
 *   adminClient  service role: the targets lookup and the status write, both
 *                only after the assignee/manager check passes
 * Returns { status, body }.
 */
export async function submitAssignment({
  userClient,
  adminClient,
  member,
  isManager,
  assignmentId,
  note: rawNote,
}) {
  const { data: assignment } = await userClient
    .from('org_assignments')
    .select('id, assigned_to, status')
    .eq('id', assignmentId)
    .eq('org_id', member.org_id)
    .maybeSingle();
  if (!assignment) return { status: 404, body: { error: 'Not found' } };

  const isAssignee = await isAssignmentTarget(adminClient, assignment, member);
  if (!isAssignee && !isManager) {
    return { status: 403, body: { error: 'Only the assignee can submit' } };
  }

  /* The version is computed inside the insert under a per-assignment lock
     (submit_org_assignment), with a unique (assignment_id, version), so two
     submits at once cannot both become version N. Until that migration is
     applied, the old max+1 path runs. */
  const note = rawNote ? String(rawNote).slice(0, 2000) : null;
  let submission = null;
  let error = null;
  const rpc = await userClient.rpc('submit_org_assignment', {
    p_assignment: assignmentId,
    p_org: member.org_id,
    p_note: note,
  });
  if (!rpc.error) {
    submission = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
  } else if (rpc.error.code === 'PGRST202' || rpc.error.code === '42883') {
    const { data: last } = await userClient
      .from('org_assignment_submissions')
      .select('version')
      .eq('org_id', member.org_id)
      .eq('assignment_id', assignmentId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    const res = await userClient
      .from('org_assignment_submissions')
      .insert({
        assignment_id: assignmentId,
        org_id: member.org_id,
        submitted_by: member.user_id,
        version: (last?.version || 0) + 1,
        note,
      })
      .select('id, submitted_by, version, note, created_at')
      .single();
    submission = res.data;
    error = res.error;
  } else {
    error = rpc.error;
  }
  if (error) return { status: 500, body: { error: error.message } };

  // Advance the assignment to 'submitted'. The RLS UPDATE policy only admits
  // the legacy assigned_to, so this runs on the service role, after the check.
  const { error: updErr } = await adminClient
    .from('org_assignments')
    .update({ status: 'submitted' })
    .eq('id', assignmentId)
    .eq('org_id', member.org_id);
  if (updErr) return { status: 500, body: { error: updErr.message } };

  return {
    status: 201,
    body: { submission: { ...submission, submitter_name: member.display_name || 'Member' } },
  };
}
