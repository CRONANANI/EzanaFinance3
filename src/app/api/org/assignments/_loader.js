/**
 * Shared loader for the Assignments (2a) initial payload.
 *
 * Colocated, underscore-prefixed module — the Next.js App Router ignores it for
 * routing (only route.js / page.js are routes), so it is safe to import from the
 * sibling route handler AND from the server page component for first-paint SSR.
 *
 * Returns `{ error, payload }` so callers preserve the route's exact error
 * handling (route → 500 with error.message; page → null initialData).
 */
import { assertOrgRole } from '@/lib/org-trading-server';
import {
  MANAGER_ROLES,
  TYPES,
  STATUSES,
  TERMINAL_STATUSES,
  deriveOverdue,
  resolveTargetsToMembers,
} from './_shared';

export const ROSTER_COLS =
  'id, user_id, display_name, role, sub_role, title, team_id, cohort_id, is_active, reports_to';

/**
 * Build the full Assignments GET payload for a resolved org member.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase RLS-scoped client
 * @param {{ org_id: string, user_id: string, id: string, team_id?: string }} member
 * @returns {Promise<{ error?: unknown, payload?: object }>}
 */
export async function loadAssignments(supabase, member) {
  const orgId = member.org_id;
  const canAssign = assertOrgRole(member, MANAGER_ROLES);

  const { data: rows, error } = await supabase
    .from('org_assignments')
    .select('*')
    .eq('org_id', orgId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) return { error };

  const assignments = rows || [];
  const ids = assignments.map((a) => a.id);

  const [{ data: roster }, { data: teams }, { data: cohorts }, { data: templates }, { data: org }] =
    await Promise.all([
      supabase.from('org_members').select(ROSTER_COLS).eq('org_id', orgId).eq('is_active', true),
      supabase.from('org_teams').select('id, name, slug').eq('org_id', orgId).order('name'),
      supabase
        .from('org_cohorts')
        .select('id, name, is_current, archived, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
      supabase
        .from('org_assignment_templates')
        .select('id, name, assignment_type, title, instructions, sector, require_upload')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
      supabase.from('organizations').select('name, university_name').eq('id', orgId).maybeSingle(),
    ]);

  const rosterList = roster || [];
  const byUserId = new Map(rosterList.map((m) => [m.user_id, m]));

  // Direct reports of the viewer: members whose reports_to points at M. Used to
  // surface work M has delegated to their immediate subordinates (a CIO sees
  // their PMs'/Ops Managers' assignments; a PM sees their analysts'). Direct
  // only — not the full subtree. Non-managers have an empty set, so the same
  // code path gives everyone just their own work.
  const directReportIds = new Set(
    rosterList.filter((r) => r.reports_to === member.id).map((r) => r.id),
  );

  // Assignee targets for ALL assignments first — needed to decide relevance
  // before we fetch the heavier child rows only for the visible subset.
  let assigneeRows = [];
  if (ids.length) {
    const { data: asg } = await supabase
      .from('org_assignment_assignees')
      .select('assignment_id, target_type, target_id, target_role')
      .eq('org_id', orgId)
      .in('assignment_id', ids);
    assigneeRows = asg || [];
  }
  const targetsByAssignment = new Map();
  for (const r of assigneeRows) {
    if (!targetsByAssignment.has(r.assignment_id)) targetsByAssignment.set(r.assignment_id, []);
    targetsByAssignment.get(r.assignment_id).push(r);
  }

  // Resolve an assignment's targets to concrete members (with the legacy
  // single-assignee fallback), memoized so relevance + enrichment share it.
  const peopleCache = new Map();
  const peopleFor = (a) => {
    if (peopleCache.has(a.id)) return peopleCache.get(a.id);
    let people = resolveTargetsToMembers(targetsByAssignment.get(a.id) || [], rosterList);
    if (people.length === 0 && a.assigned_to && byUserId.has(a.assigned_to)) {
      people = [byUserId.get(a.assigned_to)];
    }
    peopleCache.set(a.id, people);
    return people;
  };

  // ── Relevance filter — server-side narrowing ON TOP OF RLS ──────────────────
  // An assignment is relevant to the viewer M when ANY of:
  //   1. M is an assignee (direct/role/team/cohort, or the legacy assigned_to),
  //   2. M created / assigned it, or
  //   3. one of M's DIRECT reports is an assignee.
  // RLS still guarantees org isolation; this only narrows within the org. Lights
  // up as each university's reports_to hierarchy is populated at onboarding —
  // until then everyone correctly sees just their own work (empty reports set).
  const isRelevant = (a) => {
    if (a.created_by === member.user_id || a.assigned_by === member.user_id) return true;
    if (a.assigned_to === member.user_id) return true;
    const people = peopleFor(a);
    if (people.some((p) => p.id === member.id)) return true;
    for (const p of people) if (directReportIds.has(p.id)) return true;
    return false;
  };
  const relevantAssignments = assignments.filter(isRelevant);
  const relevantIds = relevantAssignments.map((a) => a.id);

  // Child rows ONLY for the visible assignments (RLS-scoped + a small perf win).
  let commentRows = [];
  let submissionRows = [];
  let attachmentRows = [];
  if (relevantIds.length) {
    const [{ data: com }, { data: sub }, { data: att }] = await Promise.all([
      supabase
        .from('org_assignment_comments')
        .select('assignment_id')
        .eq('org_id', orgId)
        .in('assignment_id', relevantIds),
      supabase
        .from('org_assignment_submissions')
        .select('assignment_id, version')
        .eq('org_id', orgId)
        .in('assignment_id', relevantIds),
      supabase
        .from('org_assignment_attachments')
        .select('assignment_id')
        .eq('org_id', orgId)
        .in('assignment_id', relevantIds),
    ]);
    commentRows = com || [];
    submissionRows = sub || [];
    attachmentRows = att || [];
  }

  const countBy = (list) => {
    const m = new Map();
    for (const r of list) m.set(r.assignment_id, (m.get(r.assignment_id) || 0) + 1);
    return m;
  };
  const commentCounts = countBy(commentRows);
  const attachmentCounts = countBy(attachmentRows);
  const versionMax = new Map();
  for (const s of submissionRows) {
    versionMax.set(s.assignment_id, Math.max(versionMax.get(s.assignment_id) || 0, s.version || 1));
  }

  const now = Date.now();
  // Enrich ONLY the relevant assignments — so metrics + tab counts below reflect
  // the filtered set the board shows, not org-wide totals.
  const enriched = relevantAssignments.map((a) => {
    const targets = targetsByAssignment.get(a.id) || [];
    const people = peopleFor(a);
    const assignees = people.map((m) => ({
      member_id: m.id,
      user_id: m.user_id,
      name: m.display_name || 'Member',
      role: m.role,
    }));
    const overdue = deriveOverdue(a, now);
    const mine =
      a.assigned_to === member.user_id || assignees.some((x) => x.user_id === member.user_id);
    const onMyTeam =
      !!member.team_id &&
      (people.some((m) => m.team_id === member.team_id) ||
        targets.some((t) => t.target_type === 'team' && t.target_id === member.team_id));
    return {
      ...a,
      type: a.assignment_type,
      overdue,
      archived: TERMINAL_STATUSES.includes(a.status),
      assignees,
      assignee_targets: targets,
      assignee_name: assignees[0]?.name || (a.assigned_to ? 'Member' : null),
      assigner_name: a.assigned_by ? byUserId.get(a.assigned_by)?.display_name || null : null,
      attachment_count: attachmentCounts.get(a.id) || 0,
      comment_count: commentCounts.get(a.id) || 0,
      version: versionMax.get(a.id) || 0,
      mine,
      by_me: a.assigned_by === member.user_id,
      team: onMyTeam,
    };
  });

  // ── Metrics ───────────────────────────────────────────────────────────────
  const open = enriched.filter((a) => !a.archived).length;
  const overdueCount = enriched.filter((a) => a.overdue).length;
  const awaitingReview = enriched.filter((a) =>
    ['submitted', 'under_review'].includes(a.status),
  ).length;

  // Completion rate for the current term (cohort). Delta vs the previous term
  // is computed only when both cohorts have assignments — otherwise null.
  const completionFor = (list) => {
    if (!list.length) return null;
    const done = list.filter((a) => TERMINAL_STATUSES.includes(a.status)).length;
    return Math.round((done / list.length) * 1000) / 10;
  };
  const currentCohort = (cohorts || []).find((c) => c.is_current && !c.archived) || null;
  const priorCohort =
    (cohorts || []).find((c) => c.id !== currentCohort?.id && !c.archived) ||
    (cohorts || []).find((c) => c.id !== currentCohort?.id) ||
    null;
  const termList = currentCohort
    ? enriched.filter((a) => a.cohort_id === currentCohort.id)
    : enriched;
  const completionRate = completionFor(termList);
  let completionDelta = null;
  if (currentCohort && priorCohort) {
    const priorRate = completionFor(enriched.filter((a) => a.cohort_id === priorCohort.id));
    const curRate = completionFor(enriched.filter((a) => a.cohort_id === currentCohort.id));
    if (priorRate != null && curRate != null) {
      completionDelta = Math.round((curRate - priorRate) * 10) / 10;
    }
  }

  const metrics = {
    open,
    overdue: overdueCount,
    awaiting_review: awaitingReview,
    completion_rate_pct: completionRate,
    completion_delta_pct: completionDelta,
  };

  const tab_counts = {
    all: enriched.length,
    mine: enriched.filter((a) => a.mine).length,
    team: enriched.filter((a) => a.team).length,
    by_me: enriched.filter((a) => a.by_me).length,
    archive: enriched.filter((a) => a.archived).length,
  };

  // Distinct role labels present in the roster (for role-based targeting).
  const roleSet = new Set();
  for (const m of rosterList) {
    if (m.title) roleSet.add(m.title);
    if (m.sub_role) roleSet.add(m.sub_role);
  }

  // Honest scope caption for the board — why the viewer sees what they see.
  const scopeLabel =
    directReportIds.size > 0
      ? "Your assignments and those you've delegated to your direct reports."
      : 'Your assignments.';

  const payload = {
    orgName: org?.university_name || org?.name || 'Organization',
    assignments: enriched,
    metrics,
    tab_counts,
    scope_label: scopeLabel,
    roster: rosterList.map((m) => ({
      member_id: m.id,
      user_id: m.user_id,
      display_name: m.display_name,
      role: m.role,
      title: m.title || null,
      team_id: m.team_id || null,
      cohort_id: m.cohort_id || null,
    })),
    teams: teams || [],
    cohorts: (cohorts || []).map((c) => ({ id: c.id, name: c.name, is_current: c.is_current })),
    roles: Array.from(roleSet).sort(),
    templates: templates || [],
    viewer: {
      userId: member.user_id,
      memberId: member.id,
      canAssign,
      teamId: member.team_id || null,
      types: TYPES,
      statuses: STATUSES,
    },
  };

  return { payload };
}
