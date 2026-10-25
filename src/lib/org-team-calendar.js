/**
 * Team Hub "This week in the fund" calendar, built from REAL org data only:
 *   - scheduled meetings (GET /api/org/meetings → `meetings[]`)
 *   - org_tasks due dates (GET /api/org/tasks → `tasks[]`)
 *   - assignment due dates (GET /api/org/assignments → `assignments[]`)
 *
 * Pure (no I/O) so it can be unit-tested and so the page stays a thin view.
 * Nothing is padded or invented: an org with no upcoming items gets [].
 */

const DAY_MS = 86400000;
const CLOSED_TASK = new Set(['completed']);
// Mirrors TERMINAL_STATUSES in src/app/api/org/assignments/_shared.js.
const CLOSED_ASSIGNMENT = new Set(['complete', 'graded']);

function toTime(v) {
  if (!v) return NaN;
  return Date.parse(v);
}

/**
 * @param {object} input
 * @param {Array} [input.meetings]     rows with { id, title, status, scheduled_at, team_id }
 * @param {Array} [input.tasks]        rows with { id, title, status, due_date, team_id }
 * @param {Array} [input.assignments]  rows with { id, title, status, due_date, archived }
 * @param {Array<{teamId?: string, id?: string, name: string}>} [input.teams]
 * @param {number} [input.now]         epoch ms (injectable for tests)
 * @param {number} [input.horizonDays] how far ahead to look (default 60)
 * @param {number} [input.limit]       max items returned (default 25)
 * @returns {Array<{id: string, kind: string, title: string, date: string, team: string, href: string}>}
 */
export function buildTeamCalendar({
  meetings = [],
  tasks = [],
  assignments = [],
  teams = [],
  now = Date.now(),
  horizonDays = 60,
  limit = 25,
} = {}) {
  const teamName = new Map();
  for (const t of teams || []) {
    const id = t?.teamId ?? t?.id;
    if (id && t?.name) teamName.set(id, t.name);
  }
  const labelFor = (teamId) => (teamId && teamName.get(teamId)) || 'Fund';

  // Start of the current UTC day: something due earlier today still shows.
  const from = Math.floor(now / DAY_MS) * DAY_MS;
  const to = from + horizonDays * DAY_MS;
  const inWindow = (t) => Number.isFinite(t) && t >= from && t < to;

  const items = [];

  for (const m of meetings || []) {
    if (!m?.id || m.status === 'closed' || m.status === 'cancelled') continue;
    const t = toTime(m.scheduled_at);
    if (!inWindow(t)) continue;
    items.push({
      id: `mtg-${m.id}`,
      kind: 'meeting',
      title: m.title || 'Meeting',
      date: new Date(t).toISOString(),
      team: labelFor(m.team_id),
      href: '/org-team-hub/meetings',
    });
  }

  for (const k of tasks || []) {
    if (!k?.id || CLOSED_TASK.has(k.status)) continue;
    const t = toTime(k.due_date);
    if (!inWindow(t)) continue;
    items.push({
      id: `task-${k.id}`,
      kind: 'task',
      title: k.title || 'Task',
      date: new Date(t).toISOString(),
      team: labelFor(k.team_id),
      href: '/org-team-hub',
    });
  }

  for (const a of assignments || []) {
    if (!a?.id || a.archived || CLOSED_ASSIGNMENT.has(a.status)) continue;
    const t = toTime(a.due_date);
    if (!inWindow(t)) continue;
    items.push({
      id: `asg-${a.id}`,
      kind: 'assignment',
      title: a.title || 'Assignment',
      date: new Date(t).toISOString(),
      team: labelFor(a.team_id),
      href: '/org-team-hub/assignments',
    });
  }

  items.sort((x, y) => Date.parse(x.date) - Date.parse(y.date) || x.id.localeCompare(y.id));
  return items.slice(0, limit);
}

/**
 * Header eyebrow for the Team Hub: "Team Hub · <current cohort>" when a current
 * cohort exists, else just "Team Hub". Never a hardcoded term.
 * @param {string|null|undefined} cohortName
 */
export function teamHubEyebrow(cohortName) {
  const name = typeof cohortName === 'string' ? cohortName.trim() : '';
  return name ? `Team Hub · ${name}` : 'Team Hub';
}
