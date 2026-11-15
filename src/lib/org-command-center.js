/**
 * Command Center (Team Hub home) model: formatting and the derivations the
 * page draws, kept pure (no React, no I/O) so they can be tested and so the
 * components stay thin. Everything here is computed from payloads the page
 * already loads. Nothing is invented: a missing input yields null and the
 * page prints N/A.
 */
import { buildTeamCalendar } from './org-team-calendar.js';

export const NA = 'N/A';
const DAY_MS = 86400000;

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** $240.05K, $1.24M, $950.00. Missing reads N/A. */
export function fmtMoneyCompact(v) {
  const n = num(v);
  if (n == null) return NA;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

/** $240,050.12 */
export function fmtMoney(v) {
  const n = num(v);
  if (n == null) return NA;
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** +46.13%, -0.92%. Missing reads N/A. */
export function fmtSignedPct(v, digits = 2) {
  const n = num(v);
  if (n == null) return NA;
  return `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(digits)}%`;
}

/** 'pos' | 'neg' | 'na' for colouring a signed figure. Missing is never positive. */
export function toneOf(v) {
  const n = num(v);
  if (n == null) return 'na';
  return n >= 0 ? 'pos' : 'neg';
}

/** Nov 12, 2026 (UTC, so a date-only value never shifts a day). */
export function fmtDate(v) {
  if (!v) return NA;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? `${v}T00:00:00Z` : v;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return NA;
  return new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "Amara Tesfaye" reads "A. Tesfaye" in a narrow owner column. */
export function shortName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return NA;
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

/** The benchmark as the page names it. An estimate is always labelled. */
export function benchmarkInfo(perf) {
  const source = perf?.benchmark_source || null;
  const symbol = perf?.benchmark_symbol || null;
  if (source === 'index' && symbol) {
    return { label: symbol, estimated: false, sourceText: 'Benchmark source: market prices' };
  }
  if (source === 'pitch_proxy') {
    return {
      label: 'Pitch benchmark (est.)',
      estimated: true,
      sourceText: 'Benchmark source: an estimate from past pitch results, not index prices',
    };
  }
  return { label: NA, estimated: false, sourceText: 'No benchmark is set' };
}

/* ── Counts ─────────────────────────────────────────────────────────────── */

/** Dated items (meetings, open tasks, open assignments) in the next 7 days. */
export function dueThisWeek({ meetings, tasks, assignments, now = Date.now() } = {}) {
  return buildTeamCalendar({ meetings, tasks, assignments, now, horizonDays: 7, limit: 1000 })
    .length;
}

/* ── Chart ──────────────────────────────────────────────────────────────── */

export const CHART_RANGES = ['1M', '3M', 'YTD', '1Y'];
const RANGE_DAYS = { '1M': 31, '3M': 92, '1Y': 365 };

export function sliceSnapshots(snapshots, range, now = Date.now()) {
  const all = Array.isArray(snapshots) ? snapshots : [];
  let from;
  if (range === 'YTD') from = Date.UTC(new Date(now).getUTCFullYear(), 0, 1);
  else from = now - (RANGE_DAYS[range] || 365) * DAY_MS;
  const pts = all.filter((s) => Date.parse(`${s.date}T00:00:00Z`) >= from);
  return pts.length >= 2 ? pts : all;
}

function niceStep(span, target) {
  const raw = span / Math.max(1, target);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pow;
}

function axisMoney(v) {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${+(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${+(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${+(v / 1e3).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Geometry for the fund value chart. The y axis is fund value in dollars,
 * because that is what a daily snapshot records. Returns null with fewer than
 * three snapshots (the page shows its empty state).
 *
 * @param {Array<{date:string,value:number,benchmarkValue:number|null}>} snapshots
 * @param {string} range one of CHART_RANGES
 * @param {{width?:number,height?:number,now?:number}} [opts]
 */
export function buildFundChart(snapshots, range, opts = {}) {
  const W = opts.width || 400;
  const H = opts.height || 216;
  const all = Array.isArray(snapshots) ? snapshots.filter((s) => num(s?.value) != null) : [];
  if (all.length < 3) return null;
  const pts = sliceSnapshots(all, range, opts.now);
  const n = pts.length;
  const values = pts.map((p) => Number(p.value));
  const bench = pts.map((p) => num(p.benchmarkValue));
  const hasBench = bench.every((b) => b != null);

  const pool = hasBench ? [...values, ...bench] : values;
  let lo = Math.min(...pool);
  let hi = Math.max(...pool);
  if (hi === lo) {
    hi += Math.abs(hi) * 0.01 || 1;
    lo -= Math.abs(lo) * 0.01 || 1;
  }
  const step = niceStep(hi - lo, 4);
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.ceil(hi / step) * step;

  const left = 52;
  const right = 4;
  const top = 8;
  const bottom = 22;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const xAt = (i) => left + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const yAt = (v) => top + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  const path = (arr) =>
    arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ');

  const line = path(values);
  const baseY = top + plotH;
  const yTicks = [];
  for (let v = yMin; v <= yMax + step / 2; v += step) {
    yTicks.push({ y: yAt(v), label: axisMoney(v) });
  }

  /* One tick per month, at the first point of that month; day ticks for 1M. */
  let xTicks = [];
  if (range === '1M' || n <= 31) {
    const want = Math.min(5, n);
    for (let k = 0; k < want; k += 1) {
      const i = Math.round((k * (n - 1)) / Math.max(1, want - 1));
      const d = new Date(`${pts[i].date}T00:00:00Z`);
      xTicks.push({ x: xAt(i), label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}` });
    }
  } else {
    let last = null;
    pts.forEach((p, i) => {
      const d = new Date(`${p.date}T00:00:00Z`);
      const key = d.getUTCFullYear() * 12 + d.getUTCMonth();
      if (key !== last) {
        if (last !== null || d.getUTCDate() <= 7) {
          xTicks.push({ x: xAt(i), label: MONTHS[d.getUTCMonth()] });
        }
        last = key;
      }
    });
    if (xTicks.length > 7) {
      const stride = Math.ceil(xTicks.length / 7);
      xTicks = xTicks.filter((_, i) => i % stride === 0);
    }
  }

  return {
    W,
    H,
    left,
    right,
    top,
    baseY,
    plotW,
    plotH,
    line,
    area: `${line} L${xAt(n - 1).toFixed(1)} ${baseY} L${left} ${baseY} Z`,
    benchLine: hasBench ? path(bench) : null,
    hasBench,
    yTicks,
    xTicks,
    points: pts.map((p, i) => ({
      x: xAt(i),
      y: yAt(values[i]),
      date: p.date,
      value: values[i],
      benchmarkValue: bench[i],
    })),
    firstDate: pts[0].date,
    lastDate: pts[n - 1].date,
  };
}

/* ── Needs your attention ───────────────────────────────────────────────── */

export const TASK_STATUSES = [
  { value: 'pending', label: 'Pending', icon: 'bi-clock' },
  { value: 'in_progress', label: 'In progress', icon: 'bi-arrow-repeat' },
  { value: 'review', label: 'In review', icon: 'bi-eye' },
  { value: 'completed', label: 'Complete', icon: 'bi-check-circle' },
];
export const TASK_STATUS_BY_VALUE = Object.fromEntries(TASK_STATUSES.map((s) => [s.value, s]));

export const ATTENTION_FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Complete' },
];

/** Which filter a task status belongs to. "In review" is still in progress. */
export function filterOfStatus(status) {
  if (status === 'completed') return 'completed';
  if (status === 'in_progress' || status === 'review') return 'in_progress';
  return 'pending';
}

export const ROLE_VIEW_LABEL = {
  executive: 'Executive view',
  portfolio_manager: 'Portfolio manager view',
  analyst: 'Analyst view',
};

/** Tasks a role is shown: an analyst their own, a portfolio manager their own
 *  plus their team's and the ones they assigned, an executive the council's. */
export function tasksForRole(tasks, { role, userId, teamId }) {
  const all = Array.isArray(tasks) ? tasks : [];
  if (role === 'executive') return all;
  if (role === 'portfolio_manager') {
    return all.filter(
      (t) => t.mine || t.assigned_by === userId || (teamId && t.team_id && t.team_id === teamId),
    );
  }
  return all.filter((t) => t.mine);
}

const timeOf = (v) => {
  const t = Date.parse(v || '');
  return Number.isFinite(t) ? t : Infinity;
};

/**
 * Rows of the "Needs your attention" list for one filter.
 *
 * The role's tasks for the chosen status. Under "Pending" the list also
 * carries what else is waiting on this member, each from data the page has
 * already loaded: their own open assignments with a due date, open policy
 * breaches (managers), submissions awaiting review (managers) and the next
 * scheduled meeting. Late items and breaches lead, the rest follow by date.
 */
export function buildAttentionRows({
  filter = 'pending',
  role,
  userId,
  teamId,
  canManage = false,
  tasks,
  assignments,
  awaitingReview,
  meetings,
  openBreaches,
  now = Date.now(),
} = {}) {
  const scoped = tasksForRole(tasks, { role, userId, teamId }).filter(
    (t) => filterOfStatus(t.status) === filter,
  );
  const taskRows = scoped.map((t) => {
    const overdue = Boolean(t.overdue) && t.status !== 'completed';
    return {
      id: `task-${t.id}`,
      kind: 'task',
      taskId: t.id,
      icon: overdue ? 'bi-exclamation-triangle' : 'bi-check2-square',
      tone: overdue ? 'neg' : 'default',
      urgent: overdue,
      title: overdue ? 'Overdue task' : t.mine ? 'Your task' : 'Task',
      subtitle: t.title || 'Task',
      detail: t.description || null,
      priority: t.priority || null,
      owner: t.assignee_name || null,
      date: t.due_date || null,
      sortAt: filter === 'completed' ? -timeOf(t.updated_at) : timeOf(t.due_date),
      status: t.status,
      canChange: Boolean(t.mine || canManage),
      isSample: Boolean(t.is_demo),
    };
  });
  const rows = [...taskRows];

  if (filter === 'pending') {
    (Array.isArray(assignments) ? assignments : [])
      .filter((a) => a.mine && !a.archived && a.due_date)
      .sort((a, b) => timeOf(a.due_date) - timeOf(b.due_date))
      .slice(0, 3)
      .forEach((a) => {
        const overdue = Boolean(a.overdue) || timeOf(a.due_date) < now;
        rows.push({
          id: `asg-${a.id}`,
          kind: 'assignment',
          icon: 'bi-clipboard-check',
          tone: overdue ? 'neg' : 'default',
          urgent: overdue,
          title: overdue ? 'Assignment overdue' : 'Your assignment',
          subtitle: a.title || 'Assignment',
          owner: a.assignee_name || null,
          date: a.due_date,
          sortAt: timeOf(a.due_date),
          statusText: overdue ? 'Overdue' : 'Open',
          statusIcon: 'bi-clock',
          statusTone: overdue ? 'neg' : 'default',
          href: '/org-team-hub/assignments',
        });
      });

    if (canManage && num(openBreaches) > 0) {
      rows.push({
        id: 'breaches',
        kind: 'breaches',
        icon: 'bi-shield-exclamation',
        tone: 'neg',
        urgent: true,
        title: 'Open breaches',
        subtitle: `${openBreaches} compliance ${Number(openBreaches) === 1 ? 'item' : 'items'}`,
        owner: 'Compliance',
        date: null,
        sortAt: now,
        statusText: 'Open',
        statusIcon: 'bi-exclamation-circle',
        statusTone: 'neg',
        href: '/org-team-hub/compliance',
      });
    }

    if (canManage && num(awaitingReview) > 0) {
      rows.push({
        id: 'grading',
        kind: 'grading',
        icon: 'bi-clipboard-data',
        tone: 'default',
        urgent: false,
        title: 'Grading queue',
        subtitle: `${awaitingReview} awaiting a grade`,
        owner: 'Grades',
        date: null,
        sortAt: now,
        statusText: 'Open',
        statusIcon: 'bi-clock',
        statusTone: 'default',
        href: '/org-team-hub/grades',
      });
    }

    const next = (Array.isArray(meetings) ? meetings : [])
      .filter((m) => m.status === 'scheduled' && timeOf(m.scheduled_at) >= now)
      .sort((a, b) => timeOf(a.scheduled_at) - timeOf(b.scheduled_at))[0];
    if (next) {
      rows.push({
        id: `mtg-${next.id}`,
        kind: 'meeting',
        icon: 'bi-calendar-event',
        tone: 'default',
        urgent: false,
        title: 'Next meeting',
        subtitle: next.title || 'Meeting',
        owner: null,
        date: next.scheduled_at,
        sortAt: timeOf(next.scheduled_at),
        statusText: 'Scheduled',
        statusIcon: 'bi-calendar-check',
        statusTone: 'pos',
        href: '/org-team-hub/meetings',
      });
    }
  }

  /* What is late or in breach first, then everything in date order. */
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => Number(b.r.urgent) - Number(a.r.urgent) || a.r.sortAt - b.r.sortAt || a.i - b.i)
    .map((x) => x.r);
}

/** How many tasks sit under each filter, for the role's scope. */
export function attentionCounts(tasks, scope) {
  const out = { pending: 0, in_progress: 0, completed: 0 };
  for (const t of tasksForRole(tasks, scope)) out[filterOfStatus(t.status)] += 1;
  return out;
}

/* ── Seven-day digest ───────────────────────────────────────────────────── */

/* The digest request caps each list. A count sitting on its cap means "at
   least this many", so it is printed with a plus. */
const DIGEST_CAPS = { pitches: 8, votes: 40, positions: 20, notes: 15, recognitions: 15 };

export function buildDigestRows(digest) {
  const c = digest?.counts || {};
  const cell = (key) => {
    const n = num(c[key]);
    if (n == null) return NA;
    return n >= DIGEST_CAPS[key] ? `${n}+` : String(n);
  };
  const top = Array.isArray(digest?.movers) && digest.movers.length ? digest.movers[0] : null;
  return {
    rows: [
      { key: 'pitches', label: 'New pitches', value: cell('pitches') },
      { key: 'votes', label: 'Votes cast', value: cell('votes') },
      { key: 'positions', label: 'Positions opened', value: cell('positions') },
      { key: 'notes', label: 'New research notes', value: cell('notes') },
      { key: 'recognitions', label: 'Awards given', value: cell('recognitions') },
    ],
    topPitch: top && top.ticker ? { ticker: top.ticker, alphaPct: num(top.alpha_pct) } : null,
    empty: ['pitches', 'votes', 'positions', 'notes', 'recognitions'].every((k) => !num(c[k])),
  };
}

/* ── Council snapshot ───────────────────────────────────────────────────── */

/** Who the member oversees, in words, from the organization block. */
export function overseeText(organization, role) {
  const list = Array.isArray(organization?.oversee) ? organization.oversee : [];
  if (list.length === 0) return role === 'analyst' ? 'No teammates yet' : 'No direct reports yet';
  const n = list.length;
  if (role === 'executive') return `${n} portfolio ${n === 1 ? 'manager' : 'managers'}`;
  if (role === 'portfolio_manager') return `${n} ${n === 1 ? 'analyst' : 'analysts'} on your team`;
  return `${n} ${n === 1 ? 'teammate' : 'teammates'}`;
}
