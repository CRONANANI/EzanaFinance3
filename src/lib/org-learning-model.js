/**
 * Council learning on the Learning Center (/learning-center): the pure model
 * behind the council band. No React, no fetch, no server imports, so the live
 * route, the sample bundle, the band and the tests all count the same way.
 *
 * Inputs are the payload of GET /api/org/learning (or the sample bundle in the
 * same shape):
 *   assignments    the council assignments the viewer may see (Assignments'
 *                  own loader); for a member who is not a manager only their own
 *   learningItems  the viewer's own council learning items (assigned material)
 *   content        the council's learning material (the council path)
 *   onboarding     the viewer's own cohort checklist and their own completion
 *   grades         the viewer's own grades only (member shape)
 *   roster, learningScores   managers only: who can be assigned work, and the
 *                  Learning category of the council rating (0 to 100)
 *
 * Honesty rules: a missing value reads N/A, never 0. Nothing here reads course
 * progress of anyone but the viewer, and the viewer's own progress only feeds
 * the default path's counts on the viewer's own screen. Status is always a word
 * (with an optional icon), never colour alone.
 */

export const NA = 'N/A';
const DAY = 86400000;
export const DUE_SOON_DAYS = 3;
export const WEEK_DAYS = 7;

export const LINKS = {
  assignments: '/org-team-hub/assignments',
  assignment: (id) => `/org-team-hub/assignments?a=${encodeURIComponent(id)}`,
  grades: '/org-team-hub/grades',
  cohorts: '/org-team-hub/cohorts',
  recognition: '/org-team-hub/recognition',
};

export const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const TERMINAL = ['complete', 'graded'];
const REVIEW = ['submitted', 'under_review'];
/* Assignment types that count as learning work on this page. */
export const LEARNING_TYPES = ['reading'];

export const ROLE_LABEL = {
  analyst: 'Analyst',
  portfolio_manager: 'Portfolio manager',
  executive: 'Executive',
};
export const roleLabel = (role, subRole) => subRole || ROLE_LABEL[role] || 'Member';

const CONTENT_LABEL = {
  document: 'Document',
  video: 'Video',
  presentation: 'Presentation',
  article: 'Article',
  quiz: 'Quiz',
};
const CONTENT_ICON = {
  document: 'bi-file-earmark-text',
  video: 'bi-play-circle',
  presentation: 'bi-easel',
  article: 'bi-newspaper',
  quiz: 'bi-patch-question',
};
export const contentLabel = (t) => CONTENT_LABEL[t] || 'Material';
export const contentIcon = (t) => CONTENT_ICON[t] || 'bi-journal-text';

const GRADE_LABEL = {
  overall: 'Overall',
  participation: 'Participation',
  pitch: 'Pitch',
  research_note: 'Research note',
  coverage: 'Coverage',
};
/* What each grade counts, shown under it: a description, never a judgement. */
const GRADE_NOTE = {
  overall: 'The overall grade your council entered for the term.',
  participation: 'Participation as entered by your council.',
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const time = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

/** "Jan 24" in UTC, or N/A. */
export function fmtDay(v) {
  const t = time(v);
  if (t == null) return NA;
  return new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function fmtScore(score, max) {
  if (!isNum(score)) return NA;
  return `${Math.round(score * 10) / 10} / ${isNum(max) ? max : 100}`;
}

export const fmtLearning = (v) => (isNum(v) ? String(Math.round(v)) : NA);

/* ── Status ────────────────────────────────────────────────────────────── */

const STATUS = {
  overdue: { label: 'Overdue', icon: 'bi-exclamation-triangle', warn: true },
  due_soon: { label: 'Due soon', icon: 'bi-clock' },
  assigned: { label: 'Assigned', icon: 'bi-circle' },
  in_progress: { label: 'In progress', icon: 'bi-circle-half' },
  submitted: { label: 'Submitted', icon: 'bi-send' },
  under_review: { label: 'In review', icon: 'bi-hourglass-split' },
  returned: { label: 'Returned', icon: 'bi-arrow-return-left' },
  done: { label: 'Done', icon: 'bi-check2-circle' },
};
export const statusMeta = (key) => STATUS[key] || STATUS.assigned;

/**
 * The word shown for a piece of work. Done and handed-in work keeps its
 * status; open work that is past due reads Overdue, open work due within
 * three days reads Due soon.
 */
export function statusKey({ status, due_date: due }, now = Date.now()) {
  if (TERMINAL.includes(status) || status === 'completed') return 'done';
  if (status === 'submitted' || status === 'under_review' || status === 'returned') return status;
  const t = time(due);
  if (t != null && t < now) return 'overdue';
  if (t != null && t - now <= DUE_SOON_DAYS * DAY) return 'due_soon';
  return status === 'in_progress' ? 'in_progress' : 'assigned';
}

const isOpenKey = (k) => k !== 'done';

/* ── Assigned to me ────────────────────────────────────────────────────── */

/**
 * The viewer's own learning work: Reading assignments given to them, plus the
 * council learning items assigned to them. Open work first by due date, then
 * at most two finished items. `others` counts the viewer's open assignments of
 * other types (they live on Assignments).
 */
export function assignedRows({ assignments, learningItems }, now = Date.now(), limit = 6) {
  const mine = (assignments || []).filter((a) => a && a.mine !== false);
  const rows = [];
  let others = 0;
  for (const a of mine) {
    const type = a.type || a.assignment_type;
    const key = statusKey(a, now);
    if (!LEARNING_TYPES.includes(type)) {
      if (isOpenKey(key)) others += 1;
      continue;
    }
    rows.push({
      id: `a:${a.id}`,
      title: a.title || 'Assignment',
      kind: 'reading',
      icon: 'bi-book',
      due: a.due_date || null,
      status: key,
      href: LINKS.assignment(a.id),
      external: false,
      demo: Boolean(a.is_demo),
    });
  }
  for (const it of learningItems || []) {
    if (!it) continue;
    rows.push({
      id: `l:${it.id}`,
      title: it.title || 'Council material',
      kind: 'council',
      icon: contentIcon(it.content_type),
      due: it.due_date || null,
      status: statusKey(it, now),
      href: it.url || null,
      external: Boolean(it.url),
      demo: Boolean(it.is_demo),
    });
  }
  const dueOf = (r) => time(r.due) ?? Number.MAX_SAFE_INTEGER;
  const open = rows.filter((r) => isOpenKey(r.status)).sort((a, b) => dueOf(a) - dueOf(b));
  const done = rows
    .filter((r) => !isOpenKey(r.status))
    .sort((a, b) => dueOf(b) - dueOf(a))
    .slice(0, 2);
  return {
    rows: [...open, ...done].slice(0, limit),
    open: open.length,
    overdue: open.filter((r) => r.status === 'overdue').length,
    nextDue: open.find((r) => time(r.due) != null)?.due || null,
    others,
  };
}

/* ── Onboarding gate ───────────────────────────────────────────────────── */

/**
 * The viewer's own checklist. `ready` is "Ready to pitch": the gate is on and
 * every gate task is done (or the gate is off and every task is done).
 * Returns null when the viewer has no cohort checklist.
 */
export function onboardingView(onb) {
  if (!onb || !Array.isArray(onb.tasks) || onb.tasks.length === 0) return null;
  const tasks = [...onb.tasks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const done = tasks.filter((t) => t.done).length;
  const gateMissing = tasks.filter((t) => t.is_gate && !t.done).length;
  const remaining = tasks.length - done;
  const gateOn = Boolean(onb.gateEnabled);
  return {
    cohortName: onb.cohortName || null,
    gateOn,
    tasks,
    done,
    total: tasks.length,
    remaining,
    gateMissing,
    ready: gateOn ? gateMissing === 0 : remaining === 0,
  };
}

/* ── My grades ─────────────────────────────────────────────────────────── */

/**
 * The newest Overall and Participation grade from the viewer's own grades,
 * plus how many other grades they have. Never coloured; never weighted.
 */
export function gradeRows(grades) {
  const list = (grades || []).filter(Boolean);
  const newest = (kind) =>
    list
      .filter((g) => g.work_type === kind)
      .sort(
        (a, b) =>
          (time(b.updated_at || b.created_at) || 0) - (time(a.updated_at || a.created_at) || 0),
      )[0] || null;
  const rows = ['participation', 'overall'].map((kind) => {
    const g = newest(kind);
    return {
      kind,
      label: GRADE_LABEL[kind],
      score: g ? fmtScore(g.score, g.max_score) : NA,
      letter: g?.letter || NA,
      note: GRADE_NOTE[kind],
      graded: Boolean(g),
      demo: Boolean(g?.is_demo),
    };
  });
  const shown = rows.filter((r) => r.graded).length;
  return { rows, total: list.length, more: Math.max(0, list.length - shown) };
}

/* ── Council path ──────────────────────────────────────────────────────── */

/**
 * The default order for a new analyst when the council has added no material
 * of its own: Stocks & Investing Bronze and Silver, then Risk Management
 * Bronze. Counts are the viewer's own progress.
 */
export const DEFAULT_PATH = [
  { track: 'stocks', level: 'basic', label: 'Stocks & Investing, Bronze level' },
  { track: 'stocks', level: 'intermediate', label: 'Stocks & Investing, Silver level' },
  { track: 'risk', level: 'basic', label: 'Risk & Psychology, Bronze level' },
];

/** Council material, oldest first (the order it was added). */
export function pathItems(content) {
  return (content || [])
    .filter((c) => c && c.title)
    .sort((a, b) => (time(a.created_at) || 0) - (time(b.created_at) || 0))
    .map((c) => ({
      id: c.id,
      title: c.title,
      kind: contentLabel(c.content_type),
      icon: contentIcon(c.content_type),
      href: c.url || null,
      demo: Boolean(c.is_demo),
    }));
}

/* ── Team progress (managers) ──────────────────────────────────────────── */

/**
 * Per member: assignments visible to the viewer that name them, how many are
 * done (complete or graded), open work due in the next seven days, overdue
 * work, and their Learning score from the council rating. The viewer is left
 * out. Course progress is never part of this.
 */
export function teamRows({ assignments, roster, learningScores, viewerUserId }, now = Date.now()) {
  const people = new Map();
  for (const m of roster || []) {
    if (!m?.member_id || m.user_id === viewerUserId || m.role === 'executive') continue;
    people.set(m.member_id, {
      memberId: m.member_id,
      name: m.display_name || 'Member',
      role: m.role,
      total: 0,
      done: 0,
      dueWeek: 0,
      overdue: 0,
      learning: isNum(learningScores?.[m.member_id]) ? learningScores[m.member_id] : null,
    });
  }
  for (const a of assignments || []) {
    const t = time(a.due_date);
    const doneA = TERMINAL.includes(a.status);
    for (const p of a.assignees || []) {
      const row = people.get(p.member_id);
      if (!row) continue;
      row.total += 1;
      if (doneA) row.done += 1;
      else if (t != null && t < now) row.overdue += 1;
      else if (t != null && t - now <= WEEK_DAYS * DAY) row.dueWeek += 1;
    }
  }
  return [...people.values()]
    .filter((r) => r.total > 0 || r.learning != null)
    .sort((a, b) => b.overdue - a.overdue || a.name.localeCompare(b.name));
}

/* ── Advisor queue (executives) ────────────────────────────────────────── */

/**
 * Work that is overdue or handed in and waiting for review, overdue first,
 * then oldest due date.
 */
export function advisorQueue(assignments, now = Date.now(), limit = 6) {
  const rows = [];
  for (const a of assignments || []) {
    if (!a || TERMINAL.includes(a.status)) continue;
    const t = time(a.due_date);
    const review = REVIEW.includes(a.status);
    const overdue = !review && t != null && t < now;
    if (!review && !overdue) continue;
    rows.push({
      id: a.id,
      title: a.title || 'Assignment',
      who:
        (a.assignees || [])
          .map((p) => p.name)
          .filter(Boolean)
          .join(', ') || NA,
      due: a.due_date || null,
      status: overdue ? 'overdue' : a.status,
      href: LINKS.assignment(a.id),
      demo: Boolean(a.is_demo),
    });
  }
  rows.sort(
    (a, b) =>
      (a.status === 'overdue' ? 0 : 1) - (b.status === 'overdue' ? 0 : 1) ||
      (time(a.due) ?? Number.MAX_SAFE_INTEGER) - (time(b.due) ?? Number.MAX_SAFE_INTEGER),
  );
  return { rows: rows.slice(0, limit), total: rows.length };
}

/* ── Context strip ─────────────────────────────────────────────────────── */

/** Learning context only: council, the viewer's role and cohort, open work. */
export function contextFigures({ council, viewer, onboarding }, assigned) {
  return {
    council: council?.name || NA,
    university: council?.university || null,
    role: roleLabel(viewer?.role, viewer?.subRole),
    cohort: onboarding?.cohortName || viewer?.cohortName || NA,
    open: assigned ? String(assigned.open) : NA,
    nextDue: assigned ? fmtDay(assigned.nextDue) : NA,
  };
}

export const isManager = (viewer) => MANAGER_ROLES.includes(viewer?.role);
export const isExecutive = (viewer) => viewer?.role === 'executive';
