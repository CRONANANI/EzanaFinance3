// src/lib/quants/strategy-spec.js
// The Quant Lab strategy definition: one validated, versionable JSON document
// (a rule tree, not concatenated text) that the builder writes, the database
// stores and the backtest engine reads. Pure module: safe on server and client.
//
//   spec = {
//     specVersion: 1,
//     universe: ['AAPL', 'MSFT'],            1 to 20 tickers
//     benchmark: 'SPY',
//     side: 'long' | 'short',
//     entry: Node,
//     exit: { rule?: Node, stopLossPct?, trailingStopPct?, takeProfitPct?, maxHoldDays? },
//     sizing: { type: 'equal_weight' | 'pct_equity', pct?, maxPositions },
//   }
//   Node = { op: 'and' | 'or', args: Node[] }
//        | { op: 'not', arg: Node }
//        | { op: 'cond', id: <CONDITIONS key>, params: { ... } }

export const SPEC_VERSION = 1;
export const MAX_UNIVERSE = 20;
const MAX_CONDITIONS = 20;
const MAX_DEPTH = 4;
const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

const int = (def, min, max) => ({ kind: 'int', def, min, max });
const num = (def, min, max) => ({ kind: 'num', def, min, max });
const pick = (def, options) => ({ kind: 'enum', def, options });

/**
 * Conditions the engine can evaluate today. Each one is computed from daily
 * open/high/low/close/volume bars only, so it is point-in-time by construction:
 * the value on day t uses bars up to and including day t.
 */
export const CONDITIONS = {
  price_above_sma: {
    label: 'Close above SMA',
    group: 'Trend',
    params: { period: int(50, 2, 400) },
    describe: (p) => `the close is above its ${p.period} day simple moving average`,
    lookback: (p) => p.period,
  },
  price_below_sma: {
    label: 'Close below SMA',
    group: 'Trend',
    params: { period: int(200, 2, 400) },
    describe: (p) => `the close is below its ${p.period} day simple moving average`,
    lookback: (p) => p.period,
  },
  sma_cross_up: {
    label: 'Fast SMA crosses above slow SMA',
    group: 'Trend',
    params: { fast: int(50, 2, 200), slow: int(200, 3, 400) },
    describe: (p) => `the ${p.fast} day SMA crosses above the ${p.slow} day SMA`,
    lookback: (p) => Math.max(p.fast, p.slow) + 1,
    check: (p) => (p.fast < p.slow ? null : 'Fast period must be shorter than slow period'),
  },
  sma_cross_down: {
    label: 'Fast SMA crosses below slow SMA',
    group: 'Trend',
    params: { fast: int(50, 2, 200), slow: int(200, 3, 400) },
    describe: (p) => `the ${p.fast} day SMA crosses below the ${p.slow} day SMA`,
    lookback: (p) => Math.max(p.fast, p.slow) + 1,
    check: (p) => (p.fast < p.slow ? null : 'Fast period must be shorter than slow period'),
  },
  rsi_below: {
    label: 'RSI below',
    group: 'Momentum',
    params: { threshold: num(30, 1, 99), period: int(14, 2, 100) },
    describe: (p) => `the ${p.period} day RSI is below ${p.threshold}`,
    lookback: (p) => p.period * 4,
  },
  rsi_above: {
    label: 'RSI above',
    group: 'Momentum',
    params: { threshold: num(70, 1, 99), period: int(14, 2, 100) },
    describe: (p) => `the ${p.period} day RSI is above ${p.threshold}`,
    lookback: (p) => p.period * 4,
  },
  macd_cross_up: {
    label: 'MACD crosses above signal',
    group: 'Momentum',
    params: {},
    describe: () => 'the MACD (12, 26, 9) line crosses above its signal line',
    lookback: () => 120,
  },
  macd_cross_down: {
    label: 'MACD crosses below signal',
    group: 'Momentum',
    params: {},
    describe: () => 'the MACD (12, 26, 9) line crosses below its signal line',
    lookback: () => 120,
  },
  bollinger_touch: {
    label: 'Price touches Bollinger Band',
    group: 'Volatility',
    params: { band: pick('lower', ['lower', 'upper']), period: int(20, 5, 200) },
    describe: (p) => `price touches the ${p.band} Bollinger Band (${p.period} days, 2 sd)`,
    lookback: (p) => p.period,
  },
  volume_spike: {
    label: 'Volume spike',
    group: 'Volume',
    params: { multiple: num(2, 1.1, 20), window: int(20, 5, 120) },
    describe: (p) =>
      `volume is at least ${p.multiple} times its average over the previous ${p.window} days`,
    lookback: (p) => p.window + 1,
  },
  /* Disclosure conditions. Each reads a list of dates on which a trade became
     PUBLIC (the filing or disclosure date, never the trade date). A date
     counts from the first session after it, because a filing can land after
     the close. `event` names the list the engine must be given. */
  congress_buy: {
    label: 'Congress member disclosed a purchase',
    group: 'Disclosures',
    event: 'congress_buy',
    params: { withinDays: int(5, 1, 60) },
    describe: (p) =>
      `a member of Congress publicly disclosed buying it in the previous ${p.withinDays} days`,
    lookback: () => 0,
  },
  congress_sell: {
    label: 'Congress member disclosed a sale',
    group: 'Disclosures',
    event: 'congress_sell',
    params: { withinDays: int(5, 1, 60) },
    describe: (p) =>
      `a member of Congress publicly disclosed selling it in the previous ${p.withinDays} days`,
    lookback: () => 0,
  },
  insider_purchase: {
    label: 'Insider filed an open-market purchase',
    group: 'Disclosures',
    event: 'insider_purchase',
    params: { withinDays: int(5, 1, 60) },
    describe: (p) =>
      `a company insider filed an open-market purchase in the previous ${p.withinDays} days`,
    lookback: () => 0,
  },
};

/** The disclosure lists a spec needs loaded before it can run, e.g. ['insider_purchase']. */
export function specEventKinds(spec) {
  const kinds = new Set();
  const walk = (n) => {
    if (!n) return;
    if (n.op === 'cond') {
      const kind = CONDITIONS[n.id]?.event;
      if (kind) kinds.add(kind);
    } else if (n.op === 'not') walk(n.arg);
    else (n.args || []).forEach(walk);
  };
  walk(spec?.entry);
  walk(spec?.exit?.rule);
  return [...kinds].sort();
}

/**
 * Builder conditions that cannot be backtested yet, with the reason. They need
 * point-in-time data (the date the information became PUBLIC, not the date of
 * the event) that is not loaded yet.
 */
export const UNSUPPORTED_CONDITIONS = {
  hedge_fund_new_position: 'Needs the filing date of each 13F; holdings are known weeks late.',
  fed_rate_change: 'Needs a point-in-time macro calendar.',
  cpi_surprise: 'Needs consensus history and release timestamps.',
  yield_curve_inversion: 'Needs a point-in-time rates series.',
};

/** Ids the older builder used, mapped to their engine condition. */
const LEGACY_IDS = { macd_crossover: 'macd_cross_up' };

export function cleanTicker(raw) {
  const t = String(raw || '')
    .trim()
    .toUpperCase();
  return TICKER_RE.test(t) ? t : null;
}

function cleanParams(def, raw, errors, where) {
  const out = {};
  for (const [name, rule] of Object.entries(def.params)) {
    const v = raw?.[name];
    if (rule.kind === 'enum') {
      const s = String(v ?? rule.def).toLowerCase();
      if (!rule.options.includes(s))
        errors.push(`${where}: ${name} must be one of ${rule.options.join(', ')}`);
      out[name] = rule.options.includes(s) ? s : rule.def;
      continue;
    }
    const n = v === undefined || v === null || v === '' ? rule.def : Number(v);
    if (!Number.isFinite(n) || n < rule.min || n > rule.max) {
      errors.push(`${where}: ${name} must be between ${rule.min} and ${rule.max}`);
      out[name] = rule.def;
    } else {
      out[name] = rule.kind === 'int' ? Math.round(n) : n;
    }
  }
  const problem = def.check?.(out);
  if (problem) errors.push(`${where}: ${problem}`);
  return out;
}

function cleanNode(raw, errors, state, depth, where) {
  if (!raw || typeof raw !== 'object') {
    errors.push(`${where}: missing rule`);
    return null;
  }
  if (depth > MAX_DEPTH) {
    errors.push(`${where}: rules are nested more than ${MAX_DEPTH} levels deep`);
    return null;
  }
  const op = String(raw.op || '').toLowerCase();
  if (op === 'and' || op === 'or') {
    const args = Array.isArray(raw.args) ? raw.args : [];
    if (!args.length) errors.push(`${where}: an ${op.toUpperCase()} group needs at least one rule`);
    const cleaned = args
      .map((a, i) =>
        cleanNode(a, errors, state, depth + 1, `${where} ${op.toUpperCase()}[${i + 1}]`),
      )
      .filter(Boolean);
    return cleaned.length === 1 ? cleaned[0] : { op, args: cleaned };
  }
  if (op === 'not') {
    const arg = cleanNode(raw.arg, errors, state, depth + 1, `${where} NOT`);
    return arg ? { op: 'not', arg } : null;
  }
  if (op === 'cond') {
    const id = LEGACY_IDS[raw.id] || String(raw.id || '');
    state.count += 1;
    if (state.count > MAX_CONDITIONS) {
      errors.push(`A strategy can hold at most ${MAX_CONDITIONS} conditions`);
      return null;
    }
    if (UNSUPPORTED_CONDITIONS[id]) {
      state.unsupported.push({ id, reason: UNSUPPORTED_CONDITIONS[id] });
      return { op: 'cond', id, params: {} };
    }
    const def = CONDITIONS[id];
    if (!def) {
      errors.push(`${where}: unknown condition "${id}"`);
      return null;
    }
    return {
      op: 'cond',
      id,
      params: cleanParams(def, raw.params, errors, `${where} ${def.label}`),
    };
  }
  errors.push(`${where}: unknown operator "${raw.op}"`);
  return null;
}

const pct = (v, min, max, name, errors) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) {
    errors.push(`${name} must be between ${min} and ${max}`);
    return undefined;
  }
  return n;
};

/**
 * Validate and normalise an untrusted spec.
 * @returns {{ ok: boolean, spec: object|null, errors: string[],
 *             unsupported: { id: string, reason: string }[] }}
 * `unsupported` lists conditions that can be saved but not backtested yet.
 */
export function validateSpec(raw) {
  const errors = [];
  const state = { count: 0, unsupported: [] };
  if (!raw || typeof raw !== 'object') {
    return { ok: false, spec: null, errors: ['Strategy definition is missing'], unsupported: [] };
  }

  const universe = [];
  for (const item of Array.isArray(raw.universe) ? raw.universe : []) {
    const t = cleanTicker(item);
    if (!t) errors.push(`"${String(item).slice(0, 12)}" is not a valid ticker`);
    else if (!universe.includes(t)) universe.push(t);
  }
  if (!universe.length) errors.push('Add at least one ticker to the universe');
  if (universe.length > MAX_UNIVERSE)
    errors.push(`The universe is limited to ${MAX_UNIVERSE} tickers`);

  const benchmark = cleanTicker(raw.benchmark || 'SPY');
  if (!benchmark) errors.push('Benchmark is not a valid ticker');

  const side = raw.side === 'short' ? 'short' : 'long';
  const entry = cleanNode(raw.entry, errors, state, 1, 'Entry');

  const rawExit = raw.exit && typeof raw.exit === 'object' ? raw.exit : {};
  const exit = {};
  if (rawExit.rule) {
    const rule = cleanNode(rawExit.rule, errors, state, 1, 'Exit');
    if (rule) exit.rule = rule;
  }
  const stopLossPct = pct(rawExit.stopLossPct, 0.1, 90, 'Stop loss', errors);
  const trailingStopPct = pct(rawExit.trailingStopPct, 0.1, 90, 'Trailing stop', errors);
  const takeProfitPct = pct(rawExit.takeProfitPct, 0.1, 1000, 'Take profit', errors);
  const maxHoldDays = pct(rawExit.maxHoldDays, 1, 3650, 'Maximum holding period', errors);
  if (stopLossPct !== undefined) exit.stopLossPct = stopLossPct;
  if (trailingStopPct !== undefined) exit.trailingStopPct = trailingStopPct;
  if (takeProfitPct !== undefined) exit.takeProfitPct = takeProfitPct;
  if (maxHoldDays !== undefined) exit.maxHoldDays = Math.round(maxHoldDays);

  const rawSizing = raw.sizing && typeof raw.sizing === 'object' ? raw.sizing : {};
  const sizingType = rawSizing.type === 'pct_equity' ? 'pct_equity' : 'equal_weight';
  const maxPositions = Math.round(
    pct(rawSizing.maxPositions, 1, MAX_UNIVERSE, 'Maximum positions', errors) ??
      Math.min(Math.max(universe.length, 1), 10),
  );
  const sizing = { type: sizingType, maxPositions };
  if (sizingType === 'pct_equity') {
    sizing.pct = pct(rawSizing.pct ?? 5, 0.1, 100, 'Position size', errors) ?? 5;
  }

  const spec = entry
    ? { specVersion: SPEC_VERSION, universe, benchmark, side, entry, exit, sizing }
    : null;
  return { ok: errors.length === 0 && Boolean(spec), spec, errors, unsupported: state.unsupported };
}

/** Longest indicator lookback in a spec, in trading days (for the warm-up window). */
export function specLookback(spec) {
  let max = 0;
  const walk = (n) => {
    if (!n) return;
    if (n.op === 'cond') max = Math.max(max, CONDITIONS[n.id]?.lookback(n.params) ?? 0);
    else if (n.op === 'not') walk(n.arg);
    else (n.args || []).forEach(walk);
  };
  walk(spec.entry);
  walk(spec.exit?.rule);
  return max;
}

function describeNode(n) {
  if (!n) return '';
  if (n.op === 'cond') {
    const def = CONDITIONS[n.id];
    return def ? def.describe(n.params) : `"${n.id}" (not backtestable yet)`;
  }
  if (n.op === 'not') return `it is NOT the case that ${describeNode(n.arg)}`;
  const joiner = n.op === 'and' ? ' AND ' : ' OR ';
  return n.args
    .map((a) => (a.op === 'cond' ? describeNode(a) : `(${describeNode(a)})`))
    .join(joiner);
}

/** The strategy in plain sentences, for the builder summary and the run report. */
export function explainSpec(spec) {
  const out = [];
  const verb = spec.side === 'short' ? 'opens a short position' : 'buys';
  out.push(
    `Universe: ${spec.universe.join(', ')}. Each trading day, after the close, every ticker is checked on its own.`,
  );
  out.push(`It ${verb} when ${describeNode(spec.entry)}.`);
  out.push(
    spec.sizing.type === 'pct_equity'
      ? `Each position is sized at ${spec.sizing.pct}% of account equity, with at most ${spec.sizing.maxPositions} positions open.`
      : `Equity is split equally across up to ${spec.sizing.maxPositions} positions.`,
  );
  const exits = [];
  const e = spec.exit || {};
  if (e.rule) exits.push(describeNode(e.rule));
  if (e.stopLossPct)
    exits.push(`the close is ${e.stopLossPct}% against the entry price (stop loss)`);
  if (e.trailingStopPct) {
    exits.push(`the close is ${e.trailingStopPct}% off its best close since entry (trailing stop)`);
  }
  if (e.takeProfitPct) exits.push(`the close is ${e.takeProfitPct}% in profit (take profit)`);
  if (e.maxHoldDays) exits.push(`${e.maxHoldDays} calendar days have passed`);
  out.push(
    exits.length
      ? `It closes a position when ${exits.join(', or when ')}.`
      : 'It has no exit rule: positions are held to the end of the test.',
  );
  out.push(
    "Signals are read from closing prices and orders fill at the next session's open, so no trade uses information from its own bar.",
  );
  return out;
}

/** Stable JSON (sorted keys) so equal specs always hash the same. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const bounded = (v, def, min, max) => {
  const n = v === undefined || v === null || v === '' ? def : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

/** Longest backtest window, in years. */
export const MAX_YEARS = 10;

/**
 * Validate and normalise untrusted run settings. Defaults are deliberately
 * conservative and every one is shown to the user with the results.
 */
export function normalizeConfig(raw = {}, today = new Date().toISOString().slice(0, 10)) {
  const errors = [];
  const endDate = DATE_RE.test(raw.endDate || '') && raw.endDate <= today ? raw.endDate : today;
  const defStart = `${Number(endDate.slice(0, 4)) - 3}${endDate.slice(4)}`;
  const startDate = DATE_RE.test(raw.startDate || '') ? raw.startDate : defStart;
  if (startDate >= endDate) errors.push('Start date must be before end date');
  const spanDays = (Date.parse(endDate) - Date.parse(startDate)) / 86400000;
  if (spanDays > MAX_YEARS * 366) errors.push(`A backtest can span at most ${MAX_YEARS} years`);
  if (spanDays < 60 && spanDays > 0) errors.push('A backtest needs at least 60 days');
  return {
    errors,
    config: {
      startDate,
      endDate,
      initialCapital: bounded(raw.initialCapital, 100000, 1000, 1e9),
      commissionPerShare: bounded(raw.commissionPerShare, 0.005, 0, 1),
      commissionBps: bounded(raw.commissionBps, 0, 0, 100),
      slippageBps: bounded(raw.slippageBps, 5, 0, 200),
      borrowRate: bounded(raw.borrowRate, 0.01, 0, 1),
      riskFreeRate: bounded(raw.riskFreeRate, 0, 0, 0.2),
      maxGrossLeverage: bounded(raw.maxGrossLeverage, 1, 0.1, 2),
      fill: 'next_open',
    },
  };
}
