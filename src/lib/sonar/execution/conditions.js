/**
 * Sonar 6.5: multi-condition screening with three-valued logic, and set operations on
 * canonical security ids (Nov 28 2026).
 *
 * For every entity and every condition the verdict is pass, fail or unknown. Unknown is never
 * false: a company with valid margins but no comparable 13F filings is unknown on the 13F
 * condition, not "declining". A condition whose source failed or was not permitted is
 * unknown for every entity, with the step's reason.
 *
 *   combined verdict:  fail if any condition fails; pass only if every condition passes;
 *                      otherwise unknown (Kleene conjunction)
 *
 * A screen is exhaustive only when every eligible entity was evaluated on every condition.
 * Pure; unit-tested in scripts/check-sonar-6-5.mjs.
 */
import { securityId } from '../composer/stages.js';

export const VERDICTS = ['pass', 'fail', 'unknown'];

const num = (v) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * One condition on one value.
 * cond: { id, op: '>'|'<'|'>='|'<='|'exists'|'not_exists'|'between', value?, min?, max?,
 *         zeroIsConfirmed?: boolean }
 * A null value is unknown, except for 'exists' / 'not_exists' on a source where absence of a
 * record is a confirmed zero (zeroIsConfirmed, e.g. dated awards in a complete window).
 */
export function evaluate(cond, raw) {
  const v = num(raw);
  if (v === null) {
    if (cond.zeroIsConfirmed && cond.op === 'exists') return 'fail';
    if (cond.zeroIsConfirmed && cond.op === 'not_exists') return 'pass';
    return 'unknown';
  }
  switch (cond.op) {
    case 'has_value':
      return 'pass';
    case 'exists':
      return v > 0 ? 'pass' : 'fail';
    case 'not_exists':
      return v > 0 ? 'fail' : 'pass';
    case '>':
      return v > Number(cond.value) ? 'pass' : 'fail';
    case '>=':
      return v >= Number(cond.value) ? 'pass' : 'fail';
    case '<':
      return v < Number(cond.value) ? 'pass' : 'fail';
    case '<=':
      return v <= Number(cond.value) ? 'pass' : 'fail';
    case 'between':
      return v >= Number(cond.min) && v <= Number(cond.max) ? 'pass' : 'fail';
    default:
      return 'unknown';
  }
}

export function combine(verdicts = []) {
  if (verdicts.some((x) => x === 'fail')) return 'fail';
  if (verdicts.length && verdicts.every((x) => x === 'pass')) return 'pass';
  return 'unknown';
}

/**
 * Screen a universe on several conditions.
 * @param universe    [{ ticker, cik?, cusip?, name? }]
 * @param conditions  [{ id, label, source, op, value?, zeroIsConfirmed? }]
 * @param values      { [ticker]: { [conditionId]: number|null } }
 * @param sources     { [source]: { status, reason } }  per-source step status
 * @param unchecked   tickers that were eligible but not evaluated (caps)
 * -> { matrix, passing, failing, unknown, unchecked, outcome, exhaustive, conditions }
 */
export function screenEntities({
  universe = [],
  conditions = [],
  values = {},
  sources = {},
  unchecked = [],
}) {
  const skip = new Set(unchecked.map((t) => String(t).toUpperCase()));
  const matrix = [];
  for (const u of universe) {
    const t = String(u.ticker || '').toUpperCase();
    if (skip.has(t)) continue;
    const cells = {};
    const reasons = {};
    for (const c of conditions) {
      const src = sources[c.source];
      if (
        src &&
        !['complete', 'complete_with_missing_data', 'partial', 'bounded'].includes(src.status)
      ) {
        cells[c.id] = 'unknown';
        reasons[c.id] = `${c.source} ${src.status}: ${src.reason || 'not evaluated'}`;
        continue;
      }
      const raw = values[t]?.[c.id];
      cells[c.id] = evaluate(c, raw);
      if (cells[c.id] === 'unknown') reasons[c.id] = `no ${c.label || c.id} on record`;
    }
    matrix.push({
      securityId: securityId({ ticker: t, cik: u.cik, cusip: u.cusip }),
      ticker: t,
      name: u.name || null,
      cells,
      reasons,
      verdict: combine(conditions.map((c) => cells[c.id])),
    });
  }
  const by = (v) => matrix.filter((m) => m.verdict === v);
  const passing = by('pass');
  const failing = by('fail');
  const unknown = by('unknown');
  const exhaustive = skip.size === 0 && unknown.length === 0;
  const anyFailedSource = Object.values(sources).some(
    (s) =>
      s && !['complete', 'complete_with_missing_data', 'partial', 'bounded'].includes(s.status),
  );
  return {
    conditions: conditions.map((c) => ({
      id: c.id,
      label: c.label || c.id,
      source: c.source,
      op: c.op,
      value: c.value ?? null,
    })),
    matrix,
    passing,
    failing,
    unknown,
    unchecked: [...skip],
    exhaustive,
    outcome: {
      eligible: universe.length,
      evaluated: matrix.length,
      passing: passing.length,
      failing: failing.length,
      unknown: unknown.length,
      unchecked: skip.size,
      status: anyFailedSource
        ? 'partial'
        : skip.size
          ? 'bounded'
          : unknown.length
            ? 'complete_with_missing_data'
            : 'complete',
      /* A genuine zero-result screen: everything ran, everything evaluated, nothing passed. */
      zeroResult:
        passing.length === 0 && !anyFailedSource && skip.size === 0 && unknown.length === 0,
    },
  };
}

/* ── set operations on canonical ids ─────────────────────────────────── */

const idOf = (e) => e.securityId || securityId({ cik: e.cik, cusip: e.cusip, ticker: e.ticker });

/**
 * Set algebra on entity lists, keyed by canonical id (never by display name).
 * op: 'intersect' | 'union' | 'difference' | 'exclude'
 */
export function setOp(op, a = [], b = []) {
  const bIds = new Set(b.map(idOf));
  const aIds = new Set(a.map(idOf));
  switch (op) {
    case 'intersect':
      return a.filter((e) => bIds.has(idOf(e)));
    case 'union': {
      const out = [...a];
      for (const e of b) if (!aIds.has(idOf(e))) out.push(e);
      return out;
    }
    case 'difference':
    case 'exclude':
      return a.filter((e) => !bIds.has(idOf(e)));
    default:
      throw new Error(`setOp: unknown operation ${op}`);
  }
}

/** Rank by a value (nulls never ranked), then top N. */
export function rankTop(entities = [], key, { direction = 'descending', topN = Infinity } = {}) {
  const withV = entities.filter((e) => num(e[key] ?? e.values?.[key]) !== null);
  const val = (e) => num(e[key] ?? e.values?.[key]);
  const sorted = [...withV].sort(
    (x, y) =>
      (direction === 'ascending' ? val(x) - val(y) : val(y) - val(x)) ||
      String(x.ticker).localeCompare(String(y.ticker)),
  );
  return { ranked: sorted.slice(0, topN), notRanked: entities.length - withV.length };
}

/** Group entities by a field. */
export function groupBy(entities = [], key) {
  const out = {};
  for (const e of entities) (out[e[key] ?? 'unclassified'] ||= []).push(e);
  return out;
}
