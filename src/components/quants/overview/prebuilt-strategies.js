// Prebuilt strategy library for the Quant Lab Overview (Nov 28 2026).
//
// The source of truth for every template is LAB_TEMPLATES (the same rule
// specs the Strategy Lab builder starts from). This file only adds the
// labels the library needs (category, method, one-line entry/exit/risk read
// straight off the spec) and lists the strategy families that are planned,
// not built. Pure: no React, no fetch.

import { LAB_TEMPLATES } from '../lab/lab-templates.js';
import {
  CONDITIONS,
  canonicalJson,
  explainSpec,
  validateSpec,
} from '../../../lib/quants/strategy-spec.js';

/** Library categories, in display order. Only populated ones are offered. */
export const CATEGORIES = [
  ['trend', 'Trend / Momentum'],
  ['mean-reversion', 'Mean reversion'],
  ['event', 'Event driven'],
];

/* Editorial labels per template id. Everything numeric comes from the spec. */
const META = {
  'trend-following': {
    category: 'trend',
    discipline: 'Trend',
    method:
      'Moving-average crossover on a single index ETF: in the market while the 50-day average is above the 200-day, out when it crosses back.',
    icon: 'bi-graph-up-arrow',
  },
  'mean-reversion': {
    category: 'mean-reversion',
    discipline: 'Mean reversion',
    method:
      'Buys short-term oversold readings (RSI 14 below 30) only in stocks still above their 200-day average, and sells into the recovery.',
    icon: 'bi-arrow-repeat',
  },
  'momentum-trailing': {
    category: 'trend',
    discipline: 'Momentum',
    method:
      'Enters when MACD crosses above its signal line in an uptrend and lets a trailing stop, not a target, decide the exit.',
    icon: 'bi-lightning-charge',
  },
  'congress-following': {
    category: 'event',
    discipline: 'Alternative data',
    method:
      'Buys after a member of Congress discloses a purchase, while the stock is above its 200-day average. Events are dated by public disclosure, never by the trade date.',
    icon: 'bi-bank',
  },
};

/** Strategy families that need data or engine support not built yet. */
export const PLANNED_FAMILIES = [
  ['Volatility breakout', 'Needs intraday ranges'],
  ['Market-neutral pairs', 'Needs short-leg portfolio backtests'],
  ['Earnings drift', 'Needs an earnings-date event source'],
  ['Cross-asset macro rotation', 'Needs multi-asset series'],
  ['Factor rotation', 'Needs factor return series in the engine'],
];

const cap = (x) => (x ? x[0].toUpperCase() + x.slice(1) : x);

function condLabel(node) {
  if (!node) return '';
  if (node.op === 'cond') {
    const def = CONDITIONS[node.id];
    const p = node.params || {};
    switch (node.id) {
      case 'sma_cross_up':
        return `${p.fast}-day average crosses above the ${p.slow}-day`;
      case 'sma_cross_down':
        return `${p.fast}-day average crosses below the ${p.slow}-day`;
      case 'rsi_below':
        return `RSI ${p.period} below ${p.threshold}`;
      case 'rsi_above':
        return `RSI ${p.period} above ${p.threshold}`;
      case 'price_above_sma':
        return `price above its ${p.period}-day average`;
      case 'macd_cross_up':
        return 'MACD crosses above its signal line';
      case 'congress_buy':
        return `a Congress purchase disclosed in the last ${p.withinDays} days`;
      default:
        return def?.label || node.id;
    }
  }
  const parts = (node.args || []).map(condLabel).filter(Boolean);
  return parts.join(node.op === 'or' ? ' or ' : ' and ');
}

function exitLabel(exit = {}) {
  const parts = [];
  if (exit.rule) parts.push(condLabel(exit.rule));
  if (exit.trailingStopPct) parts.push(`${exit.trailingStopPct}% trailing stop`);
  if (exit.stopLossPct && !exit.rule && !exit.trailingStopPct)
    parts.push(`${exit.stopLossPct}% stop loss`);
  if (exit.maxHoldDays && !exit.rule) parts.push(`${exit.maxHoldDays} days held`);
  return parts.join(' or ') || 'Held to the end of the test';
}

function riskLabel(spec) {
  const e = spec.exit || {};
  const bits = [];
  if (e.stopLossPct) bits.push(`${e.stopLossPct}% stop loss`);
  if (e.trailingStopPct) bits.push(`${e.trailingStopPct}% trailing stop`);
  if (e.maxHoldDays) bits.push(`max ${e.maxHoldDays} days`);
  const s = spec.sizing || {};
  bits.push(
    s.type === 'pct_equity'
      ? `${s.pct}% of equity each, up to ${s.maxPositions}`
      : `equal weight, up to ${s.maxPositions}`,
  );
  return bits.join(' · ');
}

/** Canonical form of a spec, for spotting a user's unchanged copy of a template. */
export function specKey(spec) {
  const checked = validateSpec(spec);
  return checked.ok ? canonicalJson(checked.spec) : null;
}

/** The library rows, derived from LAB_TEMPLATES. */
export function prebuiltStrategies() {
  return LAB_TEMPLATES.map((t) => {
    const meta = META[t.id] || { category: 'trend', discipline: 'Strategy', method: t.summary };
    const checked = validateSpec(t.spec);
    const events = JSON.stringify(t.spec.entry).includes('congress_');
    return {
      id: t.id,
      name: t.name,
      summary: t.summary,
      ...meta,
      spec: t.spec,
      backtestable: checked.ok,
      eventDriven: events,
      universe: t.spec.universe,
      benchmark: t.spec.benchmark,
      side: t.spec.side,
      entry: cap(condLabel(t.spec.entry)),
      exit: cap(exitLabel(t.spec.exit)),
      risk: cap(riskLabel(t.spec)),
      key: checked.ok ? canonicalJson(checked.spec) : null,
      rules: checked.ok ? explainSpec(checked.spec) : [],
    };
  });
}

/**
 * The user's saved strategies whose rules are still exactly a template's,
 * with the latest completed run of each: { [templateId]: { strategy, run } }.
 * A template the user has edited no longer matches, by design.
 */
export function templateRuns(templates, strategies, latest) {
  const out = {};
  for (const s of strategies) {
    const key = s.version?.spec ? specKey(s.version.spec) : null;
    if (!key) continue;
    const t = templates.find((x) => x.key === key);
    if (!t) continue;
    const run = latest[s.id];
    if (!run) continue;
    const prev = out[t.id];
    if (!prev || Date.parse(run.created_at || 0) > Date.parse(prev.run.created_at || 0))
      out[t.id] = { strategy: s, run };
  }
  return out;
}
