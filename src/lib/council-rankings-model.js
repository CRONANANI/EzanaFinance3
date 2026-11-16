/**
 * Council Rankings (/council-rankings and /council-rankings/[orgId]): the
 * rules the page shows, kept pure so they can be tested.
 *
 * The rating itself comes from src/lib/council-elo/model.js (60 percent
 * competition, 40 percent fund, both starting at 1000). This file only reads
 * the stored figures: rank with ties, the gap to the council above, points to
 * the next tier, the councils beside the viewer's own, which part is ahead,
 * and a generic reason for a rating change.
 *
 * A rating change is never tied to a named event: the stored record says
 * only which part moved more, so that is all the page says.
 *
 * No React, no fetch, no server imports.
 */
import { TIERS, WEIGHTS } from './council-elo/model.js';

export const NA = 'N/A';
export const BASE = WEIGHTS.elo.base;
export const FUND_BASE = WEIGHTS.fund.ratingBase;
export const COMP_WEIGHT = Math.round(WEIGHTS.blend.competition * 100);
export const FUND_WEIGHT = Math.round(WEIGHTS.blend.fund * 100);

export const COMPETITIONS_HREF = '/org-competitions';
export const FUND_ANALYTICS_HREF = '/org-team-hub/fund-analytics';
/* The fund ratio form keeps its address on Competitions; this page opens
   the same form in a dialog for managers and links there for everyone. */
export const COUNCIL_FORM_HREF = '/org-competitions/council';
export const MANAGER_ROLES = ['executive', 'portfolio_manager'];

export const SORTS = [
  { key: 'overall', label: 'Overall', field: 'rating', note: 'overall rating' },
  { key: 'competition', label: 'Competition', field: 'comp', note: 'competition rating' },
  { key: 'fund', label: 'Fund', field: 'fund', note: 'fund rating' },
];

export const TIER_LABEL = {
  emerging: 'Emerging',
  competitive: 'Competitive',
  established: 'Established',
  elite: 'Elite',
  dynasty: 'Dynasty',
};
export const TIER_ICON = {
  emerging: 'bi-circle',
  competitive: 'bi-circle-half',
  established: 'bi-circle-fill',
  elite: 'bi-star-half',
  dynasty: 'bi-star-fill',
};
export const tierLabel = (t) => TIER_LABEL[t] || (t ? String(t) : NA);
export const tierIcon = (t) => TIER_ICON[t] || 'bi-circle';

export function sortOf(key) {
  return SORTS.find((s) => s.key === key) || SORTS[0];
}

/**
 * Sort by the chosen rating, high to low, and number the rows so that equal
 * ratings share a rank (1, 2, 2, 4). Name breaks ties in the order only.
 */
export function rankRows(rows, key = 'overall') {
  const { field } = sortOf(key);
  const val = (r) => (Number.isFinite(Number(r?.[field])) ? Number(r[field]) : -Infinity);
  const sorted = [...(rows || [])].sort(
    (a, b) => val(b) - val(a) || String(a.name).localeCompare(String(b.name)),
  );
  let rank = 0;
  let last = null;
  return sorted.map((r, i) => {
    if (last === null || val(r) !== last) {
      rank = i + 1;
      last = val(r);
    }
    return { ...r, rank };
  });
}

/** Case-insensitive name filter. Ranks stay those of the full table. */
export function filterRows(ranked, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return ranked;
  return ranked.filter((r) => String(r.name).toLowerCase().includes(q));
}

/** The next tier above a rating and the points still needed; null at the top. */
export function nextTier(rating) {
  const r = Number(rating);
  if (!Number.isFinite(r)) return null;
  const above = [...TIERS].reverse().find((t) => t.min > r);
  return above ? { tier: above.tier, points: above.min - r } : null;
}

/**
 * The viewer's own council on the overall table: its row, rank, field size,
 * the gap to the council directly above (null when first) and its
 * neighbours (one above, one below).
 */
export function ownStanding(rows, myOrgId) {
  if (!myOrgId) return null;
  const ranked = rankRows(rows, 'overall');
  const i = ranked.findIndex((r) => r.orgId === myOrgId);
  if (i === -1) return null;
  const me = ranked[i];
  const above =
    ranked
      .slice(0, i)
      .reverse()
      .find((r) => r.rating > me.rating) || null;
  return {
    me,
    rank: me.rank,
    field: ranked.length,
    gapToNext: above ? above.rating - me.rating : null,
    nearest: ranked.slice(Math.max(0, i - 1), i + 2).map((r) => ({
      ...r,
      gap: r.orgId === myOrgId ? null : r.rating - me.rating,
    })),
  };
}

/** Which part is ahead, in words, with the signed difference. */
export function partsLine(comp, fund) {
  const c = Number(comp);
  const f = Number(fund);
  if (!Number.isFinite(c) || !Number.isFinite(f)) return null;
  if (c === f) return { ahead: null, by: 0, text: 'Competition and fund are level' };
  const ahead = f > c ? 'fund' : 'competition';
  const by = Math.abs(f - c);
  return {
    ahead,
    weaker: ahead === 'fund' ? 'competition' : 'fund',
    by,
    text: ahead === 'fund' ? 'Fund ahead of competition by' : 'Competition ahead of fund by',
  };
}

/**
 * A rating change in words. The stored record names only the part that moved
 * more (recalculations never record the event or placement), so the reason is
 * generic on purpose.
 */
export function changeReason(component) {
  if (component === 'competition') return 'Recalculated, the competition part moved more';
  if (component === 'fund') return 'Recalculated, the fund part moved more';
  return 'Rating adjusted';
}
export const partLabel = (component) =>
  component === 'competition' ? 'Competition' : component === 'fund' ? 'Fund' : 'Adjustment';

/* ── Formatting ─────────────────────────────────────────────────────────── */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Aug 03, 2026" from an ISO date (UTC day, so server and client agree). */
export function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return NA;
  return `${MONTHS[Number(m[2]) - 1]} ${m[3]}, ${m[1]}`;
}

export function fmtInt(v) {
  const n = Number(v);
  return v == null || !Number.isFinite(n) ? NA : String(Math.round(n));
}

/** "+27", "-12", "0"; N/A when missing. */
export function fmtSigned(v) {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return NA;
  const r = Math.round(n);
  return r > 0 ? `+${r}` : String(r);
}

/** Signed percentage, one decimal: "+17.8%", "-0.9%". */
export function fmtPctSigned(v) {
  const n = Number(v);
  if (v == null || v === '' || !Number.isFinite(n)) return NA;
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(1)}%`;
}

/** Unsigned percentage, one decimal (volatility). */
export function fmtPct(v) {
  const n = Number(v);
  if (v == null || v === '' || !Number.isFinite(n)) return NA;
  return `${n.toFixed(1)}%`;
}

/** A drawdown is a loss: shown negative whichever sign it was typed with. */
export function fmtDrawdown(v) {
  const n = Number(v);
  if (v == null || v === '' || !Number.isFinite(n)) return NA;
  return n === 0 ? '0.0%' : `-${Math.abs(n).toFixed(1)}%`;
}

export function fmtRatio(v) {
  const n = Number(v);
  if (v == null || v === '' || !Number.isFinite(n)) return NA;
  return n.toFixed(2);
}

export const toneOf = (v) => {
  const n = Number(v);
  if (v == null || !Number.isFinite(n) || n === 0) return '';
  return n > 0 ? 'pos' : 'neg';
};

/* ── Fund ratio form ────────────────────────────────────────────────────── */
export const RATIO_FIELDS = [
  { key: 'roi_pct', label: 'Return', unit: '%', hint: 'Period return, percent' },
  { key: 'sharpe', label: 'Sharpe', unit: '', hint: 'Weighted most' },
  { key: 'benchmark_alpha_pct', label: 'Alpha', unit: '%', hint: 'Versus benchmark, percent' },
  { key: 'max_drawdown_pct', label: 'Max drawdown', unit: '%', hint: 'Largest fall, percent' },
  { key: 'volatility_pct', label: 'Volatility', unit: '%', hint: 'Percent' },
];
export const PERIOD_MAX = 40;

export function formFromMetrics(m) {
  const out = { period_label: m?.period_label ?? '' };
  for (const f of RATIO_FIELDS) out[f.key] = m?.[f.key] ?? '';
  return out;
}

/** Field errors for the ratio form ({} when valid). Ratios only, never dollars. */
export function validateRatios(form) {
  const errors = {};
  const period = String(form?.period_label ?? '').trim();
  if (period.length > PERIOD_MAX)
    errors.period_label = `Keep the period under ${PERIOD_MAX} characters.`;
  if (/[$€£¥]/.test(period)) errors.period_label = 'Ratios and percentages only, no amounts.';
  for (const f of RATIO_FIELDS) {
    const raw = form?.[f.key];
    if (raw === '' || raw == null) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) errors[f.key] = 'Enter a number.';
    else if (Math.abs(n) > 1000) errors[f.key] = 'That looks too large for a ratio.';
  }
  return errors;
}

/** The body the fund ratio route accepts (numbers or null, period text). */
export function ratioBody(form) {
  const body = { period_label: String(form?.period_label ?? '').trim() };
  for (const f of RATIO_FIELDS) {
    const raw = form?.[f.key];
    body[f.key] = raw === '' || raw == null ? null : Number(raw);
  }
  return body;
}

/**
 * Sample content only: apply saved ratios to the bundle on the page. The
 * rating is not recalculated (the real one is recalculated once a day).
 */
export function applySampleRatios(bundle, orgId, form) {
  if (!bundle || !orgId) return bundle;
  const body = ratioBody(form);
  const metrics = { ...body, self_reported: true };
  const rows = bundle.rows.map((r) =>
    r.orgId === orgId
      ? {
          ...r,
          roi: body.roi_pct,
          sharpe: body.sharpe,
          period: body.period_label || null,
          reported: true,
          selfReported: true,
          metrics,
        }
      : r,
  );
  return { ...bundle, rows };
}
