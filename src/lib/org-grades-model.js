/**
 * Grades (/org-team-hub/grades): the page model.
 *
 * Pure: no React, no fetch, no server imports. Shared by the page, the grades
 * route (input checks), the sample bundle and the tests, so a rule is written
 * once.
 *
 * A grade record is one entry for one member: a kind of work, a score, a
 * maximum (100 unless changed), an optional letter, optional feedback, an
 * optional stored rubric, the executive who entered or last changed it, the
 * member's cohort, and the dates it was made and last changed. There is no
 * term, weight, draft state, history or score-to-letter scale, and nothing
 * here invents one.
 */

export const NA = 'N/A';
export const MAX_FEEDBACK = 4000;
export const MAX_LETTER = 4;
export const DEFAULT_MAX = 100;
/** "Recently changed": last changed within this many days. */
export const RECENT_DAYS = 14;
const DAY = 86400000;

export const WORK_KINDS = [
  { key: 'pitch', label: 'Pitch', icon: 'bi-display' },
  { key: 'research_note', label: 'Research note', icon: 'bi-file-earmark-text' },
  { key: 'coverage', label: 'Coverage', icon: 'bi-layers' },
  { key: 'participation', label: 'Participation', icon: 'bi-people' },
  { key: 'overall', label: 'Overall', icon: 'bi-calculator' },
];
export const WORK_KEYS = WORK_KINDS.map((k) => k.key);
/** Kinds that count toward an average. Overall summarises the others. */
export const SCORED_KINDS = WORK_KINDS.filter((k) => k.key !== 'overall');
export const GRADED_ROLES = ['analyst', 'portfolio_manager'];

export const kindOf = (key) => WORK_KINDS.find((k) => k.key === key) || null;
export const kindLabel = (key) => kindOf(key)?.label || 'Other';
export const kindIcon = (key) => kindOf(key)?.icon || 'bi-journal';

export const TABS = [
  { key: 'all', label: 'All' },
  { key: 'feedback', label: 'Needs feedback', title: 'Grades with no written feedback' },
  { key: 'rubric', label: 'With rubric', title: 'Grades with a stored rubric breakdown' },
  {
    key: 'recent',
    label: 'Recently changed',
    title: `Entered or last changed in the past ${RECENT_DAYS} days`,
  },
];
export const MEMBER_TABS = TABS.filter((t) => t.key !== 'feedback');
export const VIEWS = [
  { key: 'grades', label: 'Council grades' },
  { key: 'cohort', label: 'By cohort' },
  { key: 'ungraded', label: 'Members without grades' },
];

export const roleLabel = (role) =>
  role === 'portfolio_manager'
    ? 'Portfolio manager'
    : role === 'analyst'
      ? 'Analyst'
      : role === 'executive'
        ? 'Executive'
        : 'Member';

/* ── Numbers ─────────────────────────────────────────────────────────────── */
const isNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const trimNum = (v) => {
  const n = Number(v);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
};

/** Score over maximum as a percentage, or null when it cannot be worked out. */
export function pctOf(g) {
  if (!g || !isNum(g.score)) return null;
  const max = isNum(g.max_score) ? Number(g.max_score) : DEFAULT_MAX;
  if (!(max > 0)) return null;
  return (Number(g.score) / max) * 100;
}

/** "91/100", or N/A when there is no score. */
export function fmtScore(g) {
  if (!g || !isNum(g.score)) return NA;
  const max = isNum(g.max_score) ? g.max_score : DEFAULT_MAX;
  return `${trimNum(g.score)}/${trimNum(max)}`;
}

export const fmtPct = (v) => (v === null || v === undefined ? NA : `${Math.round(v)}%`);

/**
 * Average of scored work: the unweighted mean of score over maximum across
 * entries that have a score, leaving out Overall entries (they summarise
 * the others). Returns { value, n }; value is null when nothing counts.
 */
export function averageOf(grades) {
  const pcts = (grades || [])
    .filter((g) => g.work_type !== 'overall')
    .map(pctOf)
    .filter((v) => v !== null);
  if (!pcts.length) return { value: null, n: 0 };
  return { value: pcts.reduce((a, b) => a + b, 0) / pcts.length, n: pcts.length };
}

/* ── Dates ───────────────────────────────────────────────────────────────── */
export const lastChangedOf = (g) => g?.updated_at || g?.created_at || null;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jan 19", with the year when it is not the current one. */
export function fmtDay(iso, now = Date.now()) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  const base = `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
  return d.getFullYear() === new Date(now).getFullYear() ? base : `${base}, ${d.getFullYear()}`;
}

export function isRecent(g, now = Date.now()) {
  const t = Date.parse(lastChangedOf(g) || '');
  return Number.isFinite(t) && now - t <= RECENT_DAYS * DAY && t <= now + DAY;
}

/** True when the entry was changed after it was entered. */
export function wasChanged(g) {
  const a = Date.parse(g?.created_at || '');
  const b = Date.parse(g?.updated_at || '');
  return Number.isFinite(a) && Number.isFinite(b) && b - a > 60000;
}

/* ── Rubric ──────────────────────────────────────────────────────────────── */
const criterionName = (k) => {
  const s = String(k || '')
    .replace(/[_-]+/g, ' ')
    .trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Criterion';
};

/**
 * A stored rubric is free form. Accepts { name: points },
 * { name: { points, max } } and [{ name|criterion|label, points|score,
 * max|out_of }]. Returns [{ name, points, max }] (points and max may be null).
 */
export function rubricRows(rubric) {
  if (!rubric || typeof rubric !== 'object') return [];
  const num = (v) => (isNum(v) ? Number(v) : null);
  if (Array.isArray(rubric)) {
    return rubric
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({
        name: criterionName(r.name ?? r.criterion ?? r.label),
        points: num(r.points ?? r.score),
        max: num(r.max ?? r.out_of ?? r.max_points),
      }));
  }
  return Object.entries(rubric).map(([k, v]) =>
    v && typeof v === 'object'
      ? {
          name: criterionName(k),
          points: num(v.points ?? v.score),
          max: num(v.max ?? v.out_of ?? v.max_points),
        }
      : { name: criterionName(k), points: num(v), max: null },
  );
}
export const hasRubric = (g) => rubricRows(g?.rubric).length > 0;
export const hasFeedback = (g) => Boolean(String(g?.feedback || '').trim());

/* ── Filters ─────────────────────────────────────────────────────────────── */
const byLastChanged = (a, b) =>
  Date.parse(lastChangedOf(b) || 0) - Date.parse(lastChangedOf(a) || 0) ||
  Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0);

/** Newest first by date entered (the order the page has always used). */
export const newestFirst = (grades) =>
  [...(grades || [])].sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));

function matchesTab(g, tab, now) {
  if (tab === 'feedback') return !hasFeedback(g);
  if (tab === 'rubric') return hasRubric(g);
  if (tab === 'recent') return isRecent(g, now);
  return true;
}

/**
 * @param {object[]} grades
 * @param {{ tab?: string, cohort?: string, kind?: string, search?: string, now?: number }} f
 */
export function filterGrades(
  grades,
  { tab = 'all', cohort = 'all', kind = 'all', search = '', now = Date.now() } = {},
) {
  const q = search.trim().toLowerCase();
  const out = (grades || []).filter(
    (g) =>
      matchesTab(g, tab, now) &&
      (cohort === 'all' || (cohort === 'none' ? !g.cohort_id : g.cohort_id === cohort)) &&
      (kind === 'all' || g.work_type === kind) &&
      (!q ||
        String(g.student_name || '')
          .toLowerCase()
          .includes(q) ||
        String(g.feedback || '')
          .toLowerCase()
          .includes(q)),
  );
  return tab === 'recent' ? out.sort(byLastChanged) : newestFirst(out);
}

export function tabCounts(grades, now = Date.now()) {
  const out = {};
  for (const t of TABS) out[t.key] = (grades || []).filter((g) => matchesTab(g, t.key, now)).length;
  return out;
}

/* ── Summaries (executive view only; built from the council's records) ──── */
export function councilMetrics(roster, grades) {
  const ids = new Set((roster || []).map((m) => m.user_id));
  const graded = new Set(
    (grades || []).filter((g) => ids.has(g.student_id)).map((g) => g.student_id),
  );
  return {
    gradedMembers: graded.size,
    rosterCount: ids.size,
    average: averageOf(grades).value,
    noGrade: ids.size - graded.size,
    noFeedback: (grades || []).filter((g) => !hasFeedback(g)).length,
  };
}

export function memberMetrics(grades) {
  const sorted = [...(grades || [])].sort(byLastChanged);
  return {
    average: averageOf(grades).value,
    entries: (grades || []).length,
    noFeedback: (grades || []).filter((g) => !hasFeedback(g)).length,
    lastChanged: sorted.length ? lastChangedOf(sorted[0]) : null,
  };
}

/** Per scored kind: members with a scored entry of that kind, and the average. */
export function councilSummary(grades) {
  return SCORED_KINDS.map((k) => {
    const rows = (grades || []).filter((g) => g.work_type === k.key);
    const members = new Set(rows.filter((g) => pctOf(g) !== null).map((g) => g.student_id));
    return {
      key: k.key,
      label: k.label,
      icon: k.icon,
      graded: members.size,
      average: averageOf(rows).value,
    };
  });
}

/** One row per cohort that has graded-role members, plus "No cohort" when needed. */
export function cohortSummary(roster, grades, cohorts) {
  const groups = new Map();
  for (const c of cohorts || []) groups.set(c.id, { id: c.id, name: c.name, members: [] });
  for (const m of roster || []) {
    const key = m.cohort_id && groups.has(m.cohort_id) ? m.cohort_id : 'none';
    if (!groups.has(key)) groups.set(key, { id: 'none', name: 'No cohort', members: [] });
    groups.get(key).members.push(m);
  }
  return [...groups.values()]
    .filter((g) => g.members.length)
    .map((g) => {
      const ids = new Set(g.members.map((m) => m.user_id));
      const rows = (grades || []).filter((x) => ids.has(x.student_id));
      const graded = new Set(rows.map((x) => x.student_id)).size;
      return {
        id: g.id,
        name: g.name,
        members: g.members,
        size: ids.size,
        graded,
        noGrade: ids.size - graded,
        average: averageOf(rows).value,
      };
    });
}

export function membersWithoutGrades(roster, grades) {
  const graded = new Set((grades || []).map((g) => g.student_id));
  return (roster || []).filter((m) => !graded.has(m.user_id));
}

/** The record for one member, built from that member's entries only. */
export function memberRecord(entries) {
  const list = newestFirst(entries);
  const byKind = WORK_KINDS.map((k) => {
    const rows = list.filter((g) => g.work_type === k.key);
    return rows.length
      ? { key: k.key, label: k.label, icon: k.icon, latest: rows[0], count: rows.length }
      : null;
  }).filter(Boolean);
  return { ...memberMetrics(list), entries: list, byKind };
}

/** "2026" from "2026 analyst class"; otherwise the name. */
export function cohortShort(name) {
  if (!name) return NA;
  const m = /^(\d{4})\b/.exec(String(name));
  return m ? m[1] : String(name);
}

/* ── Entering and changing a grade ───────────────────────────────────────── */
export function blankForm(studentId = '') {
  return {
    student_id: studentId,
    work_type: 'pitch',
    score: '',
    max_score: String(DEFAULT_MAX),
    letter: '',
    feedback: '',
  };
}

export function formFromGrade(g) {
  return {
    student_id: g.student_id || '',
    work_type: g.work_type || 'pitch',
    score: isNum(g.score) ? String(g.score) : '',
    max_score: isNum(g.max_score) ? String(g.max_score) : String(DEFAULT_MAX),
    letter: g.letter || '',
    feedback: g.feedback || '',
  };
}

/**
 * Checks shared by the dialog and the grades route. `form` holds strings or
 * numbers. Returns { field: message } (empty when valid).
 */
export function validateGrade(form, { mode = 'new' } = {}) {
  const e = {};
  if (mode === 'new') {
    if (!form.student_id) e.student_id = 'Choose a member.';
    if (!WORK_KEYS.includes(form.work_type)) e.work_type = 'Choose a kind of work.';
  }
  const maxRaw = form.max_score;
  const max = isNum(maxRaw) ? Number(maxRaw) : maxRaw === '' || maxRaw == null ? DEFAULT_MAX : NaN;
  if (!(max > 0)) e.max_score = 'Out of must be more than 0.';
  if (form.score === '' || form.score === null || form.score === undefined) {
    e.score = 'Enter a score.';
  } else if (!isNum(form.score)) {
    e.score = 'The score must be a number.';
  } else if (Number(form.score) < 0) {
    e.score = 'The score cannot be negative.';
  } else if (max > 0 && Number(form.score) > max) {
    e.score = `The score cannot be more than ${trimNum(max)}.`;
  }
  if (String(form.letter || '').trim().length > MAX_LETTER)
    e.letter = `Up to ${MAX_LETTER} characters.`;
  if (String(form.feedback || '').length > MAX_FEEDBACK)
    e.feedback = `Up to ${MAX_FEEDBACK} characters.`;
  return e;
}

/** The request body for the grades route. */
export function gradeBody(form) {
  const max = isNum(form.max_score) ? Number(form.max_score) : DEFAULT_MAX;
  return {
    student_id: form.student_id,
    work_type: form.work_type,
    score: isNum(form.score) ? Number(form.score) : null,
    max_score: max,
    letter: String(form.letter || '').trim() || null,
    feedback: String(form.feedback || '').trim() || null,
  };
}

/* ── What a member receives ──────────────────────────────────────────────── */
/**
 * The fields of one of their own grades a member is sent. No ids of other
 * people, no cohort, no linked work: only what the member view shows.
 */
export function memberGradeView(g) {
  return {
    id: g.id,
    work_type: g.work_type,
    score: g.score ?? null,
    max_score: g.max_score ?? DEFAULT_MAX,
    letter: g.letter || null,
    feedback: g.feedback || null,
    rubric: g.rubric || null,
    grader_name: g.grader_name || null,
    created_at: g.created_at || null,
    updated_at: g.updated_at || null,
    ...(g.is_demo ? { is_demo: true } : {}),
  };
}

/* ── Sample content: actions applied on the page only ────────────────────── */
/**
 * Applies one dialog action to a sample bundle with the same checks as the
 * route. Returns { ok, bundle, id, error }. Nothing is sent anywhere.
 */
export function applySampleAction(bundle, action, now = Date.now()) {
  if (!bundle?.viewer?.canGrade) return { ok: false, error: 'Only executives can enter grades.' };
  const errors = validateGrade(action.form || {}, {
    mode: action.type === 'update' ? 'edit' : 'new',
  });
  if (Object.keys(errors).length) return { ok: false, error: Object.values(errors)[0] };
  const body = gradeBody(action.form);
  const at = new Date(now).toISOString();
  const grader = { graded_by: bundle.viewer.userId, grader_name: bundle.viewer.name || 'You' };
  if (action.type === 'create') {
    const student = (bundle.roster || []).find((m) => m.user_id === body.student_id);
    if (!student) return { ok: false, error: 'That member cannot be graded here.' };
    const id = `sample-grade-new-${now}`;
    const row = {
      id,
      ...body,
      ...grader,
      rubric: null,
      cohort_id: student.cohort_id || null,
      student_name: student.display_name,
      created_at: at,
      updated_at: at,
      is_demo: true,
    };
    return { ok: true, id, bundle: { ...bundle, grades: [row, ...bundle.grades] } };
  }
  if (action.type === 'update') {
    const found = bundle.grades.find((g) => g.id === action.id);
    if (!found) return { ok: false, error: 'That grade was not found.' };
    const { student_id: _s, work_type: _w, ...changes } = body;
    const grades = bundle.grades.map((g) =>
      g.id === action.id ? { ...g, ...changes, ...grader, updated_at: at } : g,
    );
    return { ok: true, id: action.id, bundle: { ...bundle, grades } };
  }
  return { ok: false, error: 'Unknown action' };
}
