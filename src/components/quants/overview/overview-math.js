// Pure helpers for the Quant Lab Overview. No React, no fetch, no clock:
// every function takes what it needs, so scripts/check-quant-overview.mjs can
// test them directly.

import { CONDITIONS } from '../../../lib/quants/strategy-spec.js';

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

/** Sessions shown for each chart period. 'run' is the whole stored run. */
export const PERIODS = [
  ['m3', '3M', 63],
  ['m6', '6M', 126],
  ['y1', '1Y', 252],
  ['run', 'Run', null],
];

/** The last `sessions` points of a curve (all of it when sessions is null). */
export function sliceCurve(curve, period) {
  const sessions = PERIODS.find((p) => p[0] === period)?.[2] ?? null;
  if (!sessions || curve.length <= sessions + 1) return curve;
  /* One extra point, so the first return of the window has a start value. */
  return curve.slice(-(sessions + 1));
}

/**
 * Cumulative returns of a curve slice, rebased to 0 at its first point.
 * The benchmark is rebased at its own first numeric point.
 */
export function cumulative(curve) {
  const e0 = curve[0]?.equity;
  const firstB = curve.find((p) => isNum(p.benchmark) && p.benchmark > 0)?.benchmark;
  return {
    dates: curve.map((p) => p.date),
    strategy: curve.map((p) => (e0 > 0 && isNum(p.equity) ? p.equity / e0 - 1 : null)),
    benchmark: curve.map((p) => (firstB && isNum(p.benchmark) ? p.benchmark / firstB - 1 : null)),
  };
}

/** Evenly spaced tick values from `hi` down to `lo`, `count` of them. */
export function ticks(lo, hi, count = 5) {
  return Array.from({ length: count }, (_, i) => hi - ((hi - lo) * i) / (count - 1));
}

/** `count` evenly spaced items of a list, first and last included. */
export function pickEven(list, count = 5) {
  if (list.length <= count) return list;
  return Array.from(
    { length: count },
    (_, i) => list[Math.round(((list.length - 1) * i) / (count - 1))],
  );
}

/**
 * What kind of strategy a spec is, from the groups of its entry conditions:
 * one group gives that group's name, several give 'Mixed'.
 */
export function strategyType(spec) {
  const groups = new Set();
  const walk = (n) => {
    if (!n) return;
    if (n.op === 'cond') {
      if (CONDITIONS[n.id]) groups.add(CONDITIONS[n.id].group);
    } else if (n.op === 'not') walk(n.arg);
    else (n.args || []).forEach(walk);
  };
  walk(spec?.entry);
  if (!groups.size) return 'Rules';
  return groups.size === 1 ? [...groups][0] : 'Mixed';
}

/**
 * Research status of a strategy, from facts on record only:
 *   Archived   the owner archived it
 *   Draft      no completed backtest
 *   Research   at least one completed backtest
 * A positive return never changes the status.
 */
export function strategyStatus(strategy, hasCompletedRun) {
  if (strategy.status === 'archived') return 'Archived';
  return hasCompletedRun ? 'Research' : 'Draft';
}

/** "5m ago", "3h ago", "2d ago", or the date once it is over a week old. */
export function relativeTime(iso, nowMs) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const mins = Math.max(0, Math.round((nowMs - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `${days}d ago`;
  return String(iso).slice(0, 10);
}

/**
 * One feed of recent research, newest first, from stored backtests and
 * validations. `names` maps strategy id to its name.
 */
export function activityFeed(runs, validations, names, limit = 5) {
  const items = [];
  for (const r of runs || []) {
    items.push({
      id: `run-${r.id}`,
      kind: 'backtest',
      status: r.status,
      at: r.created_at,
      strategyId: r.strategy_id,
      runId: r.id,
      name: names[r.strategy_id] || 'Deleted strategy',
      result: isNum(r.metrics?.totalReturn) ? r.metrics.totalReturn : null,
      resultKind: 'return',
      error: r.error || null,
    });
  }
  for (const v of validations || []) {
    items.push({
      id: `val-${v.id}`,
      kind: 'validation',
      status: v.status,
      at: v.created_at,
      strategyId: v.strategy_id,
      runId: null,
      name: names[v.strategy_id] || 'Deleted strategy',
      result: isNum(v.summary?.outOfSampleSharpe) ? v.summary.outOfSampleSharpe : null,
      resultKind: 'sharpe',
      error: v.error || null,
    });
  }
  return items
    .filter((i) => i.at)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, limit);
}

/**
 * The strategy with the highest Sharpe on its latest completed run.
 * `latest` maps strategy id to that run's summary. Null when none has one.
 */
export function bestSharpe(strategies, latest) {
  let best = null;
  for (const s of strategies) {
    const m = latest[s.id]?.metrics;
    if (isNum(m?.sharpe) && (!best || m.sharpe > best.sharpe)) {
      best = { strategy: s, sharpe: m.sharpe, run: latest[s.id] };
    }
  }
  return best;
}

/** For each strategy id, its most recent COMPLETED run among summaries (newest first). */
export function latestCompleted(runs) {
  const out = {};
  for (const r of runs || []) {
    if (r.status === 'completed' && !out[r.strategy_id]) out[r.strategy_id] = r;
  }
  return out;
}
