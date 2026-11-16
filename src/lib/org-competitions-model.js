/**
 * Competitions (/org-competitions) model: labels, formatting and every
 * derivation the landing screen and the event workspace draw. Pure (no
 * React, no I/O) so the live payload and the sample bundle go through the
 * same rules, and so it can be tested.
 *
 * Nothing is invented. A missing input yields null and the page prints N/A.
 * Scores are on the 0 to 100 scale the scoring code uses. Fund challenge
 * standing never carries a dollar figure (only rank, return since entry,
 * councils entered and the end date, exactly the Fund Analytics block).
 */
import { standingOf } from './org-fund-analytics-model.js';

export const NA = 'N/A';
const DAY = 86400000;

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const ts = (v) => {
  const t = v ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
};

/* ── Labels ───────────────────────────────────────────────────────────── */

export const STAGES = {
  draft: { label: 'Draft', icon: 'bi-pencil' },
  open: { label: 'Open', icon: 'bi-door-open' },
  in_progress: { label: 'In progress', icon: 'bi-easel' },
  judging: { label: 'Judging', icon: 'bi-clipboard-check' },
  complete: { label: 'Complete', icon: 'bi-flag' },
  archived: { label: 'Archived', icon: 'bi-archive' },
};
export const stageOf = (status) => STAGES[status] || { label: status || NA, icon: 'bi-circle' };

/** The one step forward a host manager can take from each stage. */
export const STAGE_ORDER = ['draft', 'open', 'in_progress', 'judging', 'complete'];
export const NEXT_STAGE_LABEL = {
  draft: 'Open registration',
  open: 'Start competition',
  in_progress: 'Move to judging',
  judging: 'Mark complete',
};
export function nextStage(status) {
  const i = STAGE_ORDER.indexOf(status);
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
}

export const FORMATS = [
  { id: 'showcase', label: 'Showcase' },
  { id: 'single_elim', label: 'Single elimination' },
  { id: 'round_robin', label: 'Round robin' },
];
export const formatLabel = (id) => FORMATS.find((f) => f.id === id)?.label || NA;

export const ADMISSION = {
  invite_only: 'Invite only',
  open_signup: 'Open sign-up',
  request_approval: 'Request to join',
  application: 'Application',
};
export const admissionLabel = (mode) => ADMISSION[mode] || NA;

export const SIDE_RULE = {
  either: 'Long or short',
  long_only: 'Long only',
  short_only: 'Short only',
  host_assigns: 'Assigned by the host',
};
export const TICKER_RULE = {
  team_choice: 'Team chooses',
  from_pool: 'From the host pool',
  host_assigns: 'Assigned by the host',
};

export const DELIVERABLE_LABEL = {
  deck: 'Final pitch deck',
  thesis: 'Investment thesis',
  model: 'Financial model',
};
export const DELIVERABLE_ICON = {
  deck: 'bi-file-earmark-slides',
  thesis: 'bi-file-earmark-text',
  model: 'bi-file-earmark-spreadsheet',
};

export const TROPHIES = [
  { key: 'winner', label: 'Winner', icon: 'bi-trophy-fill', gold: true },
  { key: 'top3', label: 'Top 3', icon: 'bi-trophy' },
  { key: 'participant', label: 'Participant', icon: 'bi-award' },
];

/* ── Formatting ───────────────────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Nov 18, 2026. Date-only strings are read as that calendar day. */
export function fmtDate(v) {
  if (!v) return NA;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return `${MONTHS[m - 1]} ${String(d).padStart(2, '0')}, ${y}`;
  }
  const t = ts(s);
  if (t == null) return NA;
  const d = new Date(t);
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

/** 14:30 in the viewer's time zone. */
export function fmtTime(v) {
  const t = ts(v);
  if (t == null) return NA;
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Oct 01 to Nov 10, 2026 (or one side N/A). */
export function fmtWindow(start, end) {
  if (!start && !end) return NA;
  if (!start) return `Until ${fmtDate(end)}`;
  if (!end) return `From ${fmtDate(start)}`;
  const a = fmtDate(start);
  const b = fmtDate(end);
  const sameYear = a.slice(-4) === b.slice(-4);
  return `${sameYear ? a.slice(0, -6) : a} to ${b}`;
}

export function fmtSignedPct(v, digits = 2) {
  const n = num(v);
  if (n == null) return NA;
  return `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(digits)}%`;
}
export function toneOf(v) {
  const n = num(v);
  if (n == null) return 'na';
  return n >= 0 ? 'pos' : 'neg';
}

/** A 0 to 100 score with one decimal when it has one; N/A when missing. */
export function fmtScore(v) {
  const n = num(v);
  if (n == null) return NA;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** "3 of 12" when the field is known, the bare rank otherwise. */
export function fmtRank(rank, field) {
  const r = num(rank);
  if (r == null) return NA;
  const f = num(field);
  return f ? `${r} of ${f}` : String(r);
}

/* ── Readiness (host) ─────────────────────────────────────────────────── */

/** The five checks a host must pass before registration opens. */
export function readinessOf(counts = {}, rubricCount = 0) {
  const c = counts || {};
  const items = [
    { key: 'round', label: 'At least one round', met: (c.rounds || 0) >= 1 },
    { key: 'room', label: 'At least one room scheduled', met: (c.rooms || 0) >= 1 },
    { key: 'team', label: 'At least one team invited', met: (c.teams || 0) >= 1 },
    { key: 'judge', label: 'At least one judge added', met: (c.judges || 0) >= 1 },
    { key: 'rubric', label: 'Scoring rubric defined', met: (rubricCount || 0) >= 1 },
  ];
  const met = items.filter((i) => i.met).length;
  return { items, met, total: items.length, allMet: met === items.length };
}

const TODO = {
  round: 'Add a round',
  room: 'Schedule a room',
  team: 'Invite a team',
  judge: 'Add a judge',
  rubric: 'Define the rubric',
};

/** What a hosted event needs next, with a date when there is one. */
export function nextMilestoneOf(event, nowIso) {
  const now = ts(nowIso) ?? 0;
  const r = event.readiness || readinessOf(event.counts, event.rubricCount);
  switch (event.status) {
    case 'draft': {
      const first = r.items.find((i) => !i.met);
      return first
        ? { label: TODO[first.key], date: null }
        : { label: 'Open registration', date: null };
    }
    case 'open': {
      const closes = event.config?.registration_closes_at;
      if (closes && ts(closes) > now) return { label: 'Registration closes', date: closes };
      return { label: 'Start competition', date: event.starts_at || null };
    }
    case 'in_progress':
      return { label: 'Move to judging', date: event.ends_at || null };
    case 'judging':
      return event.results_visible
        ? { label: 'Mark complete', date: null }
        : { label: 'Reveal results', date: null };
    default:
      return null;
  }
}

/* ── Entrant: obligations, placement, next deadline ───────────────────── */

export function requiredKinds(config) {
  if (!config) return [];
  const kinds = [];
  if (config.deliverable_deck) kinds.push('deck');
  if (config.deliverable_thesis) kinds.push('thesis');
  if (config.deliverable_model) kinds.push('model');
  return kinds;
}

/** Each required deliverable with whether the team has handed it in. */
export function deliverableChecklist(config, submittedKinds = []) {
  const have = new Set(submittedKinds || []);
  return requiredKinds(config).map((kind) => ({
    kind,
    label: DELIVERABLE_LABEL[kind],
    done: have.has(kind),
    due: config?.deliverable_due_at || null,
  }));
}

const ACTIVE = new Set(['open', 'in_progress', 'judging']);

/**
 * What the council owes, soonest first: every required deliverable its team
 * has not handed in (while the event is live), and every presentation slot
 * still ahead. Undated items go last.
 */
export function obligationsOf(entered = [], nowIso) {
  const now = ts(nowIso) ?? 0;
  const out = [];
  for (const e of entered) {
    if (!ACTIVE.has(e.status)) continue;
    for (const item of deliverableChecklist(e.config, e.submittedKinds)) {
      if (item.done) continue;
      out.push({
        key: `${e.id}:${item.kind}`,
        slug: e.slug,
        competition: e.name,
        kind: 'deliverable',
        icon: DELIVERABLE_ICON[item.kind],
        title: `Submit ${item.label.toLowerCase()}`,
        due: item.due,
        time: false,
      });
    }
    const slot = e.slot;
    if (slot?.starts_at && ts(slot.starts_at) >= now) {
      out.push({
        key: `${e.id}:slot`,
        slug: e.slug,
        competition: e.name,
        kind: 'slot',
        icon: 'bi-calendar-event',
        title: slot.room ? `Presentation slot, ${slot.room}` : 'Presentation slot',
        due: slot.starts_at,
        time: true,
      });
    }
  }
  return out.sort((a, b) => (ts(a.due) ?? Infinity) - (ts(b.due) ?? Infinity));
}

/** The next dated obligation at or after now, or null. */
export function nextDeadlineOf(obligations = [], nowIso) {
  const now = ts(nowIso) ?? 0;
  return obligations.find((o) => ts(o.due) != null && ts(o.due) >= now - DAY / 2) || null;
}

/** The council's own next dated item in one event (for the Entered table). */
export function eventDeadline(event, nowIso) {
  return nextDeadlineOf(obligationsOf([event], nowIso), nowIso)?.due || null;
}

/** Placement after reveal: the team's rank, N/A before. */
export function placementOf(event) {
  if (!event?.result || !event.results_visible) return null;
  return num(event.result.rank);
}

/* ── Landing figures ─────────────────────────────────────────────────── */

export function kpisOf(
  { entered = [], hosted = [], joinable = [], fund = [], obligations = [] },
  nowIso,
) {
  return {
    entered: entered.filter((e) => e.status !== 'archived').length,
    hosting: hosted.filter((h) => h.status !== 'archived' && h.status !== 'complete').length,
    joinable: joinable.length,
    nextDeadline: nextDeadlineOf(obligations, nowIso)?.due || null,
    fund: fund.length,
  };
}

/* ── Fund challenges ─────────────────────────────────────────────────── */

/**
 * Standing in each fund challenge the council ENTERED, built with the same
 * `standingOf` the Fund Analytics block uses, so the two never disagree.
 * `boards` maps a challenge id to its standings rows. No dollar figure.
 */
export function fundRowsOf(competitions = [], boards = {}) {
  return (competitions || [])
    .filter((c) => c?.myEntry && c.myEntry.status !== 'withdrawn')
    .map((c) => {
      const s = standingOf(c, boards[c.id] || []);
      return {
        id: s.id,
        name: s.name,
        status: s.status,
        rank: s.rank,
        field: s.field,
        return_pct: s.return_pct,
        ends_at: s.ends_at,
      };
    })
    .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1));
}

/** Challenges still open to enter: active, and not entered yet. */
export function openFundChallenges(competitions = []) {
  return (competitions || []).filter((c) => c?.status === 'active' && !c.myEntry);
}

/** One challenge's standings with every dollar figure removed. */
export function publicStandings(rows = []) {
  return (rows || []).map((r) => ({
    org_id: r.org_id,
    rank: num(r.rank),
    university: r.university || null,
    return_pct: num(r.return_pct),
    isMine: Boolean(r.isMine),
  }));
}

/**
 * A fund challenge's standings from its entries: ranked by return since
 * entry (entries without a return go last), in the order the leaderboard
 * has always used, and without any fund value. `nameByOrg` maps an org id
 * to its display name.
 */
export function rankStandings(entries = [], nameByOrg = new Map(), myOrgId = null) {
  return (entries || [])
    .map((e) => ({
      org_id: e.org_id,
      university: nameByOrg.get(e.org_id) || 'University',
      return_pct: num(e.return_pct),
      value: num(e.current_value),
      isMine: e.org_id === myOrgId,
    }))
    .sort((a, b) => {
      const ra = a.return_pct ?? -Infinity;
      const rb = b.return_pct ?? -Infinity;
      if (rb !== ra) return rb - ra;
      return (b.value ?? 0) - (a.value ?? 0);
    })
    .map(({ value, ...row }, i) => ({ ...row, rank: i + 1 }));
}

/* ── Trophies ─────────────────────────────────────────────────────────── */

/** August 1 of the academic year that contains `nowIso`. */
export function seasonStart(nowIso) {
  const d = new Date(ts(nowIso) ?? Date.now());
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-08-01`;
}

/** Distinct members holding each trophy this season. */
export function trophyTally(badges = [], nowIso) {
  const since = Date.parse(`${seasonStart(nowIso)}T00:00:00Z`);
  const sets = Object.fromEntries(TROPHIES.map((t) => [t.key, new Set()]));
  for (const b of badges || []) {
    if (!sets[b.badge_key]) continue;
    const at = ts(b.awarded_at);
    if (at != null && at < since) continue;
    sets[b.badge_key].add(b.org_member_id);
  }
  return TROPHIES.map((t) => ({ ...t, members: sets[t.key].size }));
}

/* ── Pitch circuit deadlines ──────────────────────────────────────────── */

/** The next dated milestones across the external pitch circuit. */
export function circuitDeadlinesOf(entries = [], todayIso, limit = 4) {
  const today = String(todayIso || '').slice(0, 10);
  const out = [];
  for (const e of entries || []) {
    for (const k of e.keyDates || []) {
      if (!k?.date || k.date < today) continue;
      out.push({
        key: `${e.slug}:${k.label}:${k.date}`,
        slug: e.slug,
        name: e.shortName || e.name,
        label: k.label,
        date: k.date,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}

/* ── Results (entrant safety) ─────────────────────────────────────────── */

/**
 * Feedback as an entrant may see it: the comment text only, in a fixed
 * order that does not follow the judges. No label, no judge id, no firm.
 */
export function anonymousFeedback(rows = []) {
  return (rows || [])
    .map((r) => String(r?.comment || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((comment) => ({ comment }));
}

/* ── Workspace tabs ──────────────────────────────────────────────────── */

/**
 * Which tabs a viewer gets in one event's workspace, and where each lives.
 * Host managers: overview, entry rules (the config), live board, results,
 * host tools. Entrants: overview, entry rules (read only), deliverables,
 * live board, results.
 */
export function workspaceTabs({ slug, isHost, canManage }) {
  const base = `/org-competitions/${slug}`;
  const tabs = [{ key: 'overview', label: 'Overview', href: base }];
  if (isHost && canManage)
    tabs.push({ key: 'rules', label: 'Entry rules', href: `${base}/config` });
  else if (!isHost) tabs.push({ key: 'rules', label: 'Entry rules', href: `${base}/join` });
  if (!isHost)
    tabs.push({ key: 'deliverables', label: 'Deliverables', href: `${base}/deliverables` });
  tabs.push({ key: 'live', label: 'Live board', href: `${base}/live` });
  tabs.push({ key: 'results', label: 'Results', href: `${base}/results` });
  if (isHost && canManage)
    tabs.push({ key: 'host', label: 'Host tools', href: `${base}?tab=structure` });
  return tabs;
}

/** The host tools, each a section of the overview route or its own address. */
export function hostTools(slug) {
  const base = `/org-competitions/${slug}`;
  return [
    { key: 'structure', label: 'Structure', href: `${base}?tab=structure` },
    { key: 'invitations', label: 'Invitations', href: `${base}?tab=invitations` },
    { key: 'rubric', label: 'Rubric', href: `${base}?tab=rubric` },
    { key: 'requests', label: 'Join requests', href: `${base}/requests` },
    { key: 'scoreboard', label: 'Scoreboard', href: `${base}/scoreboard` },
  ];
}

/** Sample event slugs never collide with a real slug (real ones have no prefix). */
export const SAMPLE_SLUG_PREFIX = 'sample-';
export const isSampleSlug = (slug) => String(slug || '').startsWith(SAMPLE_SLUG_PREFIX);

/** Landing page address for a page tab (Fund Analytics links to the fund tab). */
export const COMPETITIONS_HREF = '/org-competitions';
export const FUND_CHALLENGES_HREF = '/org-competitions?tab=fund';
export const pageTabOf = (value) => (value === 'fund' ? 'fund' : 'pitch');
