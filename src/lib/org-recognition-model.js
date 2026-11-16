/**
 * Recognition (/org-team-hub/recognition): the page model.
 *
 * Pure helpers shared by the page, the routes, the sample bundle and the
 * tests: badge types, labels, periods, the dated rating history, movers, the
 * term honour roll, awards by sector team and the figures in the KPI strip.
 * No React, no fetch, no server imports.
 *
 * Dates. A pitch enters the rating on the day it is scored: 30 days after
 * the council's decision, which is when the daily outcome job first prices
 * it. `scoredOn` is that day. Rating changes written by a recompute carry it
 * (as their date and in `metadata.scored_on`), so a rating history is dated
 * only when every scored-pitch change carries it. Changes written before
 * that fix carry the date of the recompute instead; `historyIsDated` says
 * whether a history can be trusted by date.
 */
import { termOf } from './org-meetings-model.js';

export const NA = 'N/A';
export const BASE_RATING = 1250;
export const SCORING_DELAY_DAYS = 30;
export const MIN_ACCURATE_PITCHES = 3;
const DAY = 86400000;

/* ── Badges ────────────────────────────────────────────────────────────── */
export const BADGE_TYPES = [
  { key: 'analyst_of_month', label: 'Analyst of the Month', icon: 'bi-trophy' },
  { key: 'best_call', label: 'Best Call', icon: 'bi-bullseye' },
  { key: 'most_accurate', label: 'Most Accurate', icon: 'bi-crosshair' },
  { key: 'rising_star', label: 'Rising Star', icon: 'bi-star' },
  { key: 'clutch', label: 'Clutch Contributor', icon: 'bi-lightning-charge' },
  { key: 'deep_dive', label: 'Best Deep Dive', icon: 'bi-search' },
];
export const badgeOf = (key) =>
  BADGE_TYPES.find((b) => b.key === key) || { key, label: 'Badge', icon: 'bi-award' };

/* ── Roles, categories, lists ──────────────────────────────────────────── */
export const WEIGHT_ROLE_LABELS = {
  analyst: 'Analyst',
  quant_trader: 'Quant trader',
  portfolio_manager: 'Portfolio manager',
  vp: 'Vice president',
};
export const ROLE_SHORT = {
  analyst: 'Analyst',
  quant_trader: 'Quant',
  portfolio_manager: 'PM',
  vp: 'VP',
};
export const CATEGORY_LABELS = {
  calibration: 'Calibration',
  alpha_vs_sector: 'Alpha vs market',
  research_output: 'Research output',
  learning: 'Learning',
  task_efficiency: 'Task efficiency',
  engagement: 'Engagement',
  strategy_pnl: 'Strategy P&L',
  execution_quality: 'Execution quality',
  backtest_research: 'Backtest research',
  portfolio_alpha: 'Portfolio alpha',
  risk_management: 'Risk management',
  allocation_discipline: 'Allocation discipline',
  leadership: 'Leadership',
  team_uplift: 'Team uplift',
  research_oversight: 'Research oversight',
};
export const categoryLabel = (c) => CATEGORY_LABELS[c] || c;

export const LIST_MODES = [
  { key: 'movers', label: 'Top movers' },
  { key: 'all', label: 'All members' },
  { key: 'vp', label: 'Vice presidents' },
  { key: 'pm', label: 'Portfolio managers' },
  { key: 'analyst', label: 'Analysts' },
  { key: 'quant', label: 'Quant traders' },
];
export const LIST_KEYS = LIST_MODES.map((m) => m.key);
export const PERIODS = [
  { key: '30d', label: '30D' },
  { key: 'qtd', label: 'QTD' },
  { key: 'ytd', label: 'YTD' },
];
export const PERIOD_KEYS = PERIODS.map((p) => p.key);

/** Faculty advisors are executives with the title Faculty Advisor. They give
 *  awards but are not rated or ranked. */
export function isFacultyAdvisor(member) {
  return member?.role === 'executive' && member?.sub_role === 'Faculty Advisor';
}

/** org_members.role/sub_role → weight role (same mapping as the engine). */
export function weightRoleOf(role, subRole) {
  if (
    String(subRole || '')
      .toLowerCase()
      .includes('quant')
  )
    return 'quant_trader';
  if (role === 'executive') return 'vp';
  if (role === 'portfolio_manager') return 'portfolio_manager';
  return 'analyst';
}
export function matchesListMode(mode, weightRole) {
  if (mode === 'vp') return weightRole === 'vp';
  if (mode === 'pm') return weightRole === 'portfolio_manager';
  if (mode === 'analyst') return weightRole === 'analyst';
  if (mode === 'quant') return weightRole === 'quant_trader';
  return true;
}

/* ── Dates and periods ─────────────────────────────────────────────────── */
const ms = (v) => {
  const t = v == null ? NaN : new Date(v).getTime();
  return Number.isFinite(t) ? t : NaN;
};

/** The day a decided pitch enters the rating: 30 days after the decision. */
export function scoredOn(decisionAt) {
  const t = ms(decisionAt);
  return Number.isFinite(t) ? new Date(t + SCORING_DELAY_DAYS * DAY).toISOString() : null;
}

/** Only accepted pitches with a decision date are rated. */
export function isRatedPitch(p) {
  return p?.decision === 'accepted' && Number.isFinite(ms(p?.decision_at));
}

/** Start of a 30D / QTD / YTD window. */
export function periodStart(period, now = Date.now()) {
  const d = new Date(now);
  if (period === 'qtd') return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
  if (period === 'ytd') return new Date(d.getFullYear(), 0, 1);
  return new Date(now - 30 * DAY);
}

export function currentQuarter(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

/** "2026-Q2" → { start, end } in ms, or null when the text is not a quarter. */
export function parseQuarter(text) {
  const m = /^(\d{4})-Q([1-4])$/i.exec(String(text || '').trim());
  if (!m) return null;
  const year = Number(m[1]);
  const q = Number(m[2]) - 1;
  return {
    start: new Date(year, q * 3, 1).getTime(),
    end: new Date(year, q * 3 + 3, 1).getTime() - 1,
  };
}

export { termOf };

/* ── Rating history ────────────────────────────────────────────────────── */
/**
 * True when every scored-pitch change carries its scoring date. Decay
 * changes are always written on the day they happen.
 */
export function historyIsDated(transactions) {
  const thesis = (transactions || []).filter((t) => t.reason === 'thesis_resolved');
  return thesis.every((t) => Boolean(t?.metadata?.scored_on));
}

/**
 * The rating after each change, in date order, rebuilt from the deltas
 * (stored `rating_after` values go stale when a recompute rewrites older
 * changes, so they are not trusted). Ends on 1250 plus every delta.
 */
export function ratingHistory(transactions) {
  const rows = [...(transactions || [])]
    .map((t) => ({ ...t, _t: ms(t.metadata?.scored_on || t.created_at) }))
    .sort((a, b) => (a._t || 0) - (b._t || 0));
  let running = BASE_RATING;
  return rows.map((t) => {
    const delta = Math.round(Number(t.delta) || 0);
    running += delta;
    return {
      t: Number.isFinite(t._t) ? new Date(t._t).toISOString() : null,
      rating: running,
      delta,
      reason: t.reason,
      ticker: t.metadata?.ticker || null,
      pitch_id: t.pitch_id || null,
    };
  });
}

/** History points inside a window, with the rating held at the window start. */
export function historyWindow(points, period, now = Date.now()) {
  const start = periodStart(period, now).getTime();
  const before = (points || []).filter((p) => ms(p.t) < start);
  const inside = (points || []).filter((p) => ms(p.t) >= start && ms(p.t) <= now);
  const opening = before.length ? before[before.length - 1].rating : BASE_RATING;
  return {
    opening,
    points: [{ t: new Date(start).toISOString(), rating: opening, opening: true }, ...inside],
    change: inside.reduce((s, p) => s + p.delta, 0),
  };
}

/** Signed change per member since `sinceMs`. Members who did not move are left out. */
export function moversFrom(transactions, sinceMs, nowMs = Date.now()) {
  const by = new Map();
  for (const t of transactions || []) {
    const when = ms(t.metadata?.scored_on || t.created_at);
    if (!(when >= sinceMs && when <= nowMs)) continue;
    by.set(t.member_id, (by.get(t.member_id) || 0) + Number(t.delta || 0));
  }
  return by;
}

/* ── Awards ────────────────────────────────────────────────────────────── */
/** Members ranked by the number of badges and awards received in a range. */
export function honourRoll(recognitions, members, range, limit = 5) {
  const byUser = new Map((members || []).map((m) => [m.user_id, m]));
  const counts = new Map();
  for (const r of recognitions || []) {
    const t = ms(r.created_at);
    if (range && !(t >= range.start && t <= range.end)) continue;
    const c = counts.get(r.recipient_id) || { awards: 0, gold: 0, latest: 0 };
    c.awards += 1;
    if (r.is_award) c.gold += 1;
    c.latest = Math.max(c.latest, t || 0);
    counts.set(r.recipient_id, c);
  }
  return [...counts.entries()]
    .map(([userId, c]) => {
      const m = byUser.get(userId);
      return {
        user_id: userId,
        member_id: m?.id || null,
        name: m?.display_name || 'Member',
        team_id: m?.team_id || null,
        ...c,
      };
    })
    .sort((a, b) => b.awards - a.awards || b.gold - a.gold || b.latest - a.latest)
    .slice(0, limit);
}

/**
 * Badges and awards per sector team in a range. Returns null when no member
 * of the council is on a team (the section is then left out). Recipients
 * with no team are counted under "Unassigned".
 */
export function awardsByTeam(recognitions, members, teams, range) {
  if (!(members || []).some((m) => m.team_id)) return null;
  const byUser = new Map((members || []).map((m) => [m.user_id, m]));
  const names = new Map((teams || []).map((t) => [t.id, t.name]));
  const counts = new Map();
  for (const r of recognitions || []) {
    const t = ms(r.created_at);
    if (range && !(t >= range.start && t <= range.end)) continue;
    const teamId = byUser.get(r.recipient_id)?.team_id || null;
    const key = teamId && names.has(teamId) ? teamId : 'unassigned';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const rows = (teams || []).map((t) => ({
    id: t.id,
    name: t.name,
    awards: counts.get(t.id) || 0,
  }));
  if (counts.get('unassigned')) {
    rows.push({ id: 'unassigned', name: 'Unassigned', awards: counts.get('unassigned') });
  }
  return rows.sort(
    (a, b) =>
      (a.id === 'unassigned') - (b.id === 'unassigned') ||
      b.awards - a.awards ||
      a.name.localeCompare(b.name),
  );
}

/** The KPI strip. Ratings come from the ranking summary. */
export function recognitionMetrics({ recognitions, summary, now = Date.now() }) {
  const weekAgo = now - 7 * DAY;
  const term = termOf(now);
  const list = recognitions || [];
  return {
    awards7d: list.filter((r) => ms(r.created_at) >= weekAgo).length,
    autoTerm: list.filter(
      (r) => r.auto_generated && ms(r.created_at) >= term.start && ms(r.created_at) <= term.end,
    ).length,
    term,
    rated: summary ? summary.rated : null,
    ratable: summary ? summary.ratable : null,
    provisional: summary ? summary.provisional : null,
    topMover: summary?.top_mover_30d || null,
    lastRecompute: summary?.last_recompute || null,
    dated: summary ? summary.dated !== false : true,
  };
}

/* ── Formatting ────────────────────────────────────────────────────────── */
export function signed(n, digits = 0) {
  if (n == null || !Number.isFinite(Number(n))) return NA;
  const v = Number(n);
  const s = Math.abs(v).toFixed(digits);
  if (Number(s) === 0) return digits ? `${(0).toFixed(digits)}` : '0';
  return `${v > 0 ? '+' : '-'}${s}`;
}
export const signedPct = (n, digits = 1) => (n == null ? NA : `${signed(n, digits)}%`);
export function fmtInt(n) {
  if (n == null || !Number.isFinite(Number(n))) return NA;
  return Math.round(Number(n)).toLocaleString('en-US');
}
export function fmtDay(v) {
  const t = ms(v);
  if (!Number.isFinite(t)) return NA;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export function fmtDate(v) {
  const t = ms(v);
  if (!Number.isFinite(t)) return NA;
  return new Date(t).toISOString().slice(0, 10);
}
export function initials(name) {
  return (
    String(name || 'M')
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'M'
  );
}

/* ── Auto-award ────────────────────────────────────────────────────────── */
/**
 * Best Call and Most Accurate for one quarter, from accepted pitches scored
 * inside it (scored = 30 days after the decision).
 *   Best Call: the pitch with the highest positive excess return.
 *   Most Accurate: the analyst with the highest share of pitches that beat
 *   the market, among analysts with at least MIN_ACCURATE_PITCHES scored.
 * @param {{ pitches: object[], outcomes: object[], range: {start:number,end:number}, now?: number }} a
 */
export function pickAutoAwards({ pitches, outcomes, range, now = Date.now() }) {
  const inRange = new Map();
  for (const p of pitches || []) {
    if (!isRatedPitch(p)) continue;
    const t = ms(scoredOn(p.decision_at));
    if (t >= range.start && t <= range.end && t <= now) inRange.set(p.id, p);
  }
  let best = null;
  const per = new Map();
  for (const h of outcomes || []) {
    const p = inRange.get(h.pitch_id);
    if (!p) continue;
    const alpha = h.alpha_pct == null ? null : Number(h.alpha_pct);
    if (alpha != null && alpha > 0 && (!best || alpha > best.alpha)) best = { alpha, pitch: p };
    if (!p.analyst_member_id) continue;
    const a = per.get(p.analyst_member_id) || { hits: 0, total: 0 };
    a.total += 1;
    const metric = alpha ?? (h.return_pct == null ? null : Number(h.return_pct));
    if (metric != null && metric > 0) a.hits += 1;
    per.set(p.analyst_member_id, a);
  }
  let accurate = null;
  for (const [memberId, a] of per.entries()) {
    if (a.total < MIN_ACCURATE_PITCHES) continue;
    const rate = a.hits / a.total;
    if (!accurate || rate > accurate.rate || (rate === accurate.rate && a.total > accurate.total)) {
      accurate = { memberId, rate, hits: a.hits, total: a.total };
    }
  }
  return { best, accurate, scored: inRange.size };
}

/* Platform default weights per role (as seeded), for the sample and the
   weights dialog's "default" column. */
export const DEFAULT_WEIGHTS = {
  analyst: {
    alpha_vs_sector: 24,
    calibration: 22,
    research_output: 18,
    learning: 12,
    task_efficiency: 12,
    engagement: 12,
  },
  quant_trader: {
    strategy_pnl: 24,
    calibration: 20,
    execution_quality: 18,
    backtest_research: 14,
    learning: 12,
    task_efficiency: 12,
  },
  portfolio_manager: {
    portfolio_alpha: 24,
    calibration: 20,
    risk_management: 18,
    allocation_discipline: 14,
    engagement: 12,
    task_efficiency: 12,
  },
  vp: {
    leadership: 22,
    team_uplift: 20,
    calibration: 16,
    research_oversight: 16,
    engagement: 14,
    task_efficiency: 12,
  },
};

/* ── Ranking ───────────────────────────────────────────────────────────── */
/**
 * The ranked list and the KPI summary, from active members, their rating
 * rows and the council's rating changes. Shared by the ratings route and the
 * sample bundle. Faculty advisors are left out.
 *
 * Top movers sums dated changes in the period. When the history still holds
 * changes written before the dating fix, Top movers is not computed
 * (`summary.dated` false) rather than shown with wrong dates.
 */
export function rankRatings({
  members,
  ratings,
  transactions,
  lastRecompute = null,
  listMode: listIn,
  period: periodIn,
  now = Date.now(),
}) {
  const listMode = LIST_KEYS.includes(listIn) ? listIn : 'movers';
  const period = PERIOD_KEYS.includes(periodIn) ? periodIn : '30d';
  const ratingBy = new Map((ratings || []).map((r) => [r.member_id, r]));
  const base = (members || [])
    .filter((m) => m.is_active !== false && !isFacultyAdvisor(m))
    .map((m) => {
      const r = ratingBy.get(m.id);
      const count = r ? Number(r.rated_thesis_count || 0) : 0;
      return {
        member_id: m.id,
        user_id: m.user_id,
        name: m.display_name || 'Member',
        role: m.role,
        weight_role: weightRoleOf(m.role, m.sub_role),
        rating: r ? Math.round(Number(r.rating)) : BASE_RATING,
        tier: r && count > 0 ? r.tier : 'unranked',
        rated_thesis_count: count,
        is_provisional: count < 10,
      };
    });

  const dated = historyIsDated(transactions || []);
  const moves30 = moversFrom(transactions, now - 30 * DAY, now);
  let topMover = null;
  if (dated) {
    for (const r of base) {
      const d = Math.round(moves30.get(r.member_id) || 0);
      if (d !== 0 && (!topMover || d > topMover.delta)) {
        topMover = { member_id: r.member_id, name: r.name, delta: d };
      }
    }
  }
  const summary = {
    ratable: base.length,
    rated: base.filter((r) => r.rated_thesis_count > 0).length,
    provisional: base.filter((r) => r.is_provisional).length,
    dated,
    top_mover_30d: topMover,
    last_recompute: lastRecompute,
  };

  if (listMode === 'movers') {
    if (!dated) return { listMode, period, rows: [], summary };
    const moves = moversFrom(transactions, periodStart(period, now).getTime(), now);
    const rows = base
      .map((r) => ({ ...r, delta: Math.round(moves.get(r.member_id) || 0) }))
      .filter((r) => r.delta !== 0)
      .sort((a, b) => b.delta - a.delta || b.rating - a.rating);
    return { listMode, period, rows, summary };
  }
  const rows = base
    .filter((r) => matchesListMode(listMode, r.weight_role))
    .sort((a, b) => b.rating - a.rating || b.rated_thesis_count - a.rated_thesis_count);
  return { listMode, rows, summary };
}

/* Tier names as the engine stores them (labels match EZANA_TIERS). */
const TIER_LABELS = {
  legend: 'Legend',
  cio: 'CIO',
  portfolio_mgr: 'Portfolio Manager',
  senior_analyst: 'Senior Analyst',
  analyst: 'Analyst',
  junior_analyst: 'Junior Analyst',
  trainee: 'Trainee',
  unranked: 'Unranked',
};
export const tierLabelOf = (t) => TIER_LABELS[t] || 'Unranked';
