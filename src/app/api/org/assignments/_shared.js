/**
 * Shared helpers for the Assignments (2a) API surface.
 *
 * Colocated, underscore-prefixed module — the Next.js App Router ignores it for
 * routing (only route.js / page.js are routes), so it is safe to import from the
 * sibling route handlers.
 */

export const MANAGER_ROLES = ['executive', 'portfolio_manager'];

// assignment_type enum (widened in the Phase-1 migration).
export const TYPES = ['pitch', 'research', 'coverage', 'reading', 'model', 'meeting_prep', 'other'];

// Stored statuses. 'overdue' is intentionally absent — it is DERIVED, never
// persisted (see deriveOverdue). 'graded' is retained for backwards compat.
export const STATUSES = [
  'assigned',
  'in_progress',
  'submitted',
  'under_review',
  'returned',
  'complete',
  'graded',
];

export const TERMINAL_STATUSES = ['complete', 'graded'];

/** overdue = due_date < now() AND status NOT IN ('complete','graded'). Never stored. */
export function deriveOverdue(assignment, now = Date.now()) {
  if (!assignment?.due_date) return false;
  if (TERMINAL_STATUSES.includes(assignment.status)) return false;
  const due = new Date(assignment.due_date).getTime();
  return Number.isFinite(due) && due < now;
}

/**
 * Expand raw assignee target rows into concrete member objects.
 * - member → the one member whose org_members.id === target_id
 * - team   → every active member on that team
 * - cohort → every active member in that cohort
 * - role   → members whose title / sub_role / role matches target_role
 * - org    → every active member
 * Returns a de-duplicated array of roster member objects.
 */
export function resolveTargetsToMembers(targets, roster) {
  const byId = new Map();
  const add = (m) => {
    if (m && !byId.has(m.id)) byId.set(m.id, m);
  };
  for (const t of targets || []) {
    switch (t.target_type) {
      case 'member':
        add(roster.find((m) => m.id === t.target_id));
        break;
      case 'team':
        roster.filter((m) => m.team_id && m.team_id === t.target_id).forEach(add);
        break;
      case 'cohort':
        roster.filter((m) => m.cohort_id && m.cohort_id === t.target_id).forEach(add);
        break;
      case 'role': {
        const want = (t.target_role || '').toLowerCase();
        roster
          .filter(
            (m) =>
              want &&
              ((m.title || '').toLowerCase() === want ||
                (m.sub_role || '').toLowerCase() === want ||
                (m.role || '').toLowerCase() === want),
          )
          .forEach(add);
        break;
      }
      case 'org':
        roster.forEach(add);
        break;
      default:
        break;
    }
  }
  return Array.from(byId.values());
}

/** Human label for a raw target row (for chips / audit). */
export function targetLabel(t, roster, teams, cohorts) {
  switch (t.target_type) {
    case 'member':
      return roster.find((m) => m.id === t.target_id)?.display_name || 'Member';
    case 'team':
      return `${teams.find((x) => x.id === t.target_id)?.name || 'Team'} (team)`;
    case 'cohort':
      return `${cohorts.find((x) => x.id === t.target_id)?.name || 'Cohort'} (cohort)`;
    case 'role':
      return `${t.target_role || 'Role'} (role)`;
    case 'org':
      return 'Whole org';
    default:
      return 'Assignee';
  }
}
