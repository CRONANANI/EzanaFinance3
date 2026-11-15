/**
 * Assignments (/org-team-hub/assignments): the page model.
 *
 * Pure: no React, no fetch, no server imports. The server loader, the page,
 * the sample bundle and the tests all run the same rules from here, so a tab
 * count always equals the rows shown, a row only offers an action the status
 * path allows, and sample content obeys the real rules.
 *
 * What the data can and cannot say (kept honest in the interface):
 *  - A group assignment shares ONE status, one history and one grade. There
 *    is no per-person delivery, only a count of submissions and of assignees.
 *  - A grade is one score, one maximum and one comment.
 *  - "Recurring" and "upload requested" are stored labels. Nothing repeats
 *    and nothing is enforced.
 */

export const NA = 'N/A';

export const ASSIGNMENT_TYPES = [
  'pitch',
  'research',
  'coverage',
  'reading',
  'model',
  'meeting_prep',
  'other',
];

/* `icon` is a Bootstrap Icons class. The type colour is set in CSS from the
   data-type attribute, so the legend, the calendar and the list agree. */
export const TYPE_META = {
  pitch: { label: 'Pitch', icon: 'bi-easel' },
  research: { label: 'Research', icon: 'bi-binoculars' },
  coverage: { label: 'Coverage', icon: 'bi-eye' },
  reading: { label: 'Reading', icon: 'bi-book' },
  model: { label: 'Model', icon: 'bi-calculator' },
  meeting_prep: { label: 'Meeting prep', icon: 'bi-calendar-check' },
  other: { label: 'Other', icon: 'bi-file-earmark-text' },
};

export function typeMeta(type) {
  return TYPE_META[type] || TYPE_META.other;
}
export const typeOf = (a) =>
  TYPE_META[a?.type || a?.assignment_type] ? a.type || a.assignment_type : 'other';

export const STATUS_LABEL = {
  assigned: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  under_review: 'Under review',
  returned: 'Returned',
  complete: 'Complete',
  graded: 'Graded',
};
export const STATUS_ICON = {
  assigned: 'bi-circle',
  in_progress: 'bi-circle-half',
  submitted: 'bi-send',
  under_review: 'bi-clock-history',
  returned: 'bi-arrow-counterclockwise',
  complete: 'bi-check2-circle',
  graded: 'bi-award',
};

export const TERMINAL_STATUSES = ['complete', 'graded'];

/**
 * The status path. `ALLOWED_FROM[next]` lists the statuses `next` may follow.
 * The server route enforces this same table; the page reads it so it never
 * offers a step the server would refuse.
 *   assignee: assigned > in progress > submitted (and returned > either)
 *   manager:  submitted > under review > complete or returned; graded last
 */
export const ALLOWED_FROM = {
  in_progress: ['assigned', 'returned'],
  submitted: ['assigned', 'in_progress', 'returned'],
  under_review: ['submitted'],
  returned: ['submitted', 'under_review'],
  complete: ['submitted', 'under_review'],
  graded: ['submitted', 'under_review', 'complete'],
};
export const ASSIGNEE_STATUSES = ['in_progress', 'submitted'];
export const MANAGER_STATUSES = ['under_review', 'returned', 'complete', 'graded'];

export function canMove(from, to) {
  return Boolean(ALLOWED_FROM[to]?.includes(from));
}

/** overdue = due date in the past and not complete or graded. Never stored. */
export function deriveOverdue(a, now = Date.now()) {
  if (!a?.due_date) return false;
  if (TERMINAL_STATUSES.includes(a.status)) return false;
  const due = new Date(a.due_date).getTime();
  return Number.isFinite(due) && due < now;
}

/* ── Formatting ──────────────────────────────────────────────────────────── */

const dateOf = (v) => {
  if (!v) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? `${v}T00:00:00Z` : v;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t) : null;
};

/** The calendar day of a due date as YYYY-MM-DD (UTC, so a date never shifts). */
export function dayKey(v) {
  const d = dateOf(v);
  return d ? d.toISOString().slice(0, 10) : null;
}

/** "Nov 15". Due dates carry no time of day. */
export function fmtDay(v) {
  const d = dateOf(v);
  if (!d) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
/** "Nov 15, 2026" */
export function fmtDayYear(v) {
  const d = dateOf(v);
  if (!d) return NA;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
/** "Nov 14, 3:22 PM" for comments and submissions, which do carry a time. */
export function fmtStamp(v) {
  const d = dateOf(v);
  if (!d) return NA;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
export function fmtBytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return NA;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${Math.round(v / 1024)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}
/** "42/50", or null when the work has no score. */
export function gradeText(a) {
  if (a?.rubric_score == null || a?.rubric_max == null) return null;
  return `${a.rubric_score}/${a.rubric_max}`;
}
/** Signed change in percentage points: "+6.7 pp". */
export function fmtPoints(v) {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return null;
  return `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)} pp`;
}
export function fmtRate(v) {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return NA;
  return `${n.toFixed(1)}%`;
}

/** "Amara Tesfaye" reads "A. Tesfaye" in a narrow column. */
export function shortName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return NA;
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

/* ── Tabs, search, groups ────────────────────────────────────────────────── */

export const TABS = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Mine' },
  { key: 'team', label: 'Team' },
  { key: 'by_me', label: 'By me' },
  { key: 'archive', label: 'Archive' },
];
export const TAB_KEYS = TABS.map((t) => t.key);

/** Archive holds complete and graded work; the other four exclude it. */
export function filterByTab(assignments, tab) {
  const all = assignments || [];
  switch (tab) {
    case 'mine':
      return all.filter((a) => a.mine && !a.archived);
    case 'team':
      return all.filter((a) => a.team && !a.archived);
    case 'by_me':
      return all.filter((a) => a.by_me && !a.archived);
    case 'archive':
      return all.filter((a) => a.archived);
    case 'all':
    default:
      return all.filter((a) => !a.archived);
  }
}

/** How each stored target reads: a name, "Technology (team)", "Whole council". */
export function targetText(t, { roster = [], teams = [], cohorts = [] } = {}) {
  switch (t?.target_type) {
    case 'member': {
      const m = roster.find((r) => (r.member_id || r.id) === t.target_id);
      return m?.display_name || 'Member';
    }
    case 'team':
      return `${teams.find((x) => x.id === t.target_id)?.name || 'Team'} (team)`;
    case 'cohort':
      return `${cohorts.find((x) => x.id === t.target_id)?.name || 'Cohort'} (cohort)`;
    case 'role':
      return `${t.target_role || 'Role'} (role)`;
    case 'org':
      return 'Whole council';
    default:
      return 'Assignee';
  }
}

/**
 * The Assignees cell: who the work was given to, as it was stored.
 * { text, full, group, count } where count is the number of people.
 */
export function assigneeSummary(a, refs = {}) {
  const people = a?.assignees || [];
  const targets = a?.assignee_targets || [];
  const groupTargets = targets.filter((t) => t.target_type !== 'member');
  const count = people.length;
  if (groupTargets.length > 0) {
    const labels = targets.map((t) => targetText(t, refs));
    const first = targetText(groupTargets[0], refs);
    const extra = labels.length - 1;
    return {
      text: extra > 0 ? `${first} +${extra}` : first,
      full: labels.join(', '),
      group: true,
      count,
    };
  }
  if (count === 0) {
    return { text: a?.assignee_name || NA, full: a?.assignee_name || NA, group: false, count: 0 };
  }
  if (count === 1) {
    return { text: shortName(people[0].name), full: people[0].name, group: false, count: 1 };
  }
  return {
    text: `${shortName(people[0].name)} +${count - 1}`,
    full: people.map((p) => p.name).join(', '),
    group: true,
    count,
  };
}

/** Free-text match on title, ticker, sector, type and the people it was given to. */
export function searchAssignments(assignments, query, refs = {}) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return assignments || [];
  return (assignments || []).filter((a) => {
    const hay = [
      a.title,
      a.ticker,
      a.sector,
      typeMeta(typeOf(a)).label,
      a.assigner_name,
      assigneeSummary(a, refs).full,
      ...(a.assignees || []).map((p) => p.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

const dueRank = (a) => {
  const t = a.due_date ? new Date(a.due_date).getTime() : NaN;
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
};
const byDue = (a, b) => dueRank(a) - dueRank(b) || String(a.title).localeCompare(String(b.title));

export const GROUPS = {
  due: { key: 'due', title: 'Due next', statuses: ['assigned', 'in_progress'] },
  review: { key: 'review', title: 'Awaiting review', statuses: ['submitted', 'under_review'] },
  returned: { key: 'returned', title: 'Returned for revision', statuses: ['returned'] },
  done: { key: 'done', title: 'Complete and graded', statuses: TERMINAL_STATUSES },
};

/**
 * The list, grouped by status and ordered by what the viewer acts on first:
 * a reviewer's queue leads for managers, returned work leads for everyone
 * else. Every row of `list` lands in exactly one group, so the tab count is
 * the sum of the group counts.
 */
export function groupAssignments(list, { canAssign = false } = {}) {
  const order = canAssign
    ? ['review', 'due', 'returned', 'done']
    : ['returned', 'due', 'review', 'done'];
  const known = new Set(Object.values(GROUPS).flatMap((g) => g.statuses));
  return order
    .map((key) => {
      const g = GROUPS[key];
      const rows = (list || [])
        .filter((a) =>
          key === 'due'
            ? g.statuses.includes(a.status) || !known.has(a.status)
            : g.statuses.includes(a.status),
        )
        .sort(key === 'done' ? (a, b) => dueRank(b) - dueRank(a) || byDue(a, b) : byDue);
      return { ...g, rows };
    })
    .filter((g) => g.rows.length > 0);
}

/* ── What the viewer can do next ─────────────────────────────────────────── */

/**
 * The one next step this viewer can take on a row, or null.
 *   run:  the step is sent straight from the row (it needs no input)
 *   open: the step needs input, so the row opens the detail on that tab
 * Only steps on the status path are offered, to people the server accepts:
 * every assignee (however they were targeted) and, for review, managers.
 */
export function nextAction(a, viewer) {
  if (!a) return null;
  const isAssignee = Boolean(a.mine);
  const canReview = Boolean(viewer?.canAssign ?? viewer?.canReview);
  if (isAssignee && a.status === 'assigned') {
    return { key: 'start', label: 'Start', icon: 'bi-play-fill', run: 'start' };
  }
  if (isAssignee && a.status === 'in_progress') {
    return { key: 'submit', label: 'Submit', icon: 'bi-send', open: 'overview' };
  }
  if (isAssignee && a.status === 'returned') {
    return { key: 'resubmit', label: 'Resubmit', icon: 'bi-send', open: 'overview' };
  }
  if (canReview && a.status === 'submitted') {
    return { key: 'review', label: 'Start review', icon: 'bi-eye', run: 'review', open: 'grade' };
  }
  if (canReview && a.status === 'under_review') {
    return { key: 'grade', label: 'Grade', icon: 'bi-award', open: 'grade' };
  }
  if (canReview && a.status === 'complete' && gradeText(a) == null) {
    return { key: 'grade', label: 'Grade', icon: 'bi-award', open: 'grade' };
  }
  return null;
}

/** Rows in a list that wait on this viewer. */
export function waitingOnViewer(list, viewer) {
  return (list || []).filter((a) => nextAction(a, viewer) != null).length;
}

/**
 * The Progress cell. Status first; the stored percentage only once it has
 * been set; the number of submissions when there are any. Never a fraction
 * of people, because delivery is not tracked per person.
 */
export function progressText(a) {
  const label = STATUS_LABEL[a?.status] || a?.status || NA;
  if (a?.status === 'in_progress' && Number(a.progress_pct) > 0) {
    return `${label} ${Math.round(Number(a.progress_pct))}%`;
  }
  return label;
}

/** "2 submissions, 5 assignees": the only delivery facts that exist. */
export function deliveryText(a, submissionCount) {
  const subs = Number(submissionCount ?? a?.version ?? 0) || 0;
  const people = (a?.assignees || []).length;
  const s = `${subs} ${subs === 1 ? 'submission' : 'submissions'}`;
  const p = `${people} ${people === 1 ? 'assignee' : 'assignees'}`;
  return `${s}, ${p}`;
}

/* ── Metrics (the KPI strip) ─────────────────────────────────────────────── */

const completionFor = (list) => {
  if (!list.length) return null;
  const done = list.filter((a) => TERMINAL_STATUSES.includes(a.status)).length;
  return Math.round((done / list.length) * 1000) / 10;
};

/**
 * Open, overdue, awaiting review and term completion, counted from the work
 * this viewer can see. The change versus last term needs two terms that both
 * have assignments; otherwise it is null and reads N/A.
 */
export function computeAssignmentMetrics(enriched, cohorts) {
  const list = enriched || [];
  const terms = cohorts || [];
  const currentCohort = terms.find((c) => c.is_current && !c.archived) || null;
  const priorCohort =
    terms.find((c) => c.id !== currentCohort?.id && !c.archived) ||
    terms.find((c) => c.id !== currentCohort?.id) ||
    null;
  const termList = currentCohort ? list.filter((a) => a.cohort_id === currentCohort.id) : list;
  let delta = null;
  if (currentCohort && priorCohort) {
    const priorRate = completionFor(list.filter((a) => a.cohort_id === priorCohort.id));
    const curRate = completionFor(list.filter((a) => a.cohort_id === currentCohort.id));
    if (priorRate != null && curRate != null) delta = Math.round((curRate - priorRate) * 10) / 10;
  }
  return {
    open: list.filter((a) => !a.archived).length,
    overdue: list.filter((a) => a.overdue).length,
    awaiting_review: list.filter((a) => ['submitted', 'under_review'].includes(a.status)).length,
    completion_rate_pct: completionFor(termList),
    completion_delta_pct: delta,
  };
}

export function tabCounts(assignments) {
  return Object.fromEntries(TAB_KEYS.map((k) => [k, filterByTab(assignments, k).length]));
}

/* ── Workload by team and cohort ─────────────────────────────────────────── */

/**
 * Open, overdue and awaiting-review work per sector team and per cohort,
 * counted only from the work this viewer can see. An assignment counts for a
 * team when the team was targeted or one of its assignees sits on it, so one
 * assignment can count for two teams. A cohort counts the work of its term.
 */
export function workloadRows(assignments, { roster = [], teams = [], cohorts = [] } = {}) {
  const open = (assignments || []).filter((a) => !a.archived);
  const teamOfMember = new Map(roster.map((m) => [m.member_id || m.id, m.team_id || null]));
  const tally = (rows) => ({
    open: rows.length,
    overdue: rows.filter((a) => a.overdue).length,
    awaiting_review: rows.filter((a) => ['submitted', 'under_review'].includes(a.status)).length,
  });
  const out = [];
  for (const t of teams) {
    const rows = open.filter(
      (a) =>
        (a.assignee_targets || []).some((x) => x.target_type === 'team' && x.target_id === t.id) ||
        (a.assignees || []).some((p) => teamOfMember.get(p.member_id) === t.id),
    );
    out.push({ key: `team:${t.id}`, name: t.name, kind: 'Team', ...tally(rows) });
  }
  for (const c of cohorts) {
    const rows = open.filter((a) => a.cohort_id === c.id);
    out.push({ key: `cohort:${c.id}`, name: c.name, kind: 'Cohort', ...tally(rows) });
  }
  return out
    .filter((r) => r.open > 0)
    .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
}

/** Submitted and under-review work, oldest due date first. */
export function reviewQueue(assignments) {
  return (assignments || [])
    .filter((a) => ['submitted', 'under_review'].includes(a.status))
    .sort(byDue);
}

/* ── Calendar ────────────────────────────────────────────────────────────── */

/** Dated assignments by day key. Undated work has no place on a calendar. */
export function byDay(assignments) {
  const map = new Map();
  for (const a of assignments || []) {
    const key = dayKey(a.due_date);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(a);
  }
  return map;
}

/** Six weeks, Sunday first, for the month holding `cursor` ({ y, m }). */
export function monthCells({ y, m }) {
  const first = new Date(Date.UTC(y, m, 1));
  const start = Date.UTC(y, m, 1 - first.getUTCDay());
  const out = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start + i * 86400000);
    out.push({
      key: d.toISOString().slice(0, 10),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === m,
    });
  }
  return out;
}
export function monthTitle({ y, m }) {
  return new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
export function shiftMonth({ y, m }, delta) {
  const d = new Date(Date.UTC(y, m + delta, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
}
/** The viewer's local calendar day, as a key and a month cursor. */
export function todayOf(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { key, cursor: { y, m } };
}

/* ── Export ──────────────────────────────────────────────────────────────── */

const EXPORT_STATUS = { ...STATUS_LABEL, assigned: 'Assigned' };

/** Columns: Title, Type, Status, Assignees, Due date, Progress %, Grade. */
export function exportRows(assignments) {
  return (assignments || []).map((a) => ({
    Title: a.title || '',
    Type: typeMeta(typeOf(a)).label,
    Status: a.overdue ? 'Overdue' : EXPORT_STATUS[a.status] || a.status,
    Assignees: (a.assignees || []).map((x) => x.name).join('; '),
    'Due date': a.due_date ? fmtDayYear(a.due_date) : '',
    'Progress %': typeof a.progress_pct === 'number' ? a.progress_pct : '',
    Grade: gradeText(a) || '',
  }));
}

/* A cell that starts with = + - @ (or a tab or return) would run as a formula
   when the file is opened in a spreadsheet. Prefix a quote so it reads as text. */
const csvSafe = (v) => {
  const s = String(v ?? '');
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};
export function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${csvSafe(v).replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join(
    '\n',
  );
}

/* ── New assignment form ─────────────────────────────────────────────────── */

export const EMPTY_FORM = {
  type: 'pitch',
  title: '',
  instructions: '',
  ticker: '',
  sector: '',
  due_date: '',
  require_upload: false,
  recurring: null,
  save_as_template: false,
  template_name: '',
  template_id: null,
};

const sameTarget = (a, b) =>
  a.target_type === b.target_type &&
  (a.target_id || null) === (b.target_id || null) &&
  (a.target_role || null) === (b.target_role || null);

export const hasTarget = (targets, t) => (targets || []).some((x) => sameTarget(x, t));

/** Targets combine, except the whole council, which stands alone. */
export function toggleTarget(targets, t) {
  const list = targets || [];
  if (hasTarget(list, t)) return list.filter((x) => !sameTarget(x, t));
  if (t.target_type === 'org') return [t];
  return [...list.filter((x) => x.target_type !== 'org'), t];
}

/** A template fills type, title, instructions, sector and the upload label. */
export function applyTemplate(form, tpl) {
  if (!tpl) return { ...form, template_id: null };
  return {
    ...form,
    type: TYPE_META[tpl.assignment_type] ? tpl.assignment_type : 'other',
    title: tpl.title || tpl.name || '',
    instructions: tpl.instructions || '',
    sector: tpl.sector || '',
    require_upload: Boolean(tpl.require_upload),
    template_id: tpl.id,
  };
}

/** { field: message } for a form that cannot be sent yet. Empty when valid. */
export function validateForm(form, targets) {
  const errors = {};
  if (!String(form?.title || '').trim()) errors.title = 'Enter a title.';
  if (!targets || targets.length === 0) errors.targets = 'Choose who this is assigned to.';
  if (form?.save_as_template && !String(form.template_name || form.title || '').trim()) {
    errors.template_name = 'Name the template.';
  }
  return errors;
}

/** The request body the create route already accepts. */
export function createBody(form, targets) {
  const type = form.type;
  return {
    title: form.title.trim(),
    instructions: form.instructions.trim() || null,
    assignment_type: type,
    ticker: type === 'pitch' ? form.ticker.trim().toUpperCase() || null : null,
    sector: ['pitch', 'coverage'].includes(type) ? form.sector.trim() || null : null,
    due_date: form.due_date || null,
    require_upload: Boolean(form.require_upload),
    recurring: form.recurring || null,
    save_as_template: Boolean(form.save_as_template),
    template_name: form.template_name.trim() || null,
    template_id: form.save_as_template ? null : form.template_id || null,
    assignees: targets.map(({ target_type, target_id, target_role }) => ({
      target_type,
      target_id: target_id || null,
      target_role: target_role || null,
    })),
  };
}

/** The same matching the server and the database use for a target. */
export function targetMatches(target, member) {
  if (!target || !member) return false;
  const lower = (v) => String(v || '').toLowerCase();
  const id = member.member_id || member.id;
  switch (target.target_type) {
    case 'org':
      return true;
    case 'member':
      return target.target_id === id;
    case 'team':
      return Boolean(member.team_id) && target.target_id === member.team_id;
    case 'cohort':
      return Boolean(member.cohort_id) && target.target_id === member.cohort_id;
    case 'role': {
      const want = lower(target.target_role);
      return (
        Boolean(want) && [member.role, member.title, member.sub_role].some((v) => lower(v) === want)
      );
    }
    default:
      return false;
  }
}

/* ── Sample content: writes that stay on the page ────────────────────────── */

const withRow = (bundle, id, patch) => {
  const assignments = bundle.board.assignments.map((a) => {
    if (a.id !== id) return a;
    const next = { ...a, ...patch };
    next.archived = TERMINAL_STATUSES.includes(next.status);
    next.overdue = deriveOverdue(next, bundle.now);
    return next;
  });
  const detail = bundle.details[id];
  const row = assignments.find((a) => a.id === id);
  return {
    ...bundle,
    board: { ...bundle.board, assignments },
    details: detail
      ? { ...bundle.details, [id]: { ...detail, assignment: { ...detail.assignment, ...row } } }
      : bundle.details,
  };
};
const withDetail = (bundle, id, patch) => ({
  ...bundle,
  details: { ...bundle.details, [id]: { ...bundle.details[id], ...patch } },
});
const refreshed = (bundle) => ({
  ...bundle,
  board: {
    ...bundle.board,
    metrics: computeAssignmentMetrics(bundle.board.assignments, bundle.board.cohorts),
    tab_counts: tabCounts(bundle.board.assignments),
  },
});

/**
 * Apply one action to the sample bundle and return { bundle, ok, error }.
 * It follows the same status path and the same rules as the server (a return
 * needs written feedback, only managers review and grade, only assignees or
 * managers start and submit), so a demo behaves like the live page. Nothing
 * is sent anywhere.
 */
export function applySampleAction(bundle, action, now = Date.now()) {
  const fail = (error) => ({ bundle, ok: false, error });
  const viewer = bundle.board.viewer;
  const me = viewer.userId;
  const myName = viewer.displayName || 'You';
  const stamp = new Date(now).toISOString();
  const seq = `${now}-${Math.round(Math.random() * 1e6)}`;

  if (action.type === 'create') {
    if (!viewer.canAssign) return fail('Only managers can assign work.');
    const errors = validateForm(action.form, action.targets);
    if (Object.keys(errors).length) return fail(Object.values(errors)[0]);
    const body = createBody(action.form, action.targets);
    const roster = bundle.board.roster;
    const people = roster.filter((m) => body.assignees.some((t) => targetMatches(t, m)));
    const id = `sample-assignment-new-${seq}`;
    const current = bundle.board.cohorts.find((c) => c.is_current);
    const cohortTarget = body.assignees.find((t) => t.target_type === 'cohort');
    const row = {
      id,
      org_id: 'sample',
      title: body.title,
      instructions: body.instructions,
      type: body.assignment_type,
      assignment_type: body.assignment_type,
      ticker: body.ticker,
      sector: body.sector,
      due_date: body.due_date ? `${body.due_date}T23:59:59Z` : null,
      status: 'assigned',
      progress_pct: 0,
      require_upload: body.require_upload,
      recurring: body.recurring,
      template_id: body.template_id,
      cohort_id: cohortTarget?.target_id || current?.id || null,
      assigned_by: me,
      assigner_name: myName,
      created_at: stamp,
      rubric_score: null,
      rubric_max: null,
      rubric_comment: null,
      assignees: people.map((m) => ({
        member_id: m.member_id,
        user_id: m.user_id,
        name: m.display_name,
        role: m.role,
      })),
      assignee_targets: body.assignees,
      assignee_name: people[0]?.display_name || null,
      attachment_count: 0,
      comment_count: 0,
      version: 0,
      mine: people.some((m) => m.user_id === me),
      by_me: true,
      team: Boolean(viewer.teamId) && people.some((m) => m.team_id === viewer.teamId),
      archived: false,
      overdue: false,
      is_demo: true,
    };
    row.overdue = deriveOverdue(row, now);
    let templates = bundle.board.templates;
    if (body.save_as_template) {
      templates = [
        {
          id: `sample-template-new-${seq}`,
          name: body.template_name || body.title,
          assignment_type: body.assignment_type,
          title: body.title,
          instructions: body.instructions,
          sector: body.sector,
          require_upload: body.require_upload,
          is_demo: true,
        },
        ...templates,
      ];
    }
    const next = {
      ...bundle,
      board: { ...bundle.board, assignments: [row, ...bundle.board.assignments], templates },
      details: {
        ...bundle.details,
        [id]: { assignment: row, submissions: [], comments: [], attachments: [] },
      },
    };
    return { bundle: refreshed(next), ok: true, id };
  }

  const row = bundle.board.assignments.find((a) => a.id === action.id);
  const detail = bundle.details[action.id];
  if (!row || !detail) return fail('Not found');
  const isManager = Boolean(viewer.canAssign);
  const isAssignee = Boolean(row.mine);

  const move = (to, patch = {}) => {
    if (MANAGER_STATUSES.includes(to) && !isManager) return fail('Manager role required');
    if (ASSIGNEE_STATUSES.includes(to) && !isAssignee && !isManager) return fail('Not allowed');
    if (!canMove(row.status, to)) return fail(`Cannot move from '${row.status}' to '${to}'`);
    return { bundle: refreshed(withRow(bundle, row.id, { status: to, ...patch })), ok: true };
  };

  switch (action.type) {
    case 'start':
      return move('in_progress');
    case 'review':
      return move('under_review');
    case 'approve':
      return move('complete');
    case 'grade': {
      const patch = {};
      if (action.max !== '' && action.max != null) {
        patch.rubric_max = Math.max(0, Math.round(Number(action.max) || 0));
      }
      if (action.score !== '' && action.score != null) {
        patch.rubric_score = Math.max(0, Math.round(Number(action.score) || 0));
      }
      if (action.comment) patch.rubric_comment = String(action.comment).slice(0, 2000);
      return move('graded', patch);
    }
    case 'return': {
      const text = String(action.comment || '').trim();
      if (!text) return fail('A comment is required when returning for revision');
      const res = move('returned');
      if (!res.ok) return res;
      const comments = [
        ...detail.comments,
        {
          id: `sample-comment-new-${seq}`,
          author_id: me,
          author_name: myName,
          body: text,
          is_return: true,
          created_at: stamp,
          is_demo: true,
        },
      ];
      const next = withRow(withDetail(res.bundle, row.id, { comments }), row.id, {
        comment_count: comments.length,
      });
      return { bundle: next, ok: true };
    }
    case 'submit': {
      if (!isAssignee && !isManager) return fail('Only the assignee can submit');
      if (!canMove(row.status, 'submitted')) {
        return fail(`Cannot move from '${row.status}' to 'submitted'`);
      }
      const version = detail.submissions.reduce((m, s) => Math.max(m, s.version || 0), 0) + 1;
      const submissions = [
        {
          id: `sample-submission-new-${seq}`,
          submitted_by: me,
          submitter_name: myName,
          version,
          note: action.note ? String(action.note).slice(0, 2000) : null,
          created_at: stamp,
          is_demo: true,
        },
        ...detail.submissions,
      ];
      const next = withRow(withDetail(bundle, row.id, { submissions }), row.id, {
        status: 'submitted',
        version,
      });
      return { bundle: refreshed(next), ok: true };
    }
    case 'comment': {
      const text = String(action.body || '').trim();
      if (!text) return fail('Comment body required');
      const comments = [
        ...detail.comments,
        {
          id: `sample-comment-new-${seq}`,
          author_id: me,
          author_name: myName,
          body: text.slice(0, 4000),
          is_return: false,
          created_at: stamp,
          is_demo: true,
        },
      ];
      return {
        bundle: withRow(withDetail(bundle, row.id, { comments }), row.id, {
          comment_count: comments.length,
        }),
        ok: true,
      };
    }
    case 'upload': {
      const attachments = [
        {
          id: `sample-file-new-${seq}`,
          file_name: action.file?.name || 'file',
          size_bytes: action.file?.size || 0,
          uploaded_by: me,
          uploader_name: myName,
          created_at: stamp,
          signed_url: null,
          is_demo: true,
        },
        ...detail.attachments,
      ];
      return {
        bundle: withRow(withDetail(bundle, row.id, { attachments }), row.id, {
          attachment_count: attachments.length,
        }),
        ok: true,
      };
    }
    case 'deleteFile': {
      const file = detail.attachments.find((f) => f.id === action.attachmentId);
      if (!file) return fail('Not found');
      if (!isManager && file.uploaded_by !== me) {
        return fail('Only the uploader or a manager can delete this file.');
      }
      const attachments = detail.attachments.filter((f) => f.id !== action.attachmentId);
      return {
        bundle: withRow(withDetail(bundle, row.id, { attachments }), row.id, {
          attachment_count: attachments.length,
        }),
        ok: true,
      };
    }
    default:
      return fail('Unknown action');
  }
}
