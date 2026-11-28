/**
 * Sonar Research page model (/org-team-hub/sonar and /org-team-hub/sonar/[id]).
 *
 * Pure: no React, no fetch, no server imports. The page, the single report,
 * the sample bundle and the tests read these functions, so what "needs you",
 * what counts as returned, what is stale and who may resolve a comment are
 * decided in one place from the rows the server sends.
 *
 * The rules mirror lib/org-sonar/reports.js, lib/org-sonar/server.js
 * (viewerRights) and the row policies in 20261107120000_org_sonar_reports.sql.
 * The server checks every request again; nothing here grants a right.
 */
import {
  KIND_LABEL,
  MANAGER_ROLES,
  REPORT_KINDS,
  REPORT_STATUSES,
  REPORT_VISIBILITY,
  STATUS_LABEL,
  VISIBILITY_LABEL,
} from './org-sonar/reports.js';

export { KIND_LABEL, REPORT_KINDS, REPORT_STATUSES, REPORT_VISIBILITY, STATUS_LABEL };
export { VISIBILITY_LABEL };

export const NA = 'N/A';
export const STALE_DAYS = 120;
const DAY = 86400000;

/* ── Page address ─────────────────────────────────────────────────────────── */

export const TABS = [
  { id: 'reports', label: 'Reports' },
  { id: 'research', label: 'Research' },
  { id: 'analytics', label: 'Analytics' },
  /* Nov 28 2026: council research on the fund's own records (CouncilIntelligenceTab). */
  { id: 'intelligence', label: 'Council intelligence' },
];
export const WINDOWS = [
  { v: '30', l: '30 days' },
  { v: '90', l: '90 days' },
  { v: '365', l: '12 months' },
  { v: 'all', l: 'All time' },
];
export const DEFAULT_WINDOW = '90';

export const cleanTab = (v) => (TABS.some((t) => t.id === v) ? v : 'reports');
export const cleanWindow = (v) => (WINDOWS.some((w) => w.v === v) ? v : DEFAULT_WINDOW);
export const windowLabel = (v) =>
  (WINDOWS.find((w) => w.v === cleanWindow(v)) || WINDOWS[1]).l.toLowerCase();

const one = (v) => (Array.isArray(v) ? v[0] : v) ?? null;

/** Filters from the page address (an object or URLSearchParams). */
export function cleanFilters(input = {}) {
  const get = (k) =>
    typeof input?.get === 'function' ? input.get(k) : one(input ? input[k] : null);
  const ticker = String(get('ticker') || '')
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, '')
    .slice(0, 12);
  return {
    q: String(get('q') || '')
      .slice(0, 120)
      .trim(),
    status: REPORT_STATUSES.includes(get('status')) ? get('status') : '',
    kind: REPORT_KINDS.includes(get('kind')) ? get('kind') : '',
    visibility: REPORT_VISIBILITY.includes(get('visibility')) ? get('visibility') : '',
    ticker,
    mine: get('mine') === '1',
  };
}

export const EMPTY_FILTERS = cleanFilters({});

export function hasFilters(f) {
  return Boolean(f && (f.q || f.status || f.kind || f.visibility || f.ticker || f.mine));
}

/** The query string for the reports route (the server applies all but visibility). */
export function serverQuery(f) {
  const sp = new URLSearchParams();
  if (f.status) sp.set('status', f.status);
  if (f.kind) sp.set('kind', f.kind);
  if (f.ticker) sp.set('ticker', f.ticker);
  if (f.mine) sp.set('mine', '1');
  if (f.q) sp.set('q', f.q);
  return sp.toString();
}

/** Every filter applied on the page (sample rows, and visibility for live rows). */
export function filterReports(rows, f, viewerId) {
  const q = (f?.q || '').toLowerCase();
  return (rows || []).filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (f.kind && r.kind !== f.kind) return false;
    if (f.visibility && r.visibility !== f.visibility) return false;
    if (f.ticker && r.ticker !== f.ticker) return false;
    if (f.mine && r.author_id !== viewerId) return false;
    if (q) {
      const hay = `${r.title} ${r.question || ''} ${r.ticker || ''} ${r.author_name || ''} ${
        r.summary?.conclusion || ''
      }`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* ── Labels ──────────────────────────────────────────────────────────────── */

export const STATUS_VIEW = {
  draft: { icon: 'bi-file-earmark', tone: 'default' },
  under_review: { icon: 'bi-clock', tone: 'warn' },
  approved: { icon: 'bi-check2-circle', tone: 'pos' },
  superseded: { icon: 'bi-layers', tone: 'na' },
};
export const KIND_ICON = {
  research: 'bi-search',
  fund_fit: 'bi-bullseye',
  challenge: 'bi-shield-exclamation',
};
export const VISIBILITY_ICON = {
  private: 'bi-lock',
  members: 'bi-people',
  team: 'bi-diagram-3',
  executives: 'bi-briefcase',
  org: 'bi-building',
};
export const VISIBILITY_SHORT = {
  private: 'Only me',
  members: 'Selected',
  team: 'Desk',
  executives: 'Managers',
  org: 'Organization',
};

export const statusLabel = (s) => STATUS_LABEL[s] || NA;
export const kindLabel = (k) => KIND_LABEL[k] || NA;
export const visibilityLabel = (v) => VISIBILITY_LABEL[v] || NA;

/**
 * Fund fit: the screen against the fund's mandate. The mandate fit Sonar
 * stored (fits, partial, outside) when the snapshot has one; otherwise the
 * stored stance read on the same three steps. The words describe the screen
 * only; the committee decides. Nothing here changes what the server stores.
 */
export const MANDATE_LABEL = {
  fits: 'Within mandate',
  partial: 'Review',
  outside: 'Outside mandate',
};
const STANCE_STEP = { invest: 'fits', watch: 'partial', pass: 'outside' };
export function mandateScreen(summary) {
  const fit = summary?.thesisFit;
  if (MANDATE_LABEL[fit]) return { step: fit, label: MANDATE_LABEL[fit] };
  const step = STANCE_STEP[summary?.stance];
  return step ? { step, label: MANDATE_LABEL[step] } : null;
}
export const MANDATE_TONE = { fits: 'pos', partial: 'warn', outside: 'na' };

export const CHALLENGE_LABEL = {
  holds: 'The conclusion holds',
  weakened: 'The conclusion is weakened',
  refuted: 'The records contradict it',
  unclear: 'The records cannot test it',
};

/* ── Formats ─────────────────────────────────────────────────────────────── */

export function fmtDate(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
export function fmtMonth(ym) {
  if (!ym) return NA;
  const d = new Date(`${ym}-01T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}
export const fmtPct = (v) => (Number.isFinite(v) ? `${Math.round(v * 100)}%` : NA);
export const fmtNum = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : NA);
export const fmtInt = (v) => (Number.isFinite(v) ? String(Math.round(v)) : NA);
export const fmtVersion = (v) => (Number.isInteger(v) && v > 0 ? `v${v}` : NA);
export function fmtTime(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return `${fmtDate(iso)}, ${d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })} UTC`;
}

/** "18 of 20" from a report's stored validation stats, else the share, else N/A. */
export function claimsOf(summary) {
  const s = summary?.stats || {};
  if (Number.isFinite(s.kept) && Number.isFinite(s.claims) && s.claims > 0)
    return `${s.kept} of ${s.claims}`;
  return fmtPct(s.claimSupportRate);
}

/* ── Roles and rights ────────────────────────────────────────────────────── */

export const isManagerRole = (role) => MANAGER_ROLES.includes(role);

/** May the viewer approve or return reports? (managers, or the granted permission) */
export const isReviewer = (viewer) =>
  Boolean(viewer && (viewer.canApprove || isManagerRole(viewer.role)));

/** Mirrors viewerRights() in lib/org-sonar/server.js. */
export function rightsFor(report, viewer) {
  const author = Boolean(report && viewer && report.author_id === viewer.userId);
  const reviewer = isReviewer(viewer);
  const s = report?.status;
  return {
    isAuthor: author,
    canEdit: author || isManagerRole(viewer?.role),
    canSubmit: author && s === 'draft',
    canWithdraw: author && s === 'under_review',
    canApprove: reviewer && !author && s === 'under_review',
    canReturn: reviewer && !author && s === 'under_review',
    canSupersede: (author || reviewer) && s === 'approved',
    canChallenge: report?.kind !== 'challenge' && s !== 'superseded',
    canDelete: author && s === 'draft',
  };
}

/**
 * Returned to the author: a draft whose last review came after its last
 * submission and was not the approval of an earlier version (a new version
 * of an approved report also goes back to draft, but it was not returned).
 */
export function isReturned(r) {
  if (!r || r.status !== 'draft' || !r.reviewed_at) return false;
  const reviewed = new Date(r.reviewed_at).getTime();
  if (r.reviewed_by && r.reviewed_by === r.author_id) return false;
  if (r.approved_at && new Date(r.approved_at).getTime() >= reviewed) return false;
  if (r.submitted_at && new Date(r.submitted_at).getTime() > reviewed) return false;
  return true;
}

/** What waits on the viewer, newest change first. */
export function needsYou(rows, viewer) {
  const me = viewer?.userId;
  const list = [...(rows || [])].sort((a, b) =>
    String(b.updated_at || '').localeCompare(String(a.updated_at || '')),
  );
  const review = isReviewer(viewer)
    ? list.filter((r) => r.status === 'under_review' && r.author_id !== me)
    : [];
  const returned = list.filter((r) => r.author_id === me && isReturned(r));
  const drafts = list.filter((r) => r.author_id === me && r.status === 'draft' && !isReturned(r));
  const mineUnderReview = list.filter((r) => r.author_id === me && r.status === 'under_review');
  return { review, returned, drafts, mineUnderReview };
}

/** How many challenges each report has among the rows the viewer can read. */
export function challengeCounts(rows) {
  const m = new Map();
  for (const r of rows || []) {
    if (r.kind === 'challenge' && r.challenge_of)
      m.set(r.challenge_of, (m.get(r.challenge_of) || 0) + 1);
  }
  return m;
}

/** Reports attached to pitches, newest first, with the pitch's ticker and company. */
export function pitchAttachments(rows, pitches, limit = 6) {
  const by = new Map((pitches || []).map((p) => [p.id, p]));
  return [...(rows || [])]
    .filter((r) => r.pitch_id)
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
    .slice(0, limit)
    .map((r) => ({ report: r, pitch: by.get(r.pitch_id) || null }));
}

/** Approved coverage older than STALE_DAYS, the oldest first. */
export function staleCoverage(coverage) {
  return (coverage || [])
    .filter((c) => Number.isFinite(c.staleDays) && c.staleDays > STALE_DAYS)
    .sort((a, b) => b.staleDays - a.staleDays);
}

export function daysSince(iso, now = Date.now()) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / DAY)) : null;
}

/* ── Budget ──────────────────────────────────────────────────────────────── */

/**
 * Can the viewer start a deep run now? The server decides at run time (the
 * same pool and allocation); this only keeps the page from offering a run
 * that would be refused, and says why.
 */
export function runAllowance(budget) {
  if (!budget) return { ok: true, reason: null };
  if (Number.isFinite(budget.remaining) && budget.remaining <= 0)
    return { ok: false, reason: 'pool' };
  const me = budget.me || {};
  if (me.allocation != null && Number.isFinite(me.deepRuns) && me.deepRuns >= me.allocation)
    return { ok: false, reason: 'allocation' };
  return { ok: true, reason: null };
}

export function resetDay(budget) {
  return budget?.resetsOn ? fmtDate(`${budget.resetsOn}T00:00:00Z`) : NA;
}

/* ── Comments ────────────────────────────────────────────────────────────── */

/** May the viewer resolve or reopen this comment? Mirrors org_sonar_comments_update. */
export function canResolve(comment, viewer, rights) {
  if (!comment || !viewer) return false;
  return Boolean(comment.author_id === viewer.userId || isReviewer(viewer) || rights?.isAuthor);
}

/**
 * Comments as threads (roots with their replies, oldest first). scope
 * 'version' keeps the threads written on `version` (or with no version).
 */
export function commentThreads(
  rows,
  { version = null, scope = 'version', showResolved = false } = {},
) {
  const all = [...(rows || [])].sort((a, b) =>
    String(a.created_at || '').localeCompare(String(b.created_at || '')),
  );
  const ids = new Set(all.map((c) => c.id));
  const roots = all.filter((c) => !c.parent_id || !ids.has(c.parent_id));
  const inScope = (c) =>
    scope !== 'version' || version == null || c.version == null || c.version === version;
  const kept = roots.filter(inScope);
  const resolved = kept.filter((c) => c.resolved).length;
  const threads = kept
    .filter((c) => showResolved || !c.resolved)
    .map((c) => ({ ...c, replies: all.filter((x) => x.parent_id === c.id) }));
  return { threads, resolved, total: kept.length };
}

export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'M';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/* ── Research form ───────────────────────────────────────────────────────── */

/** The fund fit question, as the run form has always asked it. */
export function fundQuery(company, notes, max = 600) {
  const c = String(company || '').trim();
  const extra = String(notes || '').trim();
  return `Should our fund invest in ${c}?${extra ? ` ${extra}` : ''}`.slice(0, max);
}

/* ── KPI strip ───────────────────────────────────────────────────────────── */

export function kpisOf({ rows, viewer, budget, analytics }) {
  const n = needsYou(rows, viewer);
  const stale = analytics ? staleCoverage(analytics.coverage).length : null;
  return {
    reviewer: isReviewer(viewer),
    awaiting: isReviewer(viewer) ? n.review.length : n.mineUnderReview.length,
    drafts: n.drafts.length + n.returned.length,
    returned: n.returned.length,
    approved: analytics ? (analytics.totals?.approved ?? null) : null,
    left: budget ? budget.remaining : null,
    pool: budget ? budget.pool : null,
    stale,
  };
}
