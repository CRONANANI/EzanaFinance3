/**
 * Sonar financial component data contracts (Nov 28 2026).
 *
 * Every component in the Sonar research library (src/components/sonar/{cards,charts,layout})
 * receives one normalized payload. The payload carries the figures and everything a reader
 * needs to trust them: the metric, unit, currency, reporting period, when the data was
 * retrieved, how it was calculated, which evidence backs it, how complete it is and whether
 * the reader may see it. Components never calculate figures; they draw what the analytical
 * layer verified.
 *
 * Rules enforced here:
 *   - A missing value is null, never 0. `num()` turns '', undefined, NaN and 'N/A' into null.
 *   - A share chart (donut) needs mutually exclusive categories; overlapping categories are
 *     shown as ranked bars and never forced to total 100%.
 *   - A ranking only animates across two or more real reporting snapshots.
 *   - A rising metric is not automatically good: the tone of a change follows the metric's
 *     polarity, and is neutral when the polarity is not known.
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-presentation.mjs.
 */

export const CONTRACT_VERSION = 'sonar-contract-v1';

/** A finite number, or null. Never invents a zero for a missing value. */
export function num(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string' && /^\s*(n\/?a|na|null|none|-+|\u2014)\s*$/i.test(v)) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,%\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

const str = (v) => {
  const s = v == null ? '' : String(v).trim();
  return s || null;
};

const COMPLETENESS = new Set(['complete', 'partial', 'unavailable', 'unsupported']);

/** The reporting period, normalized: { label, from, to } or null. */
export function periodOf(p) {
  if (!p) return null;
  if (typeof p === 'string') return { label: p, from: null, to: null };
  const from = str(p.from);
  const to = str(p.to);
  const label = str(p.label) || [from, to].filter(Boolean).join(' to ') || null;
  return label || from || to ? { label, from, to } : null;
}

/**
 * Data flags a reader must see beside a figure. Derived from what the payload says about
 * itself, never guessed: an estimate, delayed data, a 13F snapshot (holdings as of a filing
 * date, not current), a congressional estimated holding (a value range, not a position), or a
 * federal award vintage (obligations in a fiscal year, not spending or revenue).
 */
export function flagsOf(raw = {}) {
  const f = raw.flags || {};
  return {
    estimate: Boolean(f.estimate || raw.basis === 'estimate'),
    delayed: Boolean(f.delayed),
    snapshot: Boolean(f.snapshot || raw.dataset?.id === 'institutional_13f'),
    rangeEstimate: Boolean(f.rangeEstimate),
    awardVintage: Boolean(f.awardVintage || raw.dataset?.id === 'contracts_history'),
  };
}

/** The visible labels for a payload's flags, in reading order. */
export function flagLabels(flags = {}) {
  const out = [];
  if (flags.estimate) out.push({ key: 'estimate', label: 'Estimate' });
  if (flags.rangeEstimate) out.push({ key: 'range', label: 'Disclosed range' });
  if (flags.snapshot) out.push({ key: 'snapshot', label: 'Filing snapshot' });
  if (flags.awardVintage) out.push({ key: 'vintage', label: 'Award year' });
  if (flags.delayed) out.push({ key: 'delayed', label: 'Delayed' });
  return out;
}

/**
 * Normalize a component payload. Unknown fields pass through on `data`; the contract fields
 * are always present (null when the source did not provide them).
 */
export function normalizePayload(raw = {}) {
  const completeness = COMPLETENESS.has(raw.completeness) ? raw.completeness : null;
  const coverage =
    raw.coverage && (num(raw.coverage.covered) !== null || num(raw.coverage.total) !== null)
      ? { covered: num(raw.coverage.covered), total: num(raw.coverage.total) }
      : null;
  return {
    version: CONTRACT_VERSION,
    componentId: str(raw.componentId),
    objective: str(raw.objective),
    title: str(raw.title),
    dataset: raw.dataset ? { id: str(raw.dataset.id), label: str(raw.dataset.label) } : null,
    entity: raw.entity
      ? { id: str(raw.entity.id), label: str(raw.entity.label), kind: str(raw.entity.kind) }
      : null,
    metric: str(raw.metric),
    unit: str(raw.unit),
    currency: str(raw.currency),
    period: periodOf(raw.period),
    retrievedAt: str(raw.retrievedAt),
    methodology: str(raw.methodology),
    source: str(raw.source),
    evidenceIds: Array.isArray(raw.evidenceIds) ? raw.evidenceIds.filter(Boolean) : [],
    coverage,
    completeness,
    limitations: (Array.isArray(raw.limitations) ? raw.limitations : [])
      .map((l) => str(l))
      .filter(Boolean),
    access: { scope: str(raw.access?.scope) || 'public', entitled: raw.access?.entitled !== false },
    flags: flagsOf(raw),
    data: raw.data ?? null,
  };
}

/* ── figure formatting (one place, so every card reads the same) ─────────────── */

const MONEY_UNITS = new Set(['usd', 'money', 'currency', 'dollars', '$']);

/** A figure as the reader sees it. Null reads N/A (branding guide, section 8). */
export function formatFigure(value, unit = null, { currency = null, compact = false } = {}) {
  const v = num(value);
  if (v === null) return 'N/A';
  const u = String(unit || '').toLowerCase();
  if (u === 'percent' || u === '%') return `${v.toFixed(Math.abs(v) >= 100 ? 0 : 2)}%`;
  if (u === 'ratio') return `${(v * 100).toFixed(1)}%`;
  if (u === 'multiple' || u === 'x') return `${v.toFixed(1)}x`;
  if (u === 'bps') return `${Math.round(v)} bps`;
  if (MONEY_UNITS.has(u) || currency) {
    const cur = currency || 'USD';
    if (compact || Math.abs(v) >= 1e6)
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: cur,
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(v);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  }
  if (compact && Math.abs(v) >= 1e4)
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(v);
  return v.toLocaleString('en-US', { maximumFractionDigits: Number.isInteger(v) ? 0 : 2 });
}

/** A signed change: +9.33%, -0.92 pp. Null reads N/A. */
export function formatChange(delta, { unit = 'percent', pp = false } = {}) {
  const d = num(delta);
  if (d === null) return 'N/A';
  const sign = d > 0 ? '+' : d < 0 ? '-' : '';
  const abs = Math.abs(d);
  if (pp) return `${sign}${abs.toFixed(2)} pp`;
  if (unit === 'percent') return `${sign}${abs.toFixed(2)}%`;
  return `${sign}${formatFigure(abs, unit)}`;
}

/* ── metric meaning ───────────────────────────────────────────────────────────── */

/**
 * Which direction is favourable for a metric. 'higher' and 'lower' only where the direction
 * is unambiguous for an investor; everything contextual (inflation, rates, valuation
 * multiples, award values, holder counts, volatility) is 'neutral'.
 */
export const METRIC_POLARITY = {
  revenue_growth: 'higher',
  revenue: 'higher',
  eps: 'higher',
  free_cash_flow: 'higher',
  operating_margin: 'higher',
  gross_margin: 'higher',
  net_margin: 'higher',
  portfolio_return: 'higher',
  debt_to_equity: 'lower',
  net_debt_to_ebitda: 'lower',
  drawdown: 'lower',
  pe: 'neutral',
  earnings_yield: 'neutral',
  inflation: 'neutral',
  policy_rate: 'neutral',
  interest_rate: 'neutral',
  volatility: 'neutral',
  award_value: 'neutral',
  manager_count: 'neutral',
};

/** 'favourable' | 'unfavourable' | 'neutral' for a change in a metric. */
export function changeTone(metric, delta, polarity = null) {
  const d = num(delta);
  if (d === null || d === 0) return 'neutral';
  const p = polarity || METRIC_POLARITY[metric] || 'neutral';
  if (p === 'higher') return d > 0 ? 'favourable' : 'unfavourable';
  if (p === 'lower') return d < 0 ? 'favourable' : 'unfavourable';
  return 'neutral';
}

/* ── eligibility checks shared by the registry ───────────────────────────────── */

/**
 * Whether categories can be drawn as shares of one whole. Every part must be flagged
 * exclusive by the data layer (`exclusive: true` on the payload), carry a non-negative value,
 * and the parts must not exceed the stated denominator.
 */
export function isMutuallyExclusive(parts = [], { exclusive = false, total = null } = {}) {
  if (!exclusive) return false;
  const vals = (parts || []).map((p) => num(p?.value));
  if (vals.length < 2 || vals.some((v) => v === null || v < 0)) return false;
  const sum = vals.reduce((a, v) => a + v, 0);
  const t = num(total);
  return t === null ? sum > 0 : sum <= t * 1.0005 && sum > 0;
}

/**
 * Real snapshots for a ranking over time: two or more distinct periods, each with at least
 * two ranked rows. Nothing is interpolated between them.
 */
export function comparableSnapshots(snapshots = []) {
  const list = (snapshots || []).filter(
    (s) =>
      s &&
      str(s.period) &&
      Array.isArray(s.rows) &&
      s.rows.filter((r) => num(r?.value) !== null).length >= 2,
  );
  const periods = new Set(list.map((s) => String(s.period)));
  return periods.size >= 2 && periods.size === list.length ? list : [];
}

/**
 * The gaps in a series: the indexes whose value is null. A line is broken at each gap and the
 * component says so, instead of drawing through the missing period.
 */
export function seriesGaps(series = [], key = 'y') {
  const gaps = [];
  (series || []).forEach((p, i) => {
    if (num(p?.[key]) === null) gaps.push(i);
  });
  return gaps;
}

/** Points to segments, split at the gaps: [[{x,y}...], ...] with null values removed. */
export function splitAtGaps(series = [], key = 'y') {
  const out = [];
  let cur = [];
  for (const p of series || []) {
    const v = num(p?.[key]);
    if (v === null) {
      if (cur.length) out.push(cur);
      cur = [];
    } else cur.push({ ...p, [key]: v });
  }
  if (cur.length) out.push(cur);
  return out;
}

/** The fraction of non-null values (0..1), for a component's minimum data sufficiency. */
export function coverageRatio(values = []) {
  const list = values || [];
  if (!list.length) return 0;
  return list.filter((v) => num(v) !== null).length / list.length;
}
