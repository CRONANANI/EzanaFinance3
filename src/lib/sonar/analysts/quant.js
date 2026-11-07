/**
 * Sonar quantitative engine (Phase 1.2). Pure, deterministic, unit-tested in
 * scripts/check-sonar-quant.mjs.
 *
 * Code computes every number an analyst states; models restate the result by its metric id.
 * Every function returns one metric:
 *
 *   { id, name, value, unit, method, inputs, periods, warnings, ...extra }
 *
 *   id        opts.id or the function name; cited as M:<id>
 *   value     a number, or an object for multi-part results (DCF grid, OLS table)
 *   inputs    evidence ids (S-ids) passed in opts.inputs
 *   periods   the observation periods the value rests on (never merged silently)
 *   warnings  data limits the analyst must carry into the answer
 *
 * Series are [{ period, value }] (oldest first; sorted here) or plain number arrays. Periods
 * use the catalogue formats: 'YYYY', 'YYYY-Qn', 'YYYY-MM', 'YYYY-MM-DD'. An observation may
 * carry `released` (its publication date) for look-ahead checks.
 *
 * Reuse: currency conventions, y/y from a monthly index and own-history percentiles come from
 * macro/currency.js; the currency pressure classification from macro/playbook.js; FEWS NET
 * aggregation and period arithmetic from macro/catalog.js. They are wrapped, not re-implemented.
 *
 * Backtests and event studies take opts.asOf and refuse any observation released (or, without
 * a release date, ending) after it. alignPeriods never forward-fills.
 */
import {
  dollarDearerPct,
  valueLostPct,
  yoyFromIndexHistory,
  percentileOf,
} from '../macro/currency.js';
import { assessCurrencyPressure as playbookAssessCurrencyPressure } from '../macro/playbook.js';
import { weoStatus as weoStatusOf, weoLatestActual, WEO_VINTAGE } from './weo-status.js';
import {
  aggregateFews as catalogAggregateFews,
  yoyFromIndex as catalogYoyFromIndex,
  periodEnd,
  monthsBetween,
} from '../macro/catalog.js';

/* ================================================================== helpers */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

/** A number from a number, a numeric string, or { value }. */
function toNum(v) {
  if (v == null || v === '') return null;
  const raw = isObj(v) ? v.value : v;
  if (raw == null || raw === '') return null;
  const x = Number(raw);
  return Number.isFinite(x) ? x : null;
}
const periodOf = (v) =>
  isObj(v) ? ((v.period ?? v.date ?? v.year ?? null)?.toString?.() ?? null) : null;

const pick = (o, ...keys) => {
  if (!o) return undefined;
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

const cmpPeriod = (a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0);

/** Normalise a series; non-numeric observations are dropped and counted in `warnings`. */
function toSeries(x, warnings = null, label = 'series') {
  if (!Array.isArray(x)) return [];
  const out = [];
  let dropped = 0;
  for (const p of x) {
    const v = toNum(p);
    if (v == null) {
      dropped += 1;
      continue;
    }
    if (isObj(p)) {
      const per = p.period ?? p.date ?? null;
      out.push({
        period: per == null ? null : String(per),
        value: v,
        released: p.released ?? p.releasedAt ?? p.release_date ?? null,
      });
    } else out.push({ period: null, value: v, released: null });
  }
  if (dropped && warnings) warnings.push(`${label}: ${dropped} non-numeric observation(s) dropped`);
  if (out.length && out.every((p) => p.period)) out.sort(cmpPeriod);
  return out;
}
const hasPeriods = (s) => s.length > 0 && s.every((p) => p.period);
const firstLast = (s) => (s.length ? [s[0].period, s[s.length - 1].period] : []);

/** The latest observation of a number, { value, period } or a series. */
function latestOf(x) {
  if (Array.isArray(x)) {
    const s = toSeries(x);
    return s.length ? s[s.length - 1] : null;
  }
  const v = toNum(x);
  return v == null ? null : { value: v, period: periodOf(x) };
}

function metric(name, body, opts = {}) {
  const { value, unit = null, method = '', periods = [], warnings = [], ...extra } = body;
  const v = typeof value === 'number' && !Number.isFinite(value) ? null : value;
  return {
    id: opts.id || name,
    name,
    value: v === undefined ? null : v,
    unit,
    method,
    inputs: Array.isArray(opts.inputs) ? [...opts.inputs] : [],
    periods: [...new Set((periods || []).filter((p) => p != null).map(String))],
    warnings: [...new Set(warnings)],
    ...extra,
  };
}

/* ---------------------------------------------------------------- statistics */

const sum = (xs) => xs.reduce((s, x) => s + x, 0);
const mean = (xs) => (xs.length ? sum(xs) / xs.length : null);
function stdev(xs) {
  if (xs.length < 2) return null;
  const m = mean(xs);
  return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1));
}
/** Quantile with linear interpolation between order statistics (type 7). */
function quantile(xs, q) {
  if (!xs.length) return null;
  const a = [...xs].sort((p, r) => p - r);
  const h = (a.length - 1) * q;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return a[lo] + (h - lo) * (a[hi] - a[lo]);
}
const median = (xs) => quantile(xs, 0.5);

/** Minimum sample sizes below which a statistic is flagged. */
export const MIN_SAMPLE = {
  correlation: 12,
  regression: 20,
  beta: 20,
  zScore: 12,
  percentile: 12,
  trackingError: 12,
  brier: 20,
  events: 10,
  peers: 5,
  seasonalCycles: 3,
};
const smallSample = (what, n, min) =>
  `${what} rests on ${n} observation(s), below the minimum of ${min}: treat as descriptive and fragile`;

/* ---------------------------------------------------------------- periods and dates */

const FREQ_RANK = { daily: 0, monthly: 1, quarterly: 2, annual: 3 };
function freqOf(period) {
  const s = String(period || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return 'daily';
  if (/^\d{4}-\d{2}$/.test(s)) return 'monthly';
  if (/^\d{4}-Q[1-4]$/.test(s)) return 'quarterly';
  if (/^(FY)?\d{4}$/.test(s)) return 'annual';
  return null;
}
const PERIODS_PER_YEAR = { daily: 252, weekly: 52, monthly: 12, quarterly: 4, annual: 1 };
function seriesFreq(s) {
  const f = new Set(s.map((p) => freqOf(p.period)).filter(Boolean));
  return f.size === 1 ? [...f][0] : f.size ? 'mixed' : null;
}
/** A period re-keyed to a coarser frequency ('2026-09-14' -> '2026-09' -> '2026-Q3' -> '2026'). */
function toFreqKey(period, freq) {
  const s = String(period);
  const f = freqOf(s);
  if (!f) return null;
  if (FREQ_RANK[freq] < FREQ_RANK[f]) return null;
  const y = s.replace(/^FY/, '').slice(0, 4);
  if (freq === 'annual') return y;
  if (freq === 'quarterly') {
    if (f === 'quarterly') return s;
    return `${y}-Q${Math.floor((Number(s.slice(5, 7)) - 1) / 3) + 1}`;
  }
  if (freq === 'monthly') return s.slice(0, 7);
  return s.slice(0, 10);
}
/** A date from a Date, a timestamp, a catalogue period (its end) or an ISO string. */
function toDate(x) {
  if (x == null || x === '') return null;
  if (x instanceof Date) return Number.isNaN(x.getTime()) ? null : x;
  if (typeof x === 'number') return new Date(x);
  const s = String(x);
  const pe = periodEnd(s.replace(/^FY/, ''));
  if (pe) return pe;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}
const dayMs = 864e5;
const utcDay = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/**
 * Look-ahead guard: observations released (or ending) after asOf. Returns the offending
 * periods; an empty list means the data is admissible.
 */
function lookAheadViolations(series, asOf) {
  const cut = toDate(asOf);
  if (!cut) return [];
  const bad = [];
  for (const p of series) {
    const d = toDate(p.released) || toDate(p.period);
    if (d && d > cut) bad.push(p.period ?? String(p.released));
  }
  return bad;
}
function refuseLookAhead(name, seriesByLabel, asOf, opts, base = {}) {
  const offenders = [];
  for (const [label, s] of Object.entries(seriesByLabel)) {
    const bad = lookAheadViolations(s, asOf);
    if (bad.length)
      offenders.push(
        `${label}: ${bad.slice(0, 3).join(', ')}${bad.length > 3 ? ` and ${bad.length - 3} more` : ''}`,
      );
  }
  if (!offenders.length) return null;
  return metric(
    name,
    {
      value: null,
      method: base.method || name,
      unit: base.unit || null,
      warnings: [
        `look-ahead refused: data released after asOf ${String(asOf)} (${offenders.join('; ')})`,
      ],
      refused: true,
    },
    opts,
  );
}

/** Two series paired by period (exact match) or by position for plain arrays. */
function pairUp(a, b, warnings, labels = ['a', 'b']) {
  const sa = toSeries(a, warnings, labels[0]);
  const sb = toSeries(b, warnings, labels[1]);
  if (hasPeriods(sa) && hasPeriods(sb)) {
    const al = alignPeriods(
      [
        { name: labels[0], series: sa },
        { name: labels[1], series: sb },
      ],
      {},
    );
    warnings.push(...al.notes);
    return {
      x: al.value.rows.map((r) => r.values[0]),
      y: al.value.rows.map((r) => r.values[1]),
      periods: al.value.rows.map((r) => r.period),
      frequency: al.value.frequency,
      raw: [sa, sb],
    };
  }
  if (sa.length !== sb.length) {
    warnings.push(
      `${labels[0]} and ${labels[1]} have different lengths (${sa.length} and ${sb.length}) and no periods; trimmed to the most recent ${Math.min(sa.length, sb.length)} paired observations`,
    );
  } else if (sa.length) {
    warnings.push('no periods supplied; inputs treated as already aligned by position');
  }
  const k = Math.min(sa.length, sb.length);
  return {
    x: sa.slice(sa.length - k).map((p) => p.value),
    y: sb.slice(sb.length - k).map((p) => p.value),
    periods: [],
    frequency: null,
    raw: [sa, sb],
  };
}

/* ---------------------------------------------------------------- linear algebra */

const transpose = (m) => m[0].map((_, j) => m.map((r) => r[j]));
const matMul = (a, b) => a.map((r) => b[0].map((_, j) => sum(r.map((v, k) => v * b[k][j]))));
/** Gauss-Jordan inverse with partial pivoting; null when singular. */
function invert(m) {
  const n = m.length;
  const a = m.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-12) return null;
    [a[c], a[p]] = [a[p], a[c]];
    const d = a[c][c];
    for (let j = 0; j < 2 * n; j += 1) a[c][j] /= d;
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = a[r][c];
      if (f) for (let j = 0; j < 2 * n; j += 1) a[r][j] -= f * a[c][j];
    }
  }
  return a.map((r) => r.slice(n));
}

/* ================================================================== changes and currency */

const PERCENT_UNIT =
  /^(%|percent|pct|percentage|pp|percentage points|% per year|% a year|% y\/y)$/i;
const isPercentUnit = (u) => PERCENT_UNIT.test(String(u || '').trim());

/**
 * Period change new / old - 1, in %. For a series already in percent (opts.unit '%',
 * 'percent'; rates, inflation, prediction prices given in %) it also returns the absolute
 * change in percentage points (`changePp`), which is what is quoted for rates.
 */
export function pctChange(a, b, opts = {}) {
  const old = latestOf(a);
  const now = latestOf(b);
  const warnings = [];
  const percentSeries = isPercentUnit(opts.unit);
  const extra = {};
  if (!old || !now)
    return metric(
      'pctChange',
      { value: null, unit: '%', method: 'new / old - 1', warnings: ['both values are required'] },
      opts,
    );
  if (percentSeries) {
    extra.changePp = now.value - old.value;
    extra.changePpUnit = 'percentage points';
    warnings.push(
      'series is already in percent: quote the change in percentage points (changePp), not the relative change',
    );
  }
  let value = null;
  if (old.value === 0) warnings.push('old value is zero: relative change undefined');
  else {
    value = (now.value / old.value - 1) * 100;
    if (old.value < 0)
      warnings.push('old value is negative: relative change is not meaningful in sign');
  }
  return metric(
    'pctChange',
    {
      value,
      unit: '%',
      method: percentSeries
        ? 'relative change new / old - 1, plus the absolute difference new - old in percentage points'
        : 'new / old - 1',
      periods: [old.period, now.period],
      warnings,
      from: old.value,
      to: now.value,
      ...extra,
    },
    opts,
  );
}

/**
 * Both currency conventions from rates quoted in local currency per US dollar:
 * dollarDearerPct = new / old - 1; valueLostPct = 1 - old / new. opts.quote 'usd_per_local'
 * (ECB and BoE crosses) inverts first.
 */
export function bothConventionsFx(oldRate, newRate, opts = {}) {
  const o = latestOf(oldRate);
  const n = latestOf(newRate);
  const warnings = [];
  if (!o || !n || o.value <= 0 || n.value <= 0)
    return metric(
      'bothConventionsFx',
      {
        value: null,
        unit: '%',
        method: 'both conventions',
        warnings: ['two positive exchange rates are required'],
      },
      opts,
    );
  const invert = /usd.?per.?local|inverse|inverted/i.test(String(opts.quote || ''));
  const ov = invert ? 1 / o.value : o.value;
  const nv = invert ? 1 / n.value : n.value;
  if (invert)
    warnings.push(
      'rates were quoted in US dollars per local unit and were inverted before computing',
    );
  return metric(
    'bothConventionsFx',
    {
      value: { dollarDearerPct: dollarDearerPct(ov, nv), valueLostPct: valueLostPct(ov, nv) },
      unit: '%',
      method:
        'local currency per USD; dollar dearer = new / old - 1; value lost by the currency = 1 - old / new (macro/currency.js)',
      periods: [o.period, n.period],
      warnings,
      from: ov,
      to: nv,
    },
    opts,
  );
}

/**
 * Annualise a short-period change given in %. `periods` = periods per year (12 monthly, 4 for
 * a quarter or three months). Compound basis (1 + r)^p - 1; opts.basis 'valueLost' uses the
 * playbook's depreciation basis 1 - (1 - lost)^p.
 */
export function annualise(rate, periods, opts = {}) {
  const r = toNum(rate);
  const p = toNum(periods);
  const warnings = [
    'annualised short-period change is volatile; never present it as the annual rate',
  ];
  if (r == null || p == null || p <= 0)
    return metric(
      'annualise',
      {
        value: null,
        unit: '% annualised',
        method: 'annualise',
        warnings: ['rate and periods per year are required'],
      },
      opts,
    );
  const valueLost = /value.?lost|depreciation/i.test(String(opts.basis || ''));
  const value = valueLost
    ? (1 - Math.pow(1 - r / 100, p)) * 100
    : (Math.pow(1 + r / 100, p) - 1) * 100;
  return metric(
    'annualise',
    {
      value,
      unit: '% annualised',
      method: valueLost ? `value-lost basis: 1 - (1 - lost)^${p}` : `compound: (1 + r)^${p} - 1`,
      periods: [periodOf(rate)],
      warnings,
    },
    opts,
  );
}

function yearBeforeKey(period) {
  const s = String(period);
  const f = freqOf(s);
  const y = Number(s.replace(/^FY/, '').slice(0, 4));
  if (f === 'monthly' || f === 'quarterly') return `${y - 1}${s.slice(4)}`;
  if (f === 'annual') return s.startsWith('FY') ? `FY${y - 1}` : String(y - 1);
  return null;
}

/**
 * Year-on-year change from an index, in %. Series: monthly via macro/currency.js
 * yoyFromIndexHistory (same month a year earlier); quarterly and annual by the same rule.
 * Two numbers (value, yearAgo) use macro/catalog.js yoyFromIndex.
 */
export function yoyFromIndex(series, yearAgoOrOpts, maybeOpts) {
  if (!Array.isArray(series)) {
    const opts = maybeOpts || {};
    const v = catalogYoyFromIndex(toNum(series), toNum(yearAgoOrOpts));
    return metric(
      'yoyFromIndex',
      {
        value: v,
        unit: '%',
        method: 'index / index a year earlier - 1',
        periods: [periodOf(yearAgoOrOpts), periodOf(series)],
        warnings: v == null ? ['index and its year-ago value are required'] : [],
      },
      opts,
    );
  }
  const opts = yearAgoOrOpts || {};
  const warnings = [];
  const s = toSeries(series, warnings, 'index');
  const f = seriesFreq(s);
  let yoy = [];
  if (f === 'monthly') yoy = yoyFromIndexHistory(s);
  else if (f === 'quarterly' || f === 'annual') {
    const byP = new Map(s.map((p) => [p.period, p.value]));
    for (const p of s) {
      const prev = byP.get(yearBeforeKey(p.period));
      if (prev) yoy.push({ period: p.period, value: (p.value / prev - 1) * 100 });
    }
  } else warnings.push('needs a monthly, quarterly or annual index with periods');
  const last = yoy[yoy.length - 1];
  if (s.length && last && last.period !== s[s.length - 1].period)
    warnings.push(
      `latest index period ${s[s.length - 1].period} has no value a year earlier; latest y/y is ${last.period}`,
    );
  if (!last && s.length) warnings.push('no observation has a value exactly a year earlier');
  return metric(
    'yoyFromIndex',
    {
      value: last ? last.value : null,
      unit: '%',
      method: 'index_t / index_(t - 1 year) - 1, same period a year earlier (macro/currency.js)',
      periods: last ? [yearBeforeKey(last.period), last.period] : [],
      warnings,
      series: yoy,
    },
    opts,
  );
}

/** Month-on-month change of the latest month, in %. Not seasonally adjusted. */
export function momChange(series, opts = {}) {
  const warnings = [
    'not seasonally adjusted unless the source says so; month-on-month moves are mostly seasonal',
  ];
  const s = toSeries(series, warnings, 'series');
  const out = [];
  for (let i = 1; i < s.length; i += 1) {
    const gap = s[i].period && s[i - 1].period ? monthsBetween(s[i - 1].period, s[i].period) : 1;
    if (gap !== 1 || s[i - 1].value === 0) continue;
    out.push({ period: s[i].period, value: (s[i].value / s[i - 1].value - 1) * 100 });
  }
  const last = out[out.length - 1];
  if (s.length >= 2 && (!last || last.period !== s[s.length - 1].period))
    warnings.push(
      'the latest two observations are not consecutive months; no month-on-month change for the latest month',
    );
  return metric(
    'momChange',
    {
      value: last && last.period === s[s.length - 1].period ? last.value : null,
      unit: '%',
      method: 'index_t / index_(t-1) - 1 on consecutive months',
      periods: s.length >= 2 ? [s[s.length - 2].period, s[s.length - 1].period] : [],
      warnings,
      series: out,
    },
    opts,
  );
}

function yearsBetween(a, b) {
  const fa = freqOf(a);
  const fb = freqOf(b);
  if (fa === 'annual' && fb === 'annual')
    return Number(String(b).replace(/^FY/, '')) - Number(String(a).replace(/^FY/, ''));
  const m = monthsBetween(String(a).replace(/^FY/, ''), String(b).replace(/^FY/, ''));
  if (m != null && fa !== 'daily') return m / 12;
  const da = toDate(a);
  const db = toDate(b);
  return da && db ? (db - da) / (365.25 * dayMs) : null;
}

/** Compound annual growth rate between the first and last observation, in %. */
export function cagr(series, opts = {}) {
  const warnings = [];
  const s = toSeries(series, warnings, 'series');
  if (s.length < 2)
    return metric(
      'cagr',
      {
        value: null,
        unit: '% a year',
        method: '(last / first)^(1 / years) - 1',
        warnings: ['needs at least two observations'],
      },
      opts,
    );
  if (s.length < 3)
    warnings.push('fewer than three annual observations: endpoints only, growth is fragile');
  const first = s[0];
  const last = s[s.length - 1];
  let years = toNum(opts.years);
  if (years == null && first.period && last.period) years = yearsBetween(first.period, last.period);
  if (years == null) {
    years = s.length - 1;
    warnings.push('no periods supplied; observations assumed to be one year apart');
  }
  let value = null;
  if (first.value <= 0 || last.value <= 0)
    warnings.push('compound growth needs positive endpoint values');
  else if (years <= 0) warnings.push('endpoints are not separated in time');
  else value = (Math.pow(last.value / first.value, 1 / years) - 1) * 100;
  return metric(
    'cagr',
    {
      value,
      unit: '% a year',
      method: `(last / first)^(1 / years) - 1 over ${years == null ? '?' : +years.toFixed(4)} years`,
      periods: [first.period, last.period],
      warnings,
      years,
      from: first.value,
      to: last.value,
    },
    opts,
  );
}

/* ================================================================== history and risk */

function changesOf(s, mode, warnings) {
  if (mode === 'none') return s.map((p) => ({ period: p.period, c: p.value }));
  const out = [];
  let bad = 0;
  for (let i = 1; i < s.length; i += 1) {
    if (mode === 'diff') out.push({ period: s[i].period, c: s[i].value - s[i - 1].value });
    else if (s[i - 1].value > 0)
      out.push({ period: s[i].period, c: (s[i].value / s[i - 1].value - 1) * 100 });
    else bad += 1;
  }
  if (bad) warnings.push(`${bad} change(s) skipped where the prior value was not positive`);
  return out;
}

/**
 * Rolling volatility: sample standard deviation of period changes over the last `window`
 * changes. opts.changes 'pct' (default), 'diff' (point changes, e.g. prediction prices) or
 * 'none' (the series is already returns; opts.returns true is the same). opts.annualise true
 * or opts.periodsPerYear scales by the square root of periods per year.
 */
export function rollingVolatility(series, window = 12, opts = {}) {
  const warnings = [];
  const s = toSeries(series, warnings, 'series');
  const mode = opts.returns ? 'none' : opts.changes || 'pct';
  const ch = changesOf(s, mode, warnings);
  const w = Math.max(2, Math.round(toNum(window) || 12));
  if (w < 6) warnings.push(`window of ${w} changes is short; volatility estimate is noisy`);
  const freq = seriesFreq(s);
  let ppy = toNum(opts.periodsPerYear);
  if (ppy == null && opts.annualise) ppy = PERIODS_PER_YEAR[freq] ?? null;
  if (opts.annualise && ppy == null) warnings.push('frequency unknown: volatility left per period');
  const scale = ppy ? Math.sqrt(ppy) : 1;
  const rolling = [];
  for (let i = w; i <= ch.length; i += 1) {
    const sd = stdev(ch.slice(i - w, i).map((x) => x.c));
    rolling.push({ period: ch[i - 1].period, value: sd * scale });
  }
  if (!rolling.length) warnings.push(`needs at least ${w} changes; ${ch.length} available`);
  const last = rolling[rolling.length - 1];
  const base = mode === 'diff' ? 'points' : '%';
  const per =
    { daily: 'day', monthly: 'month', quarterly: 'quarter', annual: 'year' }[freq] || 'period';
  return metric(
    'rollingVolatility',
    {
      value: last ? last.value : null,
      unit: ppy ? `${base} annualised` : `${base} per ${per}`,
      method:
        `sample standard deviation of ${mode === 'diff' ? 'point' : mode === 'none' ? 'supplied' : 'percentage'} changes over ${w} ${freq || ''} periods${ppy ? `, times sqrt(${ppy})` : ''}`.replace(
          /\s+/g,
          ' ',
        ),
      periods: last ? [ch[ch.length - w]?.period, last.period] : [],
      warnings,
      n: last ? w : ch.length,
      frequency: freq,
      series: rolling,
    },
    opts,
  );
}

/** The observations in the trailing `years` window ending at the latest observation. */
function historyWindow(s, years, warnings, sameMonth = false) {
  if (!s.length) return [];
  const last = s[s.length - 1];
  let w = s;
  if (hasPeriods(s) && years) {
    const end = toDate(last.period);
    const start = new Date(
      Date.UTC(end.getUTCFullYear() - years, end.getUTCMonth(), end.getUTCDate()),
    );
    w = s.filter((p) => toDate(p.period) > start);
    const firstEnd = toDate(s[0].period);
    if (firstEnd > start)
      warnings.push(
        `history starts ${s[0].period}, shorter than the ${years}-year window requested`,
      );
  } else if (years && !hasPeriods(s))
    warnings.push('no periods supplied; the whole series is used as history');
  if (sameMonth && hasPeriods(w)) {
    const mm = last.period.slice(5, 7);
    w = w.filter((p) => p.period.slice(5, 7) === mm);
  }
  return w;
}

/**
 * Where the latest value sits in its own trailing history: share of observations at or below
 * it (0 to 100), via macro/currency.js percentileOf (needs 12 observations). opts.sameMonth
 * compares only the same calendar month (seasonal series).
 */
export function percentileVsHistory(series, years = 10, opts = {}) {
  const warnings = [];
  const s = toSeries(series, warnings, 'series');
  const w = historyWindow(s, toNum(years), warnings, !!opts.sameMonth);
  const vals = w.map((p) => p.value);
  const latest = s[s.length - 1];
  const value = latest ? percentileOf(vals, latest.value) : null;
  if (vals.length < MIN_SAMPLE.percentile)
    warnings.push(smallSample('percentile', vals.length, MIN_SAMPLE.percentile));
  return metric(
    'percentileVsHistory',
    {
      value,
      unit: 'percentile (0 to 100)',
      method: `share of ${opts.sameMonth ? 'same-month ' : ''}observations in the trailing ${years}-year window at or below the latest value (macro/currency.js percentileOf)`,
      periods: firstLast(w),
      warnings,
      n: vals.length,
      latest: latest ? latest.value : null,
      median: median(vals),
      min: vals.length ? Math.min(...vals) : null,
      max: vals.length ? Math.max(...vals) : null,
    },
    opts,
  );
}

/** Z-score of the latest value against the trailing window's mean and sample deviation. */
export function zScore(series, years = 10, opts = {}) {
  const warnings = [];
  const s = toSeries(series, warnings, 'series');
  const w = historyWindow(s, toNum(years), warnings, !!opts.sameMonth);
  const vals = w.map((p) => p.value);
  const latest = s[s.length - 1];
  const m = mean(vals);
  const sd = stdev(vals);
  if (vals.length < MIN_SAMPLE.zScore)
    warnings.push(smallSample('z-score', vals.length, MIN_SAMPLE.zScore));
  let value = null;
  if (latest && sd) value = (latest.value - m) / sd;
  else if (sd === 0) warnings.push('history has no variation; z-score undefined');
  return metric(
    'zScore',
    {
      value,
      unit: 'standard deviations',
      method: `(latest - mean) / sample standard deviation over the trailing ${years}-year window`,
      periods: firstLast(w),
      warnings,
      n: vals.length,
      mean: m,
      stdev: sd,
    },
    opts,
  );
}

/**
 * Drawdown path and maximum drawdown with peak, trough and recovery periods. Levels by
 * default; opts.returns true builds an index from returns in % first.
 */
export function drawdown(series, opts = {}) {
  const warnings = [];
  let s = toSeries(series, warnings, 'series');
  if (opts.returns) {
    let lvl = 100;
    s = s.map((p) => {
      lvl *= 1 + p.value / 100;
      return { ...p, value: lvl };
    });
  }
  if (!s.length || s.some((p) => p.value <= 0))
    return metric(
      'drawdown',
      {
        value: null,
        unit: '%',
        method: 'value / running peak - 1',
        warnings: [...warnings, 'needs positive levels'],
      },
      opts,
    );
  let peak = s[0];
  let worst = { dd: 0, peak: s[0], trough: s[0] };
  const path = s.map((p) => {
    if (p.value > peak.value) peak = p;
    const dd = (p.value / peak.value - 1) * 100;
    if (dd < worst.dd) worst = { dd, peak, trough: p };
    return { period: p.period, value: dd };
  });
  let recovery = null;
  if (worst.dd < 0) {
    const ti = s.indexOf(worst.trough);
    const r = s.slice(ti + 1).find((p) => p.value >= worst.peak.value);
    recovery = r ? r.period : null;
  }
  return metric(
    'drawdown',
    {
      value: worst.dd,
      unit: '%',
      method: 'value / running peak - 1; maximum drawdown is the lowest point of that path',
      periods: firstLast(s),
      warnings,
      peakPeriod: worst.peak.period,
      troughPeriod: worst.trough.period,
      recoveryPeriod: recovery,
      recovered: worst.dd === 0 ? null : recovery != null,
      current: path[path.length - 1].value,
      path,
    },
    opts,
  );
}

/* ================================================================== statistics */

/**
 * Pearson correlation on aligned observations. Series with periods are aligned by exact
 * period (alignPeriods); plain arrays are paired by position. Third argument: true (already
 * aligned) or an opts object. Reports n and warns below 12.
 */
export function correlation(a, b, alignedOrOpts = {}) {
  const opts = isObj(alignedOrOpts) ? alignedOrOpts : {};
  const warnings = ['correlation is descriptive co-movement, not causation'];
  const { x, y, periods } = pairUp(a, b, warnings, [
    opts.labels?.[0] || 'a',
    opts.labels?.[1] || 'b',
  ]);
  const n = x.length;
  if (n < MIN_SAMPLE.correlation)
    warnings.push(smallSample('correlation', n, MIN_SAMPLE.correlation));
  let r = null;
  if (n >= 3) {
    const mx = mean(x);
    const my = mean(y);
    const sxy = sum(x.map((v, i) => (v - mx) * (y[i] - my)));
    const sxx = sum(x.map((v) => (v - mx) ** 2));
    const syy = sum(y.map((v) => (v - my) ** 2));
    if (sxx && syy) r = sxy / Math.sqrt(sxx * syy);
    else warnings.push('one series has no variation; correlation undefined');
  } else warnings.push('fewer than three paired observations; no correlation computed');
  const tStat =
    r != null && Math.abs(r) < 1 && n > 2 ? (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r) : null;
  return metric(
    'correlation',
    {
      value: r,
      unit: 'correlation coefficient (-1 to 1)',
      method: 'Pearson correlation on period-aligned observations (no forward fill)',
      periods: periods.length ? [periods[0], periods[periods.length - 1]] : [],
      warnings,
      n,
      tStat,
    },
    opts,
  );
}

/** Design matrix and response from y and X (see regressionOLS). */
function buildDesign(y, X, opts, warnings) {
  const names = [];
  let cols = [];
  let yv;
  let periods = [];
  const ySeries = toSeries(y, warnings, 'y');
  const seriesCols =
    Array.isArray(X) && X.length && Array.isArray(X[0]) && X[0].length && isObj(X[0][0]);
  if (seriesCols && hasPeriods(ySeries)) {
    const al = alignPeriods(
      [
        { name: 'y', series: ySeries },
        ...X.map((c, i) => ({ name: opts.names?.[i] || `x${i + 1}`, series: c })),
      ],
      {},
    );
    warnings.push(...al.notes);
    yv = al.value.rows.map((r) => r.values[0]);
    cols = X.map((_, i) => al.value.rows.map((r) => r.values[i + 1]));
    periods = al.value.rows.map((r) => r.period);
  } else {
    yv = ySeries.map((p) => p.value);
    if (Array.isArray(X) && X.length && !Array.isArray(X[0])) cols = [X.map(toNum)];
    else if (Array.isArray(X) && X.length === yv.length && Array.isArray(X[0]) && !isObj(X[0][0]))
      cols = transpose(X.map((r) => r.map(toNum)));
    else if (Array.isArray(X) && seriesCols) cols = X.map((c) => toSeries(c).map((p) => p.value));
    else if (Array.isArray(X) && X.every((c) => Array.isArray(c) && c.length === yv.length))
      cols = X.map((c) => c.map(toNum));
    else cols = [];
    if (hasPeriods(ySeries)) periods = ySeries.map((p) => p.period);
  }
  cols.forEach((_, i) => names.push(opts.names?.[i] || `x${i + 1}`));
  /* Drop rows with any missing value. */
  const keep = yv.map((v, i) => v != null && cols.every((c) => c[i] != null));
  const dropped = keep.filter((k) => !k).length;
  if (dropped) warnings.push(`${dropped} row(s) with a missing value dropped`);
  yv = yv.filter((_, i) => keep[i]);
  cols = cols.map((c) => c.filter((_, i) => keep[i]));
  periods = periods.filter((_, i) => keep[i]);
  return { y: yv, cols, names, periods };
}

/**
 * Ordinary least squares with an intercept (opts.intercept false to omit). y: numbers or a
 * series; X: one regressor as a number array, rows as an n x k array, or columns as an array
 * of series (aligned by period with y). Returns coefficients with standard errors and
 * t-statistics, R-squared, adjusted R-squared and n; warns below 20 observations.
 */
export function regressionOLS(y, X, opts = {}) {
  const warnings = ['association only; a regression coefficient is not a causal effect'];
  const d = buildDesign(y, X, opts, warnings);
  const n = d.y.length;
  const intercept = opts.intercept !== false;
  const names = [...(intercept ? ['intercept'] : []), ...d.names];
  const k = names.length;
  if (n < MIN_SAMPLE.regression) warnings.push(smallSample('regression', n, MIN_SAMPLE.regression));
  const empty = (msg) =>
    metric(
      'regressionOLS',
      {
        value: null,
        unit: 'coefficients',
        method: 'ordinary least squares',
        warnings: [...warnings, msg],
        n,
      },
      opts,
    );
  if (!d.cols.length || d.cols.some((c) => c.length !== n))
    return empty('regressors do not match the response');
  if (n <= k) return empty(`needs more observations (${n}) than coefficients (${k})`);
  const Xm = d.y.map((_, i) => [...(intercept ? [1] : []), ...d.cols.map((c) => c[i])]);
  const Xt = transpose(Xm);
  const inv = invert(matMul(Xt, Xm));
  if (!inv) return empty('regressors are collinear; the design matrix is singular');
  const beta = matMul(
    inv,
    matMul(
      Xt,
      d.y.map((v) => [v]),
    ),
  ).map((r) => r[0]);
  const fitted = Xm.map((r) => sum(r.map((v, j) => v * beta[j])));
  const resid = d.y.map((v, i) => v - fitted[i]);
  const ssr = sum(resid.map((e) => e * e));
  const my = mean(d.y);
  const sst = intercept ? sum(d.y.map((v) => (v - my) ** 2)) : sum(d.y.map((v) => v * v));
  const df = n - k;
  const sigma2 = ssr / df;
  const coefficients = names.map((name, j) => {
    const se = Math.sqrt(sigma2 * inv[j][j]);
    return { name, estimate: beta[j], se, tStat: se ? beta[j] / se : null };
  });
  const r2 = sst ? 1 - ssr / sst : null;
  const adj = r2 == null ? null : 1 - ((1 - r2) * (n - (intercept ? 1 : 0))) / df;
  return metric(
    'regressionOLS',
    {
      value: {
        coefficients,
        rSquared: r2,
        adjRSquared: adj,
        n,
        df,
        residualStdError: Math.sqrt(sigma2),
      },
      unit: 'coefficients',
      method: 'ordinary least squares, classical (homoskedastic) standard errors',
      periods: d.periods.length ? [d.periods[0], d.periods[d.periods.length - 1]] : [],
      warnings,
      n,
    },
    opts,
  );
}

/**
 * Event study: abnormal returns around event dates. returns: series of returns in % with
 * dates; events: dates or { date }; window: [pre, post] in observations (e.g. [-1, 1]) or
 * { pre, post }. Market-adjusted (return minus opts.benchmark) when a benchmark is given,
 * otherwise mean-adjusted over an estimation window (opts.estimationWindow, default 60
 * observations before the event window). opts.asOf is required: any return, benchmark
 * observation or event after it is refused (no look-ahead).
 */
export function eventStudy(returns, events, window = [-1, 1], opts = {}) {
  const warnings = [
    'association around dates only; small samples and overlapping events make results descriptive',
  ];
  const method =
    'abnormal return = return minus benchmark (or minus estimation-window mean); CAR summed over the window';
  if (!opts.asOf)
    return metric(
      'eventStudy',
      {
        value: null,
        unit: '%',
        method,
        warnings: [
          ...warnings,
          'asOf is required for an event study (no look-ahead check possible)',
        ],
        refused: true,
      },
      opts,
    );
  const r = toSeries(returns, warnings, 'returns');
  const bm = opts.benchmark ? toSeries(opts.benchmark, warnings, 'benchmark') : null;
  const ev = (events || [])
    .map((e) =>
      isObj(e)
        ? {
            date: String(e.date ?? e.period),
            label: e.label ?? e.id ?? null,
            released: e.released ?? null,
          }
        : { date: String(e), label: null },
    )
    .filter((e) => e.date && e.date !== 'undefined');
  const refused = refuseLookAhead(
    'eventStudy',
    {
      returns: r,
      ...(bm ? { benchmark: bm } : {}),
      events: ev.map((e) => ({ period: e.date, released: e.released })),
    },
    opts.asOf,
    opts,
    { method, unit: '%' },
  );
  if (refused) return refused;
  if (!hasPeriods(r))
    return metric(
      'eventStudy',
      { value: null, unit: '%', method, warnings: [...warnings, 'returns need dates'] },
      opts,
    );
  const pre = Array.isArray(window)
    ? Math.min(0, toNum(window[0]) ?? -1)
    : -Math.abs(toNum(window?.pre) ?? 1);
  const post = Array.isArray(window)
    ? Math.max(0, toNum(window[1]) ?? 1)
    : Math.abs(toNum(window?.post) ?? 1);
  const L = post - pre + 1;
  const estLen = Math.max(2, Math.round(toNum(opts.estimationWindow) ?? 60));
  const bmMap = bm ? new Map(bm.map((p) => [p.period, p.value])) : null;
  const series = bmMap ? r.filter((p) => bmMap.has(p.period)) : r;
  if (bmMap && series.length < r.length)
    warnings.push(
      `${r.length - series.length} return date(s) without a benchmark observation dropped`,
    );
  const raw = series.map((p) => (bmMap ? p.value - bmMap.get(p.period) : p.value));
  const results = [];
  const skipped = [];
  for (const e of ev) {
    const t0 = series.findIndex((p) => p.period >= e.date);
    if (t0 < 0 || t0 + pre < 0 || t0 + post >= series.length) {
      skipped.push(e.date);
      continue;
    }
    const estFrom = Math.max(0, t0 + pre - estLen);
    const est = raw.slice(estFrom, t0 + pre);
    if (est.length < 2) {
      skipped.push(e.date);
      continue;
    }
    if (est.length < Math.min(estLen, 30))
      warnings.push(`event ${e.date}: estimation window has only ${est.length} observations`);
    const mu = bmMap ? 0 : mean(est);
    const estAr = est.map((v) => v - mu);
    const sd = stdev(estAr);
    const ars = [];
    for (let k = pre; k <= post; k += 1)
      ars.push({ offset: k, period: series[t0 + k].period, value: raw[t0 + k] - mu });
    const car = sum(ars.map((a) => a.value));
    results.push({
      date: e.date,
      label: e.label,
      eventPeriod: series[t0].period,
      startIndex: t0 + pre,
      endIndex: t0 + post,
      ar: ars,
      car,
      sd,
      tStat: sd ? car / (sd * Math.sqrt(L)) : null,
    });
  }
  if (skipped.length)
    warnings.push(`event(s) skipped for lack of data around them: ${skipped.join(', ')}`);
  const N = results.length;
  if (N < MIN_SAMPLE.events) warnings.push(smallSample('event study', N, MIN_SAMPLE.events));
  const sorted = [...results].sort((a, b) => a.startIndex - b.startIndex);
  for (let i = 1; i < sorted.length; i += 1)
    if (sorted[i].startIndex <= sorted[i - 1].endIndex) {
      warnings.push('event windows overlap; abnormal returns are not independent');
      break;
    }
  if (!N) return metric('eventStudy', { value: null, unit: '%', method, warnings, n: 0 }, opts);
  const aar = [];
  for (let k = pre; k <= post; k += 1)
    aar.push({ offset: k, value: mean(results.map((x) => x.ar[k - pre].value)) });
  const cars = results.map((x) => x.car);
  const caar = mean(cars);
  const sdCar = stdev(cars);
  const pooledSd = Math.sqrt(mean(results.map((x) => (x.sd || 0) ** 2)));
  return metric(
    'eventStudy',
    {
      value: {
        caar,
        aar,
        nEvents: N,
        window: [pre, post],
        tStatCrossSectional: sdCar && N >= 2 ? caar / (sdCar / Math.sqrt(N)) : null,
        tStatPooled: pooledSd ? caar / ((pooledSd * Math.sqrt(L)) / Math.sqrt(N)) : null,
        events: results.map(({ startIndex, endIndex, ...rest }) => rest),
      },
      unit: '% (cumulative abnormal return)',
      method: `${bmMap ? 'market-adjusted' : 'mean-adjusted'} abnormal returns over [${pre}, ${post}] observations; CAAR = mean CAR across events; data admitted only up to asOf ${String(opts.asOf)}`,
      periods: [series[0].period, series[series.length - 1].period],
      warnings,
      n: N,
      asOf: String(opts.asOf),
    },
    opts,
  );
}

/* ================================================================== time alignment */

/**
 * Align several series on common periods. Each entry: a series, or { name|id, series }.
 * Finer series are collapsed to the target frequency (opts.to, default the coarsest present)
 * with opts.agg 'last' (default), 'mean' or 'sum'; coarser series are never expanded. Only
 * periods present in every series are kept: gaps are reported, never forward-filled.
 * value: { frequency, names, rows: [{ period, values }], columns, firstCommon, latestCommon }.
 * `notes` lists every mismatch (also in warnings). opts.ratio [i, j] adds values[i] / values[j].
 */
export function alignPeriods(seriesList, opts = {}) {
  const notes = [];
  const list = (seriesList || []).map((e, i) => {
    const raw = Array.isArray(e) ? e : e?.series || e?.history || e?.data || [];
    const name = (!Array.isArray(e) && (e?.name || e?.id)) || `series ${i + 1}`;
    const all = toSeries(raw, notes, name);
    const s = all.filter((p) => p.period && freqOf(p.period));
    if (s.length < all.length)
      notes.push(
        `${name}: ${all.length - s.length} observation(s) without a recognised period dropped`,
      );
    return { name, s, freq: seriesFreq(s) };
  });
  const freqs = list.map((x) => x.freq).filter((f) => f && f !== 'mixed');
  const coarsest = freqs.reduce((m, f) => (m == null || FREQ_RANK[f] > FREQ_RANK[m] ? f : m), null);
  const target = opts.to && FREQ_RANK[opts.to] != null ? opts.to : coarsest;
  const agg = ['mean', 'sum', 'last'].includes(opts.agg) ? opts.agg : 'last';
  if (new Set(freqs).size > 1)
    notes.push(
      `mixed frequencies (${list.map((x) => `${x.name} ${x.freq || 'unknown'}`).join(', ')}); aligned at ${target || 'unknown'} frequency`,
    );
  const keyed = list.map((x) => {
    const m = new Map();
    let coarser = 0;
    for (const p of x.s) {
      const k = target ? toFreqKey(p.period, target) : null;
      if (!k) {
        coarser += 1;
        continue;
      }
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(p.value);
    }
    if (coarser)
      notes.push(
        `${x.name} is ${x.freq}, coarser than ${target}: not expanded (no forward fill), so it has no ${target} periods`,
      );
    if (x.freq && target && FREQ_RANK[x.freq] < FREQ_RANK[target])
      notes.push(
        `${x.name} collapsed from ${x.freq} to ${target} using the ${agg === 'last' ? 'last observation' : agg} in each period`,
      );
    const vals = new Map();
    for (const [k, vs] of m)
      vals.set(k, agg === 'sum' ? sum(vs) : agg === 'mean' ? mean(vs) : vs[vs.length - 1]);
    return { name: x.name, vals };
  });
  const common = keyed.length
    ? [...keyed[0].vals.keys()].filter((k) => keyed.every((x) => x.vals.has(k))).sort()
    : [];
  const firstCommon = common[0] ?? null;
  const latestCommon = common[common.length - 1] ?? null;
  const latest = keyed.map((x) => [...x.vals.keys()].sort().pop() ?? null);
  if (new Set(latest).size > 1)
    notes.push(
      `latest observations differ (${keyed.map((x, i) => `${x.name} ${latest[i] ?? 'none'}`).join(', ')}); the aligned frame ends ${latestCommon ?? 'nowhere'}`,
    );
  const earliest = keyed.map((x) => [...x.vals.keys()].sort()[0] ?? null);
  if (new Set(earliest).size > 1)
    notes.push(
      `first observations differ (${keyed.map((x, i) => `${x.name} ${earliest[i] ?? 'none'}`).join(', ')}); the aligned frame starts ${firstCommon ?? 'nowhere'}`,
    );
  if (firstCommon) {
    const union = new Set();
    for (const x of keyed)
      for (const k of x.vals.keys()) if (k >= firstCommon && k <= latestCommon) union.add(k);
    for (const x of keyed) {
      const gaps = [...union].filter((k) => !x.vals.has(k)).sort();
      if (gaps.length)
        notes.push(
          `${x.name} has no observation for ${gaps.slice(0, 4).join(', ')}${gaps.length > 4 ? ` and ${gaps.length - 4} more` : ''}; those periods are dropped, not filled`,
        );
    }
  }
  if (keyed.length && !common.length) notes.push('no common periods across the series');
  const rows = common.map((k) => ({ period: k, values: keyed.map((x) => x.vals.get(k)) }));
  const value = {
    frequency: target,
    names: keyed.map((x) => x.name),
    rows,
    columns: Object.fromEntries(keyed.map((x, i) => [x.name, rows.map((r) => r.values[i])])),
    firstCommon,
    latestCommon,
  };
  if (Array.isArray(opts.ratio) && opts.ratio.length === 2) {
    const [i, j] = opts.ratio;
    value.ratio = rows.map((r) => ({
      period: r.period,
      value: r.values[j] ? r.values[i] / r.values[j] : null,
    }));
  }
  return metric(
    'alignPeriods',
    {
      value,
      unit: 'aligned frame',
      method: `exact period match at ${target || 'unknown'} frequency; finer series collapsed (${agg}); nothing forward-filled`,
      periods: firstCommon ? [firstCommon, latestCommon] : [],
      warnings: [...notes],
      notes,
      n: rows.length,
    },
    opts,
  );
}

/* ================================================================== macro and sovereign */

/** Ex-post real policy rate: policy rate minus latest annual inflation, percentage points. */
export function realRateExPost(policy, inflation, opts = {}) {
  const p = latestOf(policy);
  const i = latestOf(inflation);
  const warnings = [];
  if (p?.period && i?.period && p.period !== i.period)
    warnings.push(`policy rate is for ${p.period} and inflation for ${i.period}; periods differ`);
  return metric(
    'realRateExPost',
    {
      value: p && i ? p.value - i.value : null,
      unit: 'percentage points',
      method: 'ex-post: policy rate minus latest annual inflation, not a forward-looking real rate',
      periods: [p?.period, i?.period],
      warnings: p && i ? warnings : ['policy rate and annual inflation are required'],
    },
    opts,
  );
}

/**
 * Reserve import cover in months: reserves / average monthly imports. imports: a monthly
 * figure, or a series (average of the last opts.months, default 12; annual or quarterly
 * observations are divided into months). opts.unitToUsd scales reserves.
 */
export function reserveCoverMonths(reserves, imports, opts = {}) {
  const warnings = [];
  const r = latestOf(reserves);
  let monthly = null;
  let periods = [r?.period];
  if (Array.isArray(imports)) {
    const s = toSeries(imports, warnings, 'imports');
    const f = seriesFreq(s);
    const perObs = f === 'annual' ? 12 : f === 'quarterly' ? 3 : 1;
    const k = Math.max(1, Math.round((toNum(opts.months) ?? 12) / perObs));
    const tail = s.slice(-k);
    monthly = tail.length ? mean(tail.map((p) => p.value)) / perObs : null;
    if (tail.length < k)
      warnings.push(
        `imports average uses ${tail.length} observation(s), fewer than the ${k} requested`,
      );
    periods = [...periods, ...firstLast(tail)];
  } else {
    const im = latestOf(imports);
    const per = /annual|year/i.test(String(opts.importsFrequency || ''))
      ? 12
      : /quarter/i.test(String(opts.importsFrequency || ''))
        ? 3
        : 1;
    monthly = im ? im.value / per : null;
    periods.push(im?.period);
  }
  const res = r ? r.value * (toNum(opts.unitToUsd) ?? 1) : null;
  const value = res != null && monthly > 0 ? res / monthly : null;
  if (value == null) warnings.push('reserves and positive monthly imports are required');
  return metric(
    'reserveCoverMonths',
    {
      value,
      unit: 'months of imports',
      method:
        'gross reserves / average monthly imports; goods imports only overstates cover versus goods and services; gross reserves overstate what is usable',
      periods,
      warnings,
      belowWeakLine: value != null ? value < 3 : null,
      weakLine: 3,
    },
    opts,
  );
}

/**
 * Reserves over short-term external debt. stDebt is the amount, or
 * { shortTermSharePct, totalExternalDebt } (each a number or { value, period }) from World
 * Bank IDS: the amount is derived here as share / 100 x total for the SAME year; different
 * years are refused.
 */
export function shortTermDebtCover(reserves, stDebt, opts = {}) {
  const warnings = [];
  const r = latestOf(reserves);
  let amount = null;
  let debtPeriod = null;
  let derived = null;
  if (
    isObj(stDebt) &&
    (pick(stDebt, 'shortTermSharePct', 'sharePct', 'share') !== undefined ||
      pick(stDebt, 'totalExternalDebt', 'total') !== undefined)
  ) {
    const shareRaw = pick(stDebt, 'shortTermSharePct', 'sharePct', 'share');
    const totalRaw = pick(stDebt, 'totalExternalDebt', 'total');
    const share = toNum(shareRaw);
    const total = toNum(totalRaw);
    const sp = periodOf(shareRaw) ?? stDebt.period ?? null;
    const tp = periodOf(totalRaw) ?? stDebt.period ?? null;
    if (share == null || total == null)
      warnings.push('short-term share and total external debt are both required');
    else if (sp && tp && String(sp).slice(0, 4) !== String(tp).slice(0, 4)) {
      warnings.push(
        `short-term share is for ${sp} and total external debt for ${tp}: not the same year, not combined`,
      );
    } else {
      amount = (share / 100) * total;
      debtPeriod = sp ?? tp;
      derived = {
        shortTermSharePct: share,
        totalExternalDebt: total,
        shortTermDebt: amount,
        period: debtPeriod,
      };
    }
  } else {
    const d = latestOf(stDebt);
    amount = d?.value ?? null;
    debtPeriod = d?.period ?? null;
  }
  if (r?.period && debtPeriod && String(r.period).slice(0, 4) !== String(debtPeriod).slice(0, 4))
    warnings.push(
      `reserves are for ${r.period} and short-term debt for ${debtPeriod}; periods differ`,
    );
  const res = r ? r.value * (toNum(opts.unitToUsd) ?? 1) : null;
  const value = res != null && amount > 0 ? res / amount : null;
  if (value == null && !warnings.length)
    warnings.push('reserves and a positive short-term debt amount are required');
  return metric(
    'shortTermDebtCover',
    {
      value,
      unit: 'times (reserves / short-term external debt)',
      method: derived
        ? 'gross reserves / (IDS short-term share of external debt x total external debt, same year); by original maturity'
        : 'gross reserves / short-term external debt; by original maturity',
      periods: [r?.period, debtPeriod],
      warnings,
      shortTermDebt: amount,
      derived,
      belowOne: value != null ? value < 1 : null,
    },
    opts,
  );
}

/**
 * Debt dynamics: change in the debt ratio = (r - g) / (1 + g) x d - primary balance.
 * All inputs in percent (debt and primary balance in % of GDP, r effective nominal interest
 * rate, g nominal growth). Always a scenario. opts.years projects a constant-input path.
 */
export function debtDynamics(debtRatio, r, g, primaryBalance, opts = {}) {
  const d = toNum(debtRatio);
  const rr = toNum(r);
  const gg = toNum(g);
  const pb = toNum(primaryBalance);
  const warnings = ['scenario: r and the primary balance are usually assumptions, not observed'];
  if ([d, rr, gg, pb].some((x) => x == null) || gg <= -100)
    return metric(
      'debtDynamics',
      {
        value: null,
        unit: 'percentage points of GDP',
        method: 'debt dynamics',
        warnings: [...warnings, 'debt ratio, r, g and primary balance are required'],
      },
      opts,
    );
  const step = (ratio) => ((rr - gg) / (100 + gg)) * ratio - pb;
  const change = step(d);
  const path = [];
  let cur = d;
  for (let t = 1; t <= Math.max(0, Math.round(toNum(opts.years) ?? 0)); t += 1) {
    cur += step(cur);
    path.push({ year: t, debtRatio: cur });
  }
  return metric(
    'debtDynamics',
    {
      value: change,
      unit: 'percentage points of GDP',
      method: 'change in debt ratio = (r - g) / (1 + g) x debt ratio - primary balance (scenario)',
      periods: [periodOf(debtRatio)],
      warnings,
      nextDebtRatio: d + change,
      debtStabilisingPrimaryBalance: ((rr - gg) / (100 + gg)) * d,
      path,
      scenario: true,
    },
    opts,
  );
}

/* ================================================================== valuation */

function dcfValue(fcf, r, g) {
  const N = fcf.length;
  const disc = (t) => Math.pow(1 + r / 100, t);
  const pvExplicit = sum(fcf.map((f, i) => f / disc(i + 1)));
  const tv = (fcf[N - 1] * (1 + g / 100)) / ((r - g) / 100);
  const pvTerminal = tv / disc(N);
  return { pvExplicit, terminalValue: tv, pvTerminal, enterpriseValue: pvExplicit + pvTerminal };
}

/**
 * Discounted cash flow. fcfSeries: free cash flow for years 1..N; wacc and terminalGrowth
 * in %. TV = FCF_N x (1 + g) / (r - g). Returns PV, terminal share and a sensitivity grid
 * (opts.waccSteps, opts.growthSteps in percentage points). Solve mode:
 * opts.solve = { target, baseFcf | (baseRevenue, fcfMarginPct), years } returns the constant
 * growth rate over the explicit years that matches the target value (implied, not expected).
 */
export function dcf(fcfSeries, wacc, terminalGrowth, opts = {}) {
  const r = toNum(wacc);
  const g = toNum(terminalGrowth);
  const warnings = [];
  const method = 'PV = sum FCF_t / (1 + r)^t + TV / (1 + r)^N, TV = FCF_N x (1 + g) / (r - g)';
  if (r == null || g == null)
    return metric(
      'dcf',
      {
        value: null,
        unit: 'currency of the cash flows',
        method,
        warnings: ['wacc and terminal growth are required'],
      },
      opts,
    );
  if (r <= g)
    return metric(
      'dcf',
      {
        value: null,
        unit: 'currency of the cash flows',
        method,
        warnings: ['discount rate must exceed terminal growth'],
      },
      opts,
    );
  if (opts.solve) {
    const { target, years = 5 } = opts.solve;
    const base =
      toNum(opts.solve.baseFcf) ??
      (toNum(opts.solve.baseRevenue) != null && toNum(opts.solve.fcfMarginPct) != null
        ? (toNum(opts.solve.baseRevenue) * toNum(opts.solve.fcfMarginPct)) / 100
        : null);
    const tgt = toNum(target);
    const N = Math.max(1, Math.round(toNum(years) ?? 5));
    if (base == null || base <= 0 || tgt == null || tgt <= 0)
      return metric(
        'dcf',
        {
          value: null,
          unit: '% a year',
          method: 'dcf solve',
          warnings: ['solve mode needs a positive base cash flow and target value'],
        },
        opts,
      );
    const ev = (x) =>
      dcfValue(
        Array.from({ length: N }, (_, t) => base * Math.pow(1 + x / 100, t + 1)),
        r,
        g,
      ).enterpriseValue;
    let lo = -50;
    let hi = 100;
    if ((ev(lo) - tgt) * (ev(hi) - tgt) > 0)
      return metric(
        'dcf',
        {
          value: null,
          unit: '% a year',
          method: 'dcf solve',
          warnings: ['no growth rate between -50% and 100% a year matches the target'],
        },
        opts,
      );
    for (let i = 0; i < 200; i += 1) {
      const mid = (lo + hi) / 2;
      if ((ev(lo) - tgt) * (ev(mid) - tgt) <= 0) hi = mid;
      else lo = mid;
    }
    const x = (lo + hi) / 2;
    return metric(
      'dcf',
      {
        value: { impliedGrowthPct: x, years: N, target: tgt, wacc: r, terminalGrowth: g },
        unit: '% a year (implied)',
        method: `solve: constant cash-flow growth over ${N} years such that the DCF value equals the target; implied by the price, not expected`,
        warnings: ['implied growth is what the price assumes, not a forecast'],
        mode: 'solve',
      },
      opts,
    );
  }
  const s = toSeries(Array.isArray(fcfSeries) ? fcfSeries : [], warnings, 'fcf');
  const fcf = s.map((p) => p.value);
  if (!fcf.length)
    return metric(
      'dcf',
      {
        value: null,
        unit: 'currency of the cash flows',
        method,
        warnings: [...warnings, 'free cash flow series is required'],
      },
      opts,
    );
  if (fcf[fcf.length - 1] <= 0)
    warnings.push('final-year cash flow is not positive: terminal value is not meaningful');
  const base = dcfValue(fcf, r, g);
  const terminalShare = base.enterpriseValue
    ? (base.pvTerminal / base.enterpriseValue) * 100
    : null;
  if (terminalShare != null && terminalShare > 75)
    warnings.push(
      `terminal value is ${terminalShare.toFixed(0)}% of the total: the result rests mostly on the terminal assumptions`,
    );
  const waccSteps = opts.waccSteps || [-1, -0.5, 0, 0.5, 1];
  const growthSteps = opts.growthSteps || [-0.5, 0, 0.5];
  const waccs = waccSteps.map((d) => r + d);
  const growths = growthSteps.map((d) => g + d);
  const cells = waccs.map((w) =>
    growths.map((gr) => (w > gr ? dcfValue(fcf, w, gr).enterpriseValue : null)),
  );
  const flat = cells.flat().filter(isNum);
  return metric(
    'dcf',
    {
      value: {
        enterpriseValue: base.enterpriseValue,
        pvExplicit: base.pvExplicit,
        pvTerminal: base.pvTerminal,
        terminalValue: base.terminalValue,
        terminalSharePct: terminalShare,
        grid: {
          waccs,
          growths,
          cells,
          min: flat.length ? Math.min(...flat) : null,
          max: flat.length ? Math.max(...flat) : null,
        },
      },
      unit: 'currency of the cash flows',
      method,
      periods: firstLast(s),
      warnings,
      mode: 'value',
    },
    opts,
  );
}

/**
 * Weighted average cost of capital. inputs: equityValue, debtValue, taxRatePct, costOfDebtPct
 * (pre-tax) and either costOfEquityPct or riskFreePct + beta + equityRiskPremiumPct. Each may
 * be a number or { value, label }; unlabelled inputs are flagged.
 */
export function wacc(inputs = {}, opts = {}) {
  const warnings = [];
  const labels = {};
  const get = (...keys) => {
    for (const k of keys) {
      const raw = inputs[k];
      if (raw === undefined || raw === null) continue;
      const v = toNum(raw);
      if (v == null) continue;
      const label = isObj(raw) ? (raw.label ?? raw.source ?? null) : null;
      labels[keys[0]] = label;
      if (!label) warnings.push(`${keys[0]} has no label (source or assumption)`);
      return v;
    }
    return null;
  };
  const E = get('equityValue', 'marketCap', 'equity');
  const D = get('debtValue', 'debt');
  const tax = get('taxRatePct', 'taxRate');
  const kd = get('costOfDebtPct', 'costOfDebt');
  let ke = get('costOfEquityPct', 'costOfEquity');
  let capm = null;
  if (ke == null) {
    const rf = get('riskFreePct', 'riskFree');
    const beta = get('beta');
    const erp = get('equityRiskPremiumPct', 'equityRiskPremium', 'erp');
    if (rf != null && beta != null && erp != null) {
      ke = rf + beta * erp;
      capm = { riskFreePct: rf, beta, equityRiskPremiumPct: erp };
    }
  }
  const missing = [];
  if (E == null) missing.push('equity value');
  if (D == null) missing.push('debt value');
  if (ke == null) missing.push('cost of equity (or risk-free, beta and equity risk premium)');
  if (D && kd == null) missing.push('cost of debt');
  if (D && tax == null) missing.push('tax rate');
  if (missing.length || E + D <= 0)
    return metric(
      'wacc',
      {
        value: null,
        unit: '%',
        method: 'WACC',
        warnings: [...warnings, `missing: ${missing.join(', ') || 'positive capital'}`],
      },
      opts,
    );
  const we = E / (E + D);
  const wd = D / (E + D);
  const afterTaxKd = D ? kd * (1 - tax / 100) : 0;
  return metric(
    'wacc',
    {
      value: we * ke + wd * afterTaxKd,
      unit: '%',
      method:
        'E/(D+E) x cost of equity + D/(D+E) x cost of debt x (1 - tax rate); cost of equity = risk-free + beta x equity risk premium',
      warnings,
      components: {
        equityWeight: we,
        debtWeight: wd,
        costOfEquityPct: ke,
        afterTaxCostOfDebtPct: afterTaxKd,
        capm,
      },
      labels,
    },
    opts,
  );
}

/**
 * Enterprise value to equity: equity = EV - net debt - minorities - other claims. netDebt is a
 * number (debt minus cash) or { debt, cash }. opts.dilutedShares (+ opts.sharesDate) adds a
 * per-share value.
 */
export function evToEquity(ev, netDebt, minorities = 0, other = 0, opts = {}) {
  const warnings = [];
  const E = toNum(ev);
  let nd = toNum(netDebt);
  if (nd == null && isObj(netDebt) && (netDebt.debt != null || netDebt.cash != null))
    nd = (toNum(netDebt.debt) ?? 0) - (toNum(netDebt.cash) ?? 0);
  const mi = toNum(minorities) ?? 0;
  const ot = toNum(other) ?? 0;
  if (E == null || nd == null)
    return metric(
      'evToEquity',
      {
        value: null,
        unit: 'currency',
        method: 'EV bridge',
        warnings: ['enterprise value and net debt are required'],
      },
      opts,
    );
  const equity = E - nd - mi - ot;
  const shares = toNum(opts.dilutedShares);
  let perShare = null;
  if (shares > 0) {
    perShare = equity / shares;
    if (!opts.sharesDate) warnings.push('diluted share count has no stated date');
  }
  if (equity <= 0) warnings.push('claims exceed enterprise value: equity value is not positive');
  return metric(
    'evToEquity',
    {
      value: equity,
      unit: 'currency',
      method: 'equity = EV - debt + cash - minorities - other claims',
      periods: [periodOf(ev), periodOf(netDebt), opts.sharesDate],
      warnings,
      perShare,
      bridge: { enterpriseValue: E, netDebt: nd, minorities: mi, otherClaims: ot },
    },
    opts,
  );
}

function summarise(vals) {
  if (!vals.length) return { n: 0, median: null, q1: null, q3: null, min: null, max: null };
  return {
    n: vals.length,
    median: median(vals),
    q1: quantile(vals, 0.25),
    q3: quantile(vals, 0.75),
    min: Math.min(...vals),
    max: Math.max(...vals),
  };
}

/**
 * Peer multiples with median and quartiles. peers: [{ name|ticker, marketCap, ev, revenue,
 * ebitda, netIncome, grossProfit, operatingIncome, revenuePrior, multiples: {...} }].
 * opts.mode 'fundamentals' reports reported-metric ratios only (no price); default
 * 'valuation' when any peer has a market value. Non-positive denominators are excluded as
 * not meaningful.
 */
export function multiples(peers = [], opts = {}) {
  const warnings = [];
  const list = Array.isArray(peers) ? peers : [];
  const priced = list.some(
    (p) =>
      toNum(pick(p, 'marketCap', 'market_cap', 'ev', 'enterpriseValue', 'enterprise_value')) !=
      null,
  );
  const mode = opts.mode || (priced ? 'valuation' : 'fundamentals');
  const excluded = {};
  const ratio = (num, den, key) => {
    if (num == null || den == null) return null;
    if (den <= 0) {
      excluded[key] = (excluded[key] || 0) + 1;
      return null;
    }
    return num / den;
  };
  const perPeer = list.map((p) => {
    const g = (...k) => toNum(pick(p, ...k));
    const revenue = g('revenue');
    const out = { name: p.name ?? p.ticker ?? null, period: p.period ?? null };
    const gp = g('grossProfit', 'gross_profit');
    const oi = g('operatingIncome', 'operating_income');
    const ni = g('netIncome', 'net_income');
    const rp = g('revenuePrior', 'revenue_prior');
    out.grossMarginPct = gp != null && revenue > 0 ? (gp / revenue) * 100 : null;
    out.operatingMarginPct = oi != null && revenue > 0 ? (oi / revenue) * 100 : null;
    out.netMarginPct = ni != null && revenue > 0 ? (ni / revenue) * 100 : null;
    out.revenueGrowthPct = revenue != null && rp > 0 ? (revenue / rp - 1) * 100 : null;
    if (mode === 'valuation') {
      const mc = g('marketCap', 'market_cap');
      const ev = g('ev', 'enterpriseValue', 'enterprise_value');
      const ebitda = g('ebitda');
      out.evToRevenue = ratio(ev, revenue, 'evToRevenue');
      out.evToEbitda = ratio(ev, ebitda, 'evToEbitda');
      out.priceToEarnings = ratio(mc, ni, 'priceToEarnings');
      out.priceToSales = ratio(mc, revenue, 'priceToSales');
    }
    if (isObj(p.multiples))
      for (const [k, v] of Object.entries(p.multiples)) if (toNum(v) != null) out[k] = toNum(v);
    return out;
  });
  const keys = [...new Set(perPeer.flatMap((p) => Object.keys(p)))].filter(
    (k) => !['name', 'period'].includes(k),
  );
  const wanted = opts.metrics ? keys.filter((k) => opts.metrics.includes(k)) : keys;
  const summary = {};
  for (const k of wanted) {
    const s = summarise(perPeer.map((p) => p[k]).filter(isNum));
    if (s.n) summary[k] = s;
  }
  for (const [k, c] of Object.entries(excluded))
    warnings.push(`${k}: ${c} peer(s) excluded as not meaningful (non-positive denominator)`);
  if (list.length < MIN_SAMPLE.peers)
    warnings.push(smallSample('peer set', list.length, MIN_SAMPLE.peers));
  const periods = [...new Set(perPeer.map((p) => p.period).filter(Boolean))];
  if (periods.length > 1) warnings.push(`peers report different periods (${periods.join(', ')})`);
  return metric(
    'multiples',
    {
      value: { mode, perPeer, summary },
      unit: 'multiples (x) and margins (%)',
      method:
        mode === 'valuation'
          ? 'EV / revenue, EV / EBITDA, market cap / net income, market cap / revenue; median and quartiles (linear interpolation)'
          : 'reported-metric ratios only (margins, growth); median and quartiles (linear interpolation); no price used',
      periods,
      warnings,
      n: list.length,
    },
    opts,
  );
}

/* ================================================================== company fundamentals */

function finRow(r) {
  if (!r) return null;
  const g = (...k) => toNum(pick(r, ...k));
  return {
    period: r.period ?? r.fiscal_period ?? null,
    revenue: g('revenue'),
    grossProfit: g('grossProfit', 'gross_profit'),
    operatingIncome: g('operatingIncome', 'operating_income'),
    netIncome: g('netIncome', 'net_income'),
    operatingCashFlow: g('operatingCashFlow', 'operating_cash_flow'),
    capex: g('capex', 'capital_expenditure', 'capitalExpenditure'),
    derived: !!r.derived,
  };
}
function margins(f) {
  if (!f || !(f.revenue > 0)) return null;
  const pct = (x) => (x == null ? null : (x / f.revenue) * 100);
  const gross = pct(f.grossProfit);
  const operating = pct(f.operatingIncome);
  return {
    gross,
    operating,
    net: pct(f.netIncome),
    opexIntensity: gross != null && operating != null ? gross - operating : null,
  };
}

/**
 * Margin set and change in percentage points. fin: { current, prior } or an array of period
 * rows (last two compared; opts.priorIndex overrides). Operating margin change = gross margin
 * change - operating-expense intensity change.
 */
export function marginDecomposition(fin, opts = {}) {
  const warnings = [];
  let cur;
  let pri;
  if (Array.isArray(fin)) {
    const rows = fin.map(finRow).filter(Boolean);
    cur = rows[rows.length - 1];
    pri = rows[toNum(opts.priorIndex) ?? rows.length - 2];
  } else {
    cur = finRow(fin?.current ?? fin);
    pri = finRow(fin?.prior);
  }
  const mc = margins(cur);
  if (!mc)
    return metric(
      'marginDecomposition',
      {
        value: null,
        unit: '%',
        method: 'margins over revenue',
        warnings: ['current period needs positive revenue'],
      },
      opts,
    );
  for (const r of [cur, pri])
    if (r?.derived)
      warnings.push(
        `${r.period || 'a period'} is a derived quarter (fiscal year minus three reported quarters)`,
      );
  const mp = margins(pri);
  const d = (k) => (mp && mc[k] != null && mp[k] != null ? mc[k] - mp[k] : null);
  const changePp = mp
    ? {
        gross: d('gross'),
        operating: d('operating'),
        net: d('net'),
        opexIntensity: d('opexIntensity'),
      }
    : null;
  if (pri && !mp) warnings.push('prior period has no positive revenue; changes not computed');
  return metric(
    'marginDecomposition',
    {
      value: {
        current: mc,
        prior: mp,
        changePp,
        decomposition:
          changePp && changePp.gross != null && changePp.opexIntensity != null
            ? {
                operatingChangePp: changePp.operating,
                fromGrossMarginPp: changePp.gross,
                fromOpexIntensityPp: -changePp.opexIntensity,
              }
            : null,
      },
      unit: '% of revenue; changes in percentage points',
      method:
        'gross, operating and net income over revenue; opex intensity = gross margin - operating margin',
      periods: [pri?.period, cur.period],
      warnings,
    },
    opts,
  );
}

/**
 * Cash conversion: OCF / net income, (OCF - capex) / net income, capex / revenue,
 * capex / OCF. Net-income ratios are not meaningful when net income is zero or negative.
 */
export function cashConversion(fin, opts = {}) {
  const f = finRow(Array.isArray(fin) ? fin[fin.length - 1] : fin);
  const warnings = [];
  if (!f || f.operatingCashFlow == null)
    return metric(
      'cashConversion',
      {
        value: null,
        unit: 'x',
        method: 'cash conversion',
        warnings: ['operating cash flow is required'],
      },
      opts,
    );
  const capex = f.capex == null ? null : Math.abs(f.capex);
  const niOk = f.netIncome != null && f.netIncome > 0;
  if (!niOk)
    warnings.push('net income is zero, negative or missing: net-income ratios not meaningful');
  if (f.derived) warnings.push(`${f.period || 'the period'} is a derived quarter`);
  return metric(
    'cashConversion',
    {
      value: {
        ocfToNetIncome: niOk ? f.operatingCashFlow / f.netIncome : null,
        fcfToNetIncome: niOk && capex != null ? (f.operatingCashFlow - capex) / f.netIncome : null,
        capexToRevenuePct: capex != null && f.revenue > 0 ? (capex / f.revenue) * 100 : null,
        capexToOcfPct:
          capex != null && f.operatingCashFlow > 0 ? (capex / f.operatingCashFlow) * 100 : null,
        freeCashFlow: capex != null ? f.operatingCashFlow - capex : null,
      },
      unit: 'x (net-income ratios), % (capex ratios)',
      method:
        'OCF / NI; (OCF - capex) / NI; capex / revenue; capex / OCF (capex taken as a positive outflow)',
      periods: [f.period],
      warnings,
    },
    opts,
  );
}

/* ================================================================== concentration */

function namedValues(values) {
  if (isObj(values)) return Object.entries(values).map(([name, v]) => ({ name, value: toNum(v) }));
  return (values || []).map((v, i) =>
    isObj(v)
      ? { name: v.name ?? v.id ?? v.label ?? String(i + 1), value: toNum(v) }
      : { name: String(i + 1), value: toNum(v) },
  );
}

/**
 * Herfindahl index from values or shares (any scale: they are normalised to shares of the
 * total, or of opts.total when given). value on opts.scale 'fraction' (0 to 1, default) or
 * 'points' (0 to 10,000); both are returned.
 */
export function herfindahl(shares, opts = {}) {
  const warnings = [];
  const items = namedValues(shares);
  const neg = items.filter((x) => x.value != null && x.value < 0).length;
  if (neg) warnings.push(`${neg} negative value(s) excluded`);
  const vals = items.filter((x) => x.value != null && x.value >= 0);
  const total = toNum(opts.total) ?? sum(vals.map((x) => x.value));
  if (!(total > 0))
    return metric(
      'herfindahl',
      {
        value: null,
        unit: 'index',
        method: 'sum of squared shares',
        warnings: [...warnings, 'needs positive values'],
      },
      opts,
    );
  const covered = sum(vals.map((x) => x.value)) / total;
  if (opts.total && covered < 0.999)
    warnings.push(
      `included firms cover ${(covered * 100).toFixed(1)}% of the stated total; index is a lower bound`,
    );
  const frac = sum(vals.map((x) => (x.value / total) ** 2));
  const scale = opts.scale === 'points' ? 'points' : 'fraction';
  return metric(
    'herfindahl',
    {
      value: scale === 'points' ? frac * 10000 : frac,
      unit: scale === 'points' ? 'HHI points (0 to 10,000)' : 'HHI (0 to 1)',
      method: 'sum of squared shares of the total',
      warnings,
      n: vals.length,
      hhiFraction: frac,
      hhiPoints: frac * 10000,
      equivalentNumber: frac ? 1 / frac : null,
    },
    opts,
  );
}

/** Top-N share of the total, in %, with the top items listed. */
export function concentrationTopN(values, n = 1, opts = {}) {
  const warnings = [];
  const items = namedValues(values).filter((x) => x.value != null);
  const neg = items.filter((x) => x.value < 0).length;
  if (neg) warnings.push(`${neg} negative value(s) excluded`);
  const pos = items.filter((x) => x.value >= 0).sort((a, b) => b.value - a.value);
  const total = toNum(opts.total) ?? sum(pos.map((x) => x.value));
  const k = Math.max(1, Math.round(toNum(n) ?? 1));
  if (k > pos.length) warnings.push(`top ${k} requested but only ${pos.length} item(s)`);
  if (!(total > 0))
    return metric(
      'concentrationTopN',
      {
        value: null,
        unit: '%',
        method: 'top-N share',
        warnings: [...warnings, 'needs a positive total'],
      },
      opts,
    );
  const top = pos.slice(0, k).map((x) => ({ ...x, sharePct: (x.value / total) * 100 }));
  return metric(
    'concentrationTopN',
    {
      value: (sum(top.map((x) => x.value)) / total) * 100,
      unit: '%',
      method: `sum of the ${k} largest values / total`,
      warnings,
      n: pos.length,
      topN: k,
      total,
      top,
    },
    opts,
  );
}

/* ================================================================== ownership */

const cikOf = (r) =>
  String(pick(r, 'cik', 'filer_cik', 'manager', 'managerId', 'manager_id') ?? '');
const secOf = (r) => String(pick(r, 'cusip', 'ticker', 'security') ?? '');

/**
 * Quarter-over-quarter 13F position changes among managers that filed in BOTH quarters.
 * q0, q1: holdings rows { cik, shares, cusip|ticker, value }. Filing presence comes from
 * opts.filers0 / opts.filers1 (CIKs that filed each quarter); without them, only managers
 * holding in both quarters can be compared and new or exit cannot be told apart from
 * not filing.
 */
export function positionChange13F(q0, q1, opts = {}) {
  const warnings = [];
  const agg = (rows) => {
    const m = new Map();
    for (const r of rows || []) {
      const key = `${cikOf(r)}|${secOf(r)}`;
      const sh = toNum(r.shares) ?? 0;
      const cur = m.get(key) || {
        cik: cikOf(r),
        security: secOf(r),
        shares: 0,
        name: r.filer_name ?? r.manager_name ?? null,
      };
      cur.shares += sh;
      m.set(key, cur);
    }
    return m;
  };
  const a = agg(q0);
  const b = agg(q1);
  let filers;
  if (opts.filers0 && opts.filers1) {
    const f1 = new Set([...opts.filers1].map(String));
    filers = new Set([...opts.filers0].map(String).filter((c) => f1.has(c)));
  } else {
    const c0 = new Set([...a.values()].map((x) => x.cik));
    filers = new Set([...b.values()].map((x) => x.cik).filter((c) => c0.has(c)));
    warnings.push(
      'filer lists not supplied: only managers holding in both quarters are compared, so new positions and exits cannot be identified',
    );
  }
  const keys = new Set([...a.keys(), ...b.keys()]);
  const changes = [];
  for (const k of keys) {
    const x0 = a.get(k);
    const x1 = b.get(k);
    const cik = (x0 || x1).cik;
    if (!filers.has(cik)) continue;
    const s0 = x0?.shares ?? 0;
    const s1 = x1?.shares ?? 0;
    if (!s0 && !s1) continue;
    const type = !s0 ? 'new' : !s1 ? 'exit' : s1 > s0 ? 'add' : s1 < s0 ? 'cut' : 'unchanged';
    changes.push({
      cik,
      name: (x1 || x0).name,
      security: (x0 || x1).security,
      sharesBefore: s0,
      sharesAfter: s1,
      shareChange: s1 - s0,
      type,
    });
  }
  const counts = { new: 0, add: 0, cut: 0, exit: 0, unchanged: 0 };
  for (const c of changes) counts[c.type] += 1;
  const top = (type, dir) =>
    changes
      .filter((c) => c.type === type)
      .sort((p, q) => dir * (q.shareChange - p.shareChange))
      .slice(0, 5);
  return metric(
    'positionChange13F',
    {
      value: {
        managersCompared: new Set(changes.map((c) => c.cik)).size,
        counts,
        netShareChange: sum(changes.map((c) => c.shareChange)),
        largest: {
          adds: top('add', 1),
          cuts: top('cut', -1),
          new: top('new', 1),
          exits: top('exit', -1),
        },
      },
      unit: 'managers and shares',
      method:
        'per manager and security, shares this quarter minus last quarter; only managers that filed both quarters; long positions reported on 13F only',
      periods: [opts.period0, opts.period1],
      warnings,
      n: changes.length,
      changes,
    },
    opts,
  );
}

/**
 * Deduplicate 13F holdings across raw filings, amendments and materialised tables. Rows:
 * { cik, period, cusip|ticker, shares, value, accession, amendmentType ('RESTATEMENT' |
 * 'NEW HOLDINGS'), formType, filedAt, source ('raw' | 'materialised' or a table name) }.
 * Materialised rows win for a manager-quarter; among raw filings the latest restatement
 * replaces earlier rows and later new-holdings amendments add to it; exact repeats drop.
 */
export function dedupeHoldings(rows, opts = {}) {
  const warnings = [];
  const all = (rows || []).map((r) => ({
    ...r,
    _cik: cikOf(r),
    _period: String(pick(r, 'period', 'period_of_report', 'quarter') ?? ''),
    _sec: secOf(r),
    _acc: String(pick(r, 'accession', 'accession_no', 'accessionNo') ?? ''),
    _filed: String(pick(r, 'filedAt', 'filed_at', 'filing_date') ?? ''),
    _raw: /raw|sec_13f_holdings/i.test(String(r.source ?? 'raw')),
    _amend: String(
      pick(r, 'amendmentType', 'amendment_type') ??
        (/\/A$/i.test(String(pick(r, 'formType', 'form_type') ?? '')) ? 'AMENDMENT' : ''),
    ).toUpperCase(),
  }));
  const groups = new Map();
  for (const r of all) {
    const k = `${r._cik}|${r._period}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const out = [];
  let removed = 0;
  let rawUsed = 0;
  let ambiguous = 0;
  for (const g of groups.values()) {
    const mat = g.filter((r) => !r._raw);
    if (mat.length) {
      removed += g.length - mat.length;
      const seen = new Set();
      for (const r of mat) {
        const key = `${r._sec}|${r.shares}|${r.source ?? ''}`;
        if (seen.has(key)) removed += 1;
        else {
          seen.add(key);
          out.push(r);
        }
      }
      continue;
    }
    /* Raw only: order filings by filing time. */
    const byAcc = new Map();
    for (const r of g) {
      if (!byAcc.has(r._acc)) byAcc.set(r._acc, []);
      byAcc.get(r._acc).push(r);
    }
    const filings = [...byAcc.entries()]
      .map(([acc, rs]) => ({ acc, rs, filed: rs[0]._filed, amend: rs[0]._amend }))
      .sort((p, q) => (p.filed < q.filed ? -1 : p.filed > q.filed ? 1 : 0));
    let base = [];
    for (const f of filings) {
      if (!f.amend || /RESTATEMENT/.test(f.amend)) {
        removed += base.length;
        base = [...f.rs];
      } else if (/NEW HOLDINGS/.test(f.amend)) base = [...base, ...f.rs];
      else {
        ambiguous += 1;
        removed += base.length;
        base = [...f.rs];
      }
    }
    const seen = new Set();
    for (const r of base) {
      const key = `${r._acc}|${r._sec}|${r.shares}`;
      if (seen.has(key)) {
        removed += 1;
        continue;
      }
      seen.add(key);
      rawUsed += 1;
      out.push(r);
    }
  }
  if (ambiguous)
    warnings.push(`${ambiguous} amendment(s) without an amendment type treated as restatements`);
  const clean = out.map(({ _cik, _period, _sec, _acc, _filed, _raw, _amend, ...r }) => r);
  return metric(
    'dedupeHoldings',
    {
      value: {
        rows: clean,
        duplicatesRemoved: removed,
        rawRowsUsed: rawUsed,
        managerQuarters: groups.size,
      },
      unit: 'rows',
      method:
        'per manager-quarter: materialised rows win; raw filings ordered by filing date, restatements replace, new-holdings amendments add; exact repeats dropped',
      periods: [...new Set(all.map((r) => r._period).filter(Boolean))].sort(),
      warnings,
      n: clean.length,
    },
    opts,
  );
}

/* ================================================================== contracts and lobbying */

const fyOfDate = (d) =>
  d ? (d.getUTCMonth() >= 9 ? d.getUTCFullYear() + 1 : d.getUTCFullYear()) : null;

/**
 * Obligations by federal fiscal year (1 Oct to 30 Sep). rows: { fiscal_year | action_date,
 * amount | total_obligation | award_amount, awarding_agency }. The current FY is incomplete;
 * for Defense-heavy sets (opts.dodHeavy, or over half the dollars from Defense) the latest
 * finished FY stays incomplete until the January after it ends. opts.asOf | opts.now sets
 * today.
 */
export function contractObligationsByFY(rows, opts = {}) {
  const warnings = [];
  const now = toDate(opts.asOf) || toDate(opts.now) || new Date();
  const curFY = fyOfDate(now);
  const by = new Map();
  let dropped = 0;
  let dodAmt = 0;
  let allAmt = 0;
  for (const r of rows || []) {
    const amt = toNum(
      pick(r, 'amount', 'obligation', 'total_obligation', 'obligated', 'award_amount'),
    );
    let fy = toNum(pick(r, 'fiscal_year', 'fiscalYear', 'fy'));
    if (fy == null) fy = fyOfDate(toDate(pick(r, 'action_date', 'actionDate', 'date')));
    if (amt == null || fy == null) {
      dropped += 1;
      continue;
    }
    allAmt += amt;
    if (/defen[cs]e|army|navy|air force/i.test(String(pick(r, 'awarding_agency', 'agency') ?? '')))
      dodAmt += amt;
    if (!by.has(fy)) by.set(fy, { fy, total: 0, awards: 0, top: 0 });
    const g = by.get(fy);
    g.total += amt;
    g.awards += 1;
    g.top = Math.max(g.top, amt);
  }
  if (dropped) warnings.push(`${dropped} row(s) without an amount or fiscal year dropped`);
  const dodHeavy = opts.dodHeavy ?? (allAmt > 0 && dodAmt / allAmt > 0.5);
  const byYear = [...by.values()]
    .sort((a, b) => a.fy - b.fy)
    .map((g) => {
      const finished = g.fy < curFY;
      const complete = finished && (!dodHeavy || now >= new Date(Date.UTC(g.fy + 1, 0, 1)));
      const topAwardSharePct = g.total ? (g.top / g.total) * 100 : null;
      if (topAwardSharePct > 25)
        warnings.push(
          `FY${g.fy}: the largest award is ${topAwardSharePct.toFixed(0)}% of the year's total; one award can swing the year`,
        );
      if (g.fy > curFY)
        warnings.push(
          `FY${g.fy} is in the future (period-of-performance start dates); not a completed year`,
        );
      return {
        period: `FY${g.fy}`,
        fiscalYear: g.fy,
        total: g.total,
        awards: g.awards,
        topAwardSharePct,
        complete,
      };
    });
  const complete = byYear.filter((y) => y.complete);
  return metric(
    'contractObligationsByFY',
    {
      value: {
        byYear,
        latestComplete: complete.length ? complete[complete.length - 1].period : null,
        completeYears: complete.map((y) => y.period),
      },
      unit: 'USD obligated',
      method: `sum of obligations per federal fiscal year (1 Oct to 30 Sep); current FY${curFY} incomplete${dodHeavy ? '; Defense-heavy, so the latest finished FY is incomplete until January (about 90-day reporting delay)' : ''}; obligations, not outlays or revenue`,
      periods: byYear.map((y) => y.period),
      warnings,
      n: byYear.length,
    },
    opts,
  );
}

/**
 * Ceiling vs obligated per award and in total: unobligated ceiling = ceiling - obligated,
 * obligated share = obligated / ceiling. Rows: { generated_award_id, base_and_all_options
 * (ceiling), base_exercised_options (current value), total_obligation (obligated) }.
 */
export function awardCeilingVsObligated(rows, opts = {}) {
  const warnings = [];
  const awards = [];
  let noCeiling = 0;
  for (const r of rows || []) {
    const ceiling = toNum(
      pick(r, 'ceiling', 'base_and_all_options', 'potential_total_value', 'baseAndAllOptions'),
    );
    const current = toNum(pick(r, 'currentValue', 'current_value', 'base_exercised_options'));
    const obligated = toNum(pick(r, 'obligated', 'total_obligation', 'award_amount', 'obligation'));
    const id = pick(r, 'awardId', 'award_id', 'generated_award_id', 'piid') ?? null;
    if (ceiling == null || !(ceiling > 0) || obligated == null) {
      noCeiling += 1;
      continue;
    }
    if (obligated > ceiling)
      warnings.push(`award ${id}: obligated exceeds the ceiling (data lag or modification)`);
    awards.push({
      id,
      ceiling,
      currentValue: current,
      obligated,
      unobligatedCeiling: ceiling - obligated,
      obligatedSharePct: (obligated / ceiling) * 100,
    });
  }
  if (noCeiling)
    warnings.push(
      `${noCeiling} award(s) without a ceiling or obligation excluded (ceilings have limited coverage)`,
    );
  const tc = sum(awards.map((a) => a.ceiling));
  const to = sum(awards.map((a) => a.obligated));
  return metric(
    'awardCeilingVsObligated',
    {
      value: awards.length
        ? {
            totals: {
              ceiling: tc,
              obligated: to,
              unobligatedCeiling: tc - to,
              obligatedSharePct: tc ? (to / tc) * 100 : null,
            },
            awards,
          }
        : null,
      unit: 'USD',
      method:
        'unobligated ceiling = ceiling - obligated (an upper bound on future obligation, not backlog); obligated share = obligated / ceiling',
      warnings,
      n: awards.length,
    },
    opts,
  );
}

const QUARTER_WORDS = { first_quarter: 1, second_quarter: 2, third_quarter: 3, fourth_quarter: 4 };
function lobbyQuarter(r) {
  const fp = String(pick(r, 'filing_period', 'filingPeriod', 'quarter') ?? '').toLowerCase();
  if (QUARTER_WORDS[fp]) return QUARTER_WORDS[fp];
  let m = /q?([1-4])/.exec(fp);
  if (m && fp.length <= 2) return Number(m[1]);
  m = /Q([1-4])/i.exec(String(pick(r, 'filing_type', 'filingType') ?? ''));
  return m ? Number(m[1]) : null;
}
const normName = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[.,'&]/g, ' ')
    .replace(/\b(inc|corp|corporation|co|company|llc|ltd|lp|plc|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Lobbying spend by client and quarter from LD-2 rows (lobbying_filings shape). Registrations
 * (LD-1) and zero or missing amounts are excluded; amendments supersede the original for the
 * same client, registrant and quarter; if the client self-files, only its own expenses are
 * used, otherwise outside registrants' income is summed. A quarter is incomplete until 20
 * days after it ends (LD-2 deadline). Returns quarters per client, totals across clients and
 * trailing four-quarter sums over complete quarters.
 */
export function lobbyingSpendByQuarter(rows, opts = {}) {
  const warnings = [];
  const now = toDate(opts.asOf) || toDate(opts.now) || new Date();
  const kept = new Map();
  let excluded = 0;
  for (const r of rows || []) {
    const ft = String(pick(r, 'filing_type', 'filingType') ?? '');
    const reg =
      r.is_registration === true ||
      r.isRegistration === true ||
      /^R[RA]?$|LD-?1|registration/i.test(ft);
    const amt = toNum(r.amount);
    const year = toNum(pick(r, 'filing_year', 'filingYear', 'year'));
    const q = lobbyQuarter(r);
    if (reg || !amt || amt <= 0 || year == null || q == null) {
      excluded += 1;
      continue;
    }
    const client = normName(pick(r, 'client_name', 'clientName', 'client'));
    const registrant = normName(pick(r, 'registrant_name', 'registrantName', 'registrant'));
    const self = r.self_filed ?? r.selfFiled ?? (client && registrant && client === registrant);
    const amend = r.is_amendment === true || r.isAmendment === true || /^Q[1-4]A$|amend/i.test(ft);
    const key = `${client}|${registrant}|${year}|${q}`;
    const rec = {
      client,
      clientLabel: pick(r, 'client_name', 'clientName', 'client') ?? client,
      registrant,
      self: !!self,
      amend,
      amt,
      year,
      q,
      posted: String(pick(r, 'dt_posted', 'posted', 'filed_at') ?? ''),
    };
    const prev = kept.get(key);
    if (
      !prev ||
      (rec.amend && !prev.amend) ||
      (rec.amend === prev.amend && rec.posted > prev.posted)
    ) {
      if (prev) excluded += 1;
      kept.set(key, rec);
    } else excluded += 1;
  }
  if (excluded)
    warnings.push(
      `${excluded} filing(s) excluded (registrations, zero or missing amounts, or superseded by an amendment)`,
    );
  const byClient = new Map();
  for (const rec of kept.values()) {
    const ck = rec.client;
    if (!byClient.has(ck)) byClient.set(ck, { client: rec.clientLabel, quarters: new Map() });
    const qk = `${rec.year}-Q${rec.q}`;
    const qs = byClient.get(ck).quarters;
    if (!qs.has(qk)) qs.set(qk, { self: [], outside: [], year: rec.year, q: rec.q });
    qs.get(qk)[rec.self ? 'self' : 'outside'].push(rec.amt);
  }
  const isComplete = (y, q) => now >= new Date(Date.UTC(y, q * 3, 0) + 20 * dayMs);
  const totals = new Map();
  const clients = [...byClient.values()].map((c) => {
    const quarters = [...c.quarters.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([period, x]) => {
        const selfFiled = x.self.length > 0;
        const spend = selfFiled ? sum(x.self) : sum(x.outside);
        if (selfFiled && x.outside.length)
          warnings.push(
            `${c.client} ${period}: self-filed expenses used; outside firms' income not added (would double count)`,
          );
        const complete = isComplete(x.year, x.q);
        const t = totals.get(period) || { period, spend: 0, complete };
        t.spend += spend;
        totals.set(period, t);
        return {
          period,
          spend,
          rule: selfFiled ? 'self-filed expenses only' : 'outside income summed',
          filings: x.self.length + x.outside.length,
          complete,
        };
      });
    return { client: c.client, quarters };
  });
  const total = [...totals.values()].sort((a, b) => (a.period < b.period ? -1 : 1));
  const comp = total.filter((t) => t.complete);
  let trailing = null;
  if (comp.length >= 8) {
    const last4 = comp.slice(-4);
    const prior4 = comp.slice(-8, -4);
    trailing = {
      last4: sum(last4.map((t) => t.spend)),
      prior4: sum(prior4.map((t) => t.spend)),
      last4Periods: last4.map((t) => t.period),
      prior4Periods: prior4.map((t) => t.period),
    };
    const seq = comp
      .slice(-8)
      .map((t) => Number(t.period.slice(0, 4)) * 4 + Number(t.period.slice(-1)));
    if (seq.some((v, i) => i && v - seq[i - 1] !== 1))
      warnings.push(
        'the last eight complete quarters are not consecutive; a quarter with no filing is missing, not zero',
      );
  } else
    warnings.push(
      `only ${comp.length} complete quarter(s); trailing four-quarter comparison needs eight`,
    );
  if (total.some((t) => !t.complete))
    warnings.push('the latest quarter is incomplete (LD-2 due 20 days after quarter end)');
  return metric(
    'lobbyingSpendByQuarter',
    {
      value: { clients, total, trailing },
      unit: 'USD per quarter',
      method:
        'LD-2 amounts per client and quarter; LD-1 and zero filings excluded; amendments supersede; self-filers counted on their own expenses only; LDA rounds to the nearest $10,000',
      periods: total.map((t) => t.period),
      warnings,
      n: kept.size,
    },
    opts,
  );
}

/* ================================================================== congressional trades */

function parseRange(range) {
  if (range == null) return null;
  if (
    Array.isArray(range) &&
    range.length === 2 &&
    range.every((v) => v == null || !Number.isNaN(Number(v)))
  )
    return { min: toNum(range[0]), max: toNum(range[1]), open: range[1] == null };
  if (isObj(range)) {
    const min = toNum(pick(range, 'min', 'low', 'amount_min', 'amountMin'));
    const max = toNum(pick(range, 'max', 'high', 'amount_max', 'amountMax'));
    return { min, max, open: max == null };
  }
  const s = String(range).replace(/[$,\s]/g, '');
  const nums = (s.match(/\d+(\.\d+)?/g) || []).map(Number);
  if (/over|above|morethan|\+$/i.test(s) || nums.length === 1)
    return { min: nums[0] ?? null, max: null, open: true };
  return { min: nums[0] ?? null, max: nums[1] ?? null, open: false };
}

/**
 * Midpoint estimate with bounds for a filed amount range ('$1,001 - $15,000', 'Over
 * $50,000,000', { min, max } or [min, max]). Open top brackets return the minimum and
 * open: true. An array of ranges aggregates: lower bounds, upper bounds (null when any range
 * is open) and midpoints summed separately.
 */
export function tradeRangeMidpoint(range, opts = {}) {
  const warnings = [];
  const single =
    !Array.isArray(range) ||
    (range.length === 2 && range.every((v) => v == null || !Number.isNaN(Number(v))));
  const ranges = (single ? [range] : range).map(parseRange).filter((r) => r && r.min != null);
  if (!ranges.length)
    return metric(
      'tradeRangeMidpoint',
      {
        value: null,
        unit: 'USD (estimate)',
        method: 'range midpoint',
        warnings: ['no parseable range'],
      },
      opts,
    );
  const mids = ranges.map((r) => (r.open ? r.min : (r.min + r.max) / 2));
  const openCount = ranges.filter((r) => r.open).length;
  if (openCount)
    warnings.push(
      `${openCount} open-ended bracket(s): the midpoint uses the minimum and understates`,
    );
  const low = sum(ranges.map((r) => r.min));
  const high = openCount ? null : sum(ranges.map((r) => r.max));
  return metric(
    'tradeRangeMidpoint',
    {
      value: sum(mids),
      unit: 'USD (midpoint estimate)',
      method:
        'midpoint = (min + max) / 2, bounds = [min, max]; open top bracket uses the minimum; the filed range is the only fact',
      warnings,
      bounds: [low, high],
      low,
      high,
      open: openCount > 0,
      openEndedBrackets: openCount,
      n: ranges.length,
    },
    opts,
  );
}

/**
 * Disclosure lag in calendar days (filed date minus transaction date). Above opts.limitDays
 * (default 45) is late on Ezana's computation. Arrays of { txDate, filedDate } summarise.
 */
export function disclosureLagDays(txDate, filedDate, opts = {}) {
  const limit = toNum(opts?.limitDays) ?? 45;
  const lag = (a, b) => {
    const da = toDate(a);
    const db = toDate(b);
    return da && db ? Math.round((utcDay(db) - utcDay(da)) / dayMs) : null;
  };
  if (Array.isArray(txDate)) {
    const o = isObj(filedDate) ? filedDate : opts;
    const lags = txDate
      .map((r) =>
        lag(
          pick(r, 'txDate', 'transaction_date', 'tx_date'),
          pick(r, 'filedDate', 'disclosure_date', 'filed_at', 'filing_date'),
        ),
      )
      .filter(isNum);
    const warnings = lags.some((l) => l < 0)
      ? ['some filing dates precede the transaction date (data error)']
      : [];
    return metric(
      'disclosureLagDays',
      {
        value: lags.length ? median(lags) : null,
        unit: 'calendar days (median)',
        method: `filed date minus transaction date; late above ${limit} days (Ezana's computation; notification dates can legitimately shift the clock)`,
        warnings,
        n: lags.length,
        mean: mean(lags),
        max: lags.length ? Math.max(...lags) : null,
        lateCount: lags.filter((l) => l > limit).length,
      },
      o,
    );
  }
  const v = lag(txDate, filedDate);
  const warnings = [];
  if (v == null) warnings.push('both dates are required');
  else if (v < 0) warnings.push('filing date precedes the transaction date (data error)');
  return metric(
    'disclosureLagDays',
    {
      value: v,
      unit: 'calendar days',
      method: `filed date minus transaction date; late above ${limit} days (Ezana's computation; notification dates can legitimately shift the clock)`,
      periods: [String(txDate ?? ''), String(filedDate ?? '')].filter(Boolean),
      warnings,
      late: v == null ? null : v > limit,
      limitDays: limit,
    },
    opts,
  );
}

/* ================================================================== prediction markets */

/**
 * Implied probability from a 0 to 1 price, a fee per contract (price units, an assumption
 * unless evidence supplies it) and the spread (ask - bid, or { bid, ask }). Returns the
 * midpoint and the bid-implied and ask-implied bounds, in %.
 */
export function impliedProbability(price, fees = 0, spread = 0, opts = {}) {
  const warnings = ['a traded price is not a calibrated probability'];
  let p = toNum(price);
  let bid = null;
  let ask = null;
  if (isObj(spread)) {
    bid = toNum(spread.bid);
    ask = toNum(spread.ask);
  }
  if (p != null && p > 1 && p <= 100) {
    p /= 100;
    warnings.push('price given in cents or percent was converted to a 0 to 1 price');
  }
  const sp = isObj(spread) ? (bid != null && ask != null ? ask - bid : null) : (toNum(spread) ?? 0);
  if (bid == null && p != null) bid = p - (sp ?? 0) / 2;
  if (ask == null && p != null) ask = p + (sp ?? 0) / 2;
  if (p == null && bid != null && ask != null) p = (bid + ask) / 2;
  const fee = toNum(fees) ?? 0;
  if (fees == null || fees === 0)
    warnings.push('fees assumed zero (venue fee schedules are not stored)');
  if (p == null || p < 0 || p > 1)
    return metric(
      'impliedProbability',
      {
        value: null,
        unit: '%',
        method: 'implied probability',
        warnings: [...warnings, 'a price between 0 and 1 is required'],
      },
      opts,
    );
  if (sp != null && sp > 0.1)
    warnings.push(`spread of ${(sp * 100).toFixed(1)} points: thin market, the price means little`);
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const low = clamp(bid - fee) * 100;
  const high = clamp(ask + fee) * 100;
  return metric(
    'impliedProbability',
    {
      value: clamp((bid + ask) / 2) * 100,
      unit: '%',
      method: 'midpoint of bid and ask; bounds: bid minus fee (selling) to ask plus fee (buying)',
      periods: [periodOf(price)],
      warnings,
      bounds: [low, high],
      bidImpliedPct: low,
      askImpliedPct: high,
      spreadPoints: sp == null ? null : sp * 100,
    },
    opts,
  );
}

/** Overround of a multi-outcome market: sum of outcome prices minus 1 (0 to 1 prices). */
export function overround(prices, opts = {}) {
  const warnings = [];
  const ps = (Array.isArray(prices) ? prices : namedValues(prices)).map(toNum).filter(isNum);
  if (ps.length < 2)
    return metric(
      'overround',
      {
        value: null,
        unit: 'probability units',
        method: 'sum of prices - 1',
        warnings: ['needs at least two outcome prices'],
      },
      opts,
    );
  if (ps.some((p) => p < 0 || p > 1)) warnings.push('prices outside 0 to 1');
  const v = sum(ps) - 1;
  if (v < 0) warnings.push('prices sum to less than 1: outcomes may be missing or quotes stale');
  return metric(
    'overround',
    {
      value: v,
      unit: 'probability units (sum of prices minus 1)',
      method:
        'sum of outcome prices - 1; reflects spreads and fees, outcome prices need not sum to one',
      warnings,
      overroundPoints: v * 100,
      n: ps.length,
    },
    opts,
  );
}

/** Brier score: mean squared difference between forecasts (0 to 1) and outcomes (0 or 1). */
export function brierScore(forecasts, outcomes, opts = {}) {
  const warnings = [];
  const f = (forecasts || []).map(toNum);
  const o = (outcomes || []).map(toNum);
  if (f.length !== o.length)
    warnings.push(
      `forecasts (${f.length}) and outcomes (${o.length}) differ in length; paired by position up to the shorter`,
    );
  const pairs = [];
  for (let i = 0; i < Math.min(f.length, o.length); i += 1)
    if (f[i] != null && (o[i] === 0 || o[i] === 1)) pairs.push([f[i], o[i]]);
  if (pairs.length < MIN_SAMPLE.brier)
    warnings.push(smallSample('Brier score', pairs.length, MIN_SAMPLE.brier));
  return metric(
    'brierScore',
    {
      value: pairs.length ? mean(pairs.map(([p, y]) => (p - y) ** 2)) : null,
      unit: 'Brier score (0 best, 1 worst)',
      method: 'mean of (forecast - outcome)^2 on resolved events; 0.25 is a constant 50% forecast',
      warnings,
      n: pairs.length,
    },
    opts,
  );
}

/* ================================================================== portfolio */

function weightMap(weights, warnings) {
  const m = new Map();
  if (Array.isArray(weights)) {
    weights.forEach((w, i) => {
      if (isObj(w)) m.set(String(w.id ?? w.ticker ?? w.name ?? i), toNum(w.weight ?? w.value));
      else m.set(String(i), toNum(w));
    });
  } else if (isObj(weights)) for (const [k, v] of Object.entries(weights)) m.set(k, toNum(v));
  const tot = sum([...m.values()].filter(isNum));
  if (tot > 1.5 && tot <= 150) {
    for (const [k, v] of m) m.set(k, v == null ? null : v / 100);
    warnings.push('weights read as percent and divided by 100');
  }
  return m;
}

/**
 * Portfolio return. Single period: weights and returns (in %) by asset id (objects or
 * parallel arrays) give the sum of weight x return. Backtest: returns as series per asset;
 * constant weights rebalanced each period over periods every held asset reports (no fill),
 * value = cumulative return. Backtests check opts.asOf (no look-ahead).
 */
export function portfolioReturn(weights, returns, opts = {}) {
  const warnings = [];
  const w = weightMap(weights, warnings);
  const rm = new Map();
  if (Array.isArray(returns))
    returns.forEach((r, i) =>
      rm.set(
        String(isObj(r) && !('value' in r) ? (r.id ?? i) : i),
        isObj(r) && Array.isArray(r.series) ? r.series : r,
      ),
    );
  else if (isObj(returns)) for (const [k, v] of Object.entries(returns)) rm.set(k, v);
  const wsum = sum([...w.values()].filter(isNum));
  if (Math.abs(wsum - 1) > 0.005)
    warnings.push(`weights sum to ${wsum.toFixed(4)}, not 1 (cash or leverage not modelled)`);
  const seriesMode = [...rm.values()].some(Array.isArray);
  const held = [...w.entries()].filter(([, v]) => v);
  const missing = held.filter(([k]) => !rm.has(k)).map(([k]) => k);
  if (missing.length) warnings.push(`no returns for ${missing.join(', ')}; excluded`);
  if (!seriesMode) {
    const contributions = held
      .filter(([k]) => rm.has(k) && toNum(rm.get(k)) != null)
      .map(([k, v]) => ({
        id: k,
        weight: v,
        return: toNum(rm.get(k)),
        contribution: v * toNum(rm.get(k)),
      }));
    return metric(
      'portfolioReturn',
      {
        value: contributions.length ? sum(contributions.map((c) => c.contribution)) : null,
        unit: '%',
        method: 'sum of weight x asset return',
        warnings,
        contributions,
      },
      opts,
    );
  }
  const series = Object.fromEntries(
    held.filter(([k]) => rm.has(k)).map(([k]) => [k, toSeries(rm.get(k), warnings, k)]),
  );
  if (opts.asOf) {
    const refused = refuseLookAhead('portfolioReturn', series, opts.asOf, opts, {
      unit: '%',
      method: 'backtest',
    });
    if (refused) return refused;
  } else warnings.push('no asOf supplied: look-ahead not checked for this backtest');
  const al = alignPeriods(
    Object.entries(series).map(([name, s]) => ({ name, series: s })),
    {},
  );
  warnings.push(...al.notes);
  const names = al.value.names;
  const path = al.value.rows.map((r) => ({
    period: r.period,
    value: sum(r.values.map((v, i) => v * w.get(names[i]))),
  }));
  const cumulative = path.length
    ? (path.reduce((acc, p) => acc * (1 + p.value / 100), 1) - 1) * 100
    : null;
  return metric(
    'portfolioReturn',
    {
      value: cumulative,
      unit: '% cumulative',
      method:
        'constant weights rebalanced each period; period return = sum of weight x asset return; cumulative = product of (1 + r) - 1',
      periods: path.length ? [path[0].period, path[path.length - 1].period] : [],
      warnings,
      n: path.length,
      series: path,
      ...(opts.asOf ? { asOf: String(opts.asOf) } : {}),
    },
    opts,
  );
}

/**
 * Tracking error: sample standard deviation of portfolio minus benchmark returns (in %),
 * annualised by sqrt(periods per year) (opts.periodsPerYear or inferred from periods).
 */
export function trackingError(portfolioReturns, benchmarkReturns, opts = {}) {
  const warnings = [];
  const { x, y, periods, frequency } = pairUp(portfolioReturns, benchmarkReturns, warnings, [
    'portfolio',
    'benchmark',
  ]);
  const diff = x.map((v, i) => v - y[i]);
  const n = diff.length;
  if (n < MIN_SAMPLE.trackingError)
    warnings.push(smallSample('tracking error', n, MIN_SAMPLE.trackingError));
  const sd = stdev(diff);
  const ppy = toNum(opts.periodsPerYear) ?? PERIODS_PER_YEAR[frequency] ?? null;
  if (ppy == null) warnings.push('frequency unknown: tracking error left per period');
  return metric(
    'trackingError',
    {
      value: sd == null ? null : ppy ? sd * Math.sqrt(ppy) : sd,
      unit: ppy ? '% annualised' : '% per period',
      method: `sample standard deviation of active returns (portfolio minus benchmark)${ppy ? `, times sqrt(${ppy})` : ''}`,
      periods: periods.length ? [periods[0], periods[periods.length - 1]] : [],
      warnings,
      n,
      perPeriod: sd,
      meanActiveReturn: mean(diff),
    },
    opts,
  );
}

/**
 * Beta of an asset against a benchmark from aligned periodic returns, with standard error.
 * betaVs(assetReturns, benchmarkReturns, opts) or betaVs({ asset, benchmark }, opts).
 */
export function betaVs(asset, benchmark, opts = {}) {
  let a = asset;
  let b = benchmark;
  let o = opts;
  if (isObj(asset) && (asset.benchmark || asset.asset || asset.returns)) {
    a = asset.asset ?? asset.returns;
    b = asset.benchmark;
    o = isObj(benchmark) ? benchmark : opts;
  }
  const warnings = [];
  if (o.asOf) {
    const refused = refuseLookAhead(
      'betaVs',
      { asset: toSeries(a), benchmark: toSeries(b) },
      o.asOf,
      o,
      { unit: 'beta', method: 'OLS beta' },
    );
    if (refused) return refused;
  }
  const { x, y, periods } = pairUp(b, a, warnings, ['benchmark', 'asset']);
  const reg = regressionOLS(y, x, { names: ['benchmark'] });
  const n = x.length;
  if (n < MIN_SAMPLE.beta) warnings.push(smallSample('beta', n, MIN_SAMPLE.beta));
  const slope = reg.value?.coefficients?.find((c) => c.name === 'benchmark');
  const alpha = reg.value?.coefficients?.find((c) => c.name === 'intercept');
  if (!reg.value) warnings.push(...reg.warnings.filter((w) => !/association only/.test(w)));
  return metric(
    'betaVs',
    {
      value: slope ? slope.estimate : null,
      unit: 'beta',
      method:
        'OLS slope of asset returns on benchmark returns over aligned periods; classical standard error',
      periods: periods.length ? [periods[0], periods[periods.length - 1]] : [],
      warnings,
      n,
      se: slope?.se ?? null,
      tStat: slope?.tStat ?? null,
      alpha: alpha?.estimate ?? null,
      rSquared: reg.value?.rSquared ?? null,
    },
    o,
  );
}

/**
 * Historical value at risk: the loss not exceeded with the given confidence (alpha 0.95 or
 * 0.05 both mean 95%), from the empirical quantile of returns (linear interpolation), plus
 * expected shortfall. Returned as positive loss in the returns' unit.
 */
export function varHistorical(returns, alpha = 0.95, opts = {}) {
  const warnings = ['historical, not forward-looking'];
  const s = toSeries(returns, warnings, 'returns');
  if (opts.asOf) {
    const refused = refuseLookAhead('varHistorical', { returns: s }, opts.asOf, opts, {
      unit: '%',
      method: 'historical VaR',
    });
    if (refused) return refused;
  }
  const a = toNum(alpha) ?? 0.95;
  const conf = a > 0.5 ? a : 1 - a;
  const vals = s.map((p) => p.value);
  const n = vals.length;
  if (n * (1 - conf) < 5)
    warnings.push(
      `only ${n} observations: fewer than 5 fall in the ${((1 - conf) * 100).toFixed(1)}% tail, so the estimate is fragile`,
    );
  if (n < 2)
    return metric(
      'varHistorical',
      {
        value: null,
        unit: '%',
        method: 'historical VaR',
        warnings: [...warnings, 'needs returns'],
        n,
      },
      opts,
    );
  const q = quantile(vals, 1 - conf);
  const tail = vals.filter((v) => v <= q);
  return metric(
    'varHistorical',
    {
      value: -q,
      unit: '% loss (positive = loss)',
      method: `negative of the ${((1 - conf) * 100).toFixed(1)}th percentile of historical returns (linear interpolation); expected shortfall = mean of returns at or below it`,
      periods: firstLast(s),
      warnings,
      n,
      confidence: conf,
      expectedShortfall: tail.length ? -mean(tail) : null,
    },
    opts,
  );
}

/**
 * Stress loss under stated hypothetical shocks. holdings: [{ id|ticker, value | weight,
 * sector, assetClass, beta }]. shocks (in %): { byId, bySector, byAssetClass, market }
 * (market applied through beta, default 1), or an array of named scenarios
 * [{ name, ...shocks }]. Precedence: id, sector, asset class, market.
 */
export function stressTest(holdings, shocks, opts = {}) {
  const hs = (holdings || []).map((h, i) => ({
    id: String(h.id ?? h.ticker ?? h.name ?? i),
    exposure: toNum(h.value ?? h.marketValue ?? h.market_value ?? h.weight),
    sector: h.sector ?? null,
    assetClass: h.assetClass ?? h.asset_class ?? null,
    beta: toNum(h.beta),
  }));
  const run = (sc) => {
    const unshocked = [];
    const byHolding = hs.map((h) => {
      let shock = null;
      let source = null;
      if (sc.byId && toNum(sc.byId[h.id]) != null) [shock, source] = [toNum(sc.byId[h.id]), 'id'];
      else if (sc.bySector && h.sector && toNum(sc.bySector[h.sector]) != null)
        [shock, source] = [toNum(sc.bySector[h.sector]), 'sector'];
      else if (sc.byAssetClass && h.assetClass && toNum(sc.byAssetClass[h.assetClass]) != null)
        [shock, source] = [toNum(sc.byAssetClass[h.assetClass]), 'asset class'];
      else if (toNum(sc.market) != null)
        [shock, source] = [
          toNum(sc.market) * (h.beta ?? 1),
          h.beta != null ? 'market x beta' : 'market (beta 1 assumed)',
        ];
      if (shock == null) unshocked.push(h.id);
      const pnl = shock == null || h.exposure == null ? 0 : (h.exposure * shock) / 100;
      return { id: h.id, exposure: h.exposure, shockPct: shock, source, pnl };
    });
    const exposure = sum(hs.map((h) => h.exposure ?? 0));
    const pnl = sum(byHolding.map((b) => b.pnl));
    return {
      name: sc.name ?? 'scenario',
      pnl,
      pnlPct: exposure ? (pnl / exposure) * 100 : null,
      byHolding,
      unshocked,
    };
  };
  const warnings = ['hypothetical shocks: a stress result is not a forecast'];
  const scenarios = (Array.isArray(shocks) ? shocks : [shocks || {}]).map(run);
  for (const s of scenarios)
    if (s.unshocked.length)
      warnings.push(`${s.name}: no shock for ${s.unshocked.join(', ')} (treated as unchanged)`);
  if (hs.some((h) => h.exposure == null)) warnings.push('some holdings have no value or weight');
  const single = scenarios.length === 1;
  return metric(
    'stressTest',
    {
      value: single
        ? { pnl: scenarios[0].pnl, pnlPct: scenarios[0].pnlPct, byHolding: scenarios[0].byHolding }
        : { scenarios },
      unit: 'currency of holdings (pnl) and % of exposure',
      method:
        'exposure x shock per holding; shock precedence id, sector, asset class, market x beta; summed',
      warnings,
      n: hs.length,
    },
    opts,
  );
}

/** Effective number of positions: 1 / sum of squared weights (weights normalised to sum 1). */
export function effectiveNumberOfPositions(weights, opts = {}) {
  const warnings = [];
  const ws = (
    Array.isArray(weights)
      ? weights.map((w) => (isObj(w) ? toNum(w.weight ?? w.value) : toNum(w)))
      : Object.values(weights || {}).map(toNum)
  ).filter(isNum);
  const neg = ws.filter((w) => w < 0).length;
  if (neg) warnings.push(`${neg} short (negative) weight(s) excluded`);
  const pos = ws.filter((w) => w >= 0);
  const tot = sum(pos);
  if (!(tot > 0))
    return metric(
      'effectiveNumberOfPositions',
      {
        value: null,
        unit: 'positions',
        method: '1 / sum of squared weights',
        warnings: [...warnings, 'needs positive weights'],
      },
      opts,
    );
  if (Math.abs(tot - 1) > 0.005)
    warnings.push(`weights summed to ${tot.toFixed(4)} and were normalised to 1`);
  const hhi = sum(pos.map((w) => (w / tot) ** 2));
  return metric(
    'effectiveNumberOfPositions',
    {
      value: 1 / hhi,
      unit: 'positions',
      method: '1 / sum of squared weights',
      warnings,
      n: pos.length,
      herfindahl: hhi,
    },
    opts,
  );
}

/* ================================================================== commodities and food */

const unitBase = (u) =>
  String(u || '')
    .toLowerCase()
    .replace(/\s*(\/|per)\s*(d|day|month|mo|m)\b.*$/, '')
    .trim();

/**
 * Balance = production - demand. stocks: the stock change over the period (build positive),
 * or a stocks series (change = last - previous). residual = balance - stock build (trade,
 * refinery gains, statistical difference). Units must match (opts.units or each input's unit).
 */
export function supplyDemandBalance(prod, demand, stocks = null, opts = {}) {
  const warnings = [];
  const p = latestOf(prod);
  const d = latestOf(demand);
  const pu = isObj(prod) ? prod.unit : null;
  const du = isObj(demand) ? demand.unit : null;
  if (pu && du && pu !== du)
    return metric(
      'supplyDemandBalance',
      {
        value: null,
        unit: pu,
        method: 'production - demand',
        warnings: [`units differ (${pu} vs ${du}); not combined`],
      },
      opts,
    );
  if (!p || !d)
    return metric(
      'supplyDemandBalance',
      {
        value: null,
        unit: pu || opts.unit || null,
        method: 'production - demand',
        warnings: ['production and demand are required'],
      },
      opts,
    );
  if (p.period && d.period && p.period !== d.period)
    warnings.push(`production is for ${p.period} and demand for ${d.period}; periods differ`);
  let build = null;
  if (Array.isArray(stocks)) {
    const s = toSeries(stocks, warnings, 'stocks');
    if (s.length >= 2) build = s[s.length - 1].value - s[s.length - 2].value;
  } else if (stocks != null) build = toNum(stocks);
  if (opts.approximation || opts.crudeVsProducts)
    warnings.push(
      'crude production against total products demand is an approximation (ignores product trade and refinery gains)',
    );
  const balance = p.value - d.value;
  return metric(
    'supplyDemandBalance',
    {
      value: balance,
      unit: pu || opts.unit || null,
      method:
        'production - demand; residual = balance - stock build (trade and statistical difference)',
      periods: [p.period, d.period],
      warnings,
      stockBuild: build,
      residual: build == null ? null : balance - build,
    },
    opts,
  );
}

const daysInMonth = (period) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(period || ''));
  return m ? new Date(Date.UTC(+m[1], +m[2], 0)).getUTCDate() : null;
};

/**
 * Days of cover = stocks / daily demand. demand is a daily rate unless opts.demandPer is
 * 'month' (converted using the days in the demand's month, or opts.days). Unit bases must
 * match (kb with kb/d; million m3 with million m3 a month).
 */
export function daysOfCover(stocks, demand, opts = {}) {
  const warnings = [];
  const s = latestOf(stocks);
  const d = latestOf(demand);
  const su = isObj(stocks) ? stocks.unit : opts.stocksUnit;
  const du = isObj(demand) ? demand.unit : opts.demandUnit;
  if (su && du && unitBase(su) !== unitBase(du))
    return metric(
      'daysOfCover',
      {
        value: null,
        unit: 'days',
        method: 'stocks / daily demand',
        warnings: [`units do not match (${su} vs ${du})`],
      },
      opts,
    );
  if (!s || !d || !(d.value > 0))
    return metric(
      'daysOfCover',
      {
        value: null,
        unit: 'days',
        method: 'stocks / daily demand',
        warnings: ['stocks and positive demand are required'],
      },
      opts,
    );
  let daily = d.value;
  if (/month/i.test(String(opts.demandPer || du || ''))) {
    const days = toNum(opts.days) ?? daysInMonth(d.period);
    if (!days)
      return metric(
        'daysOfCover',
        {
          value: null,
          unit: 'days',
          method: 'stocks / daily demand',
          warnings: ['monthly demand needs a YYYY-MM period or opts.days'],
        },
        opts,
      );
    daily = d.value / days;
  }
  if (s.period && d.period && s.period !== d.period)
    warnings.push(`stocks are for ${s.period} and demand for ${d.period}`);
  if (opts.approximation) warnings.push('crude stocks over products demand is an approximation');
  return metric(
    'daysOfCover',
    {
      value: s.value / daily,
      unit: 'days',
      method: 'stocks / daily demand (monthly demand divided by days in month)',
      periods: [s.period, d.period],
      warnings,
      dailyDemand: daily,
    },
    opts,
  );
}

/**
 * Ezana simple seasonal adjustment: ratio (or difference, for series with non-positive
 * values or opts.additive) to a centred 2 x P moving average; seasonal factors are the mean
 * ratio per calendar month (or quarter), normalised. Needs consecutive periods and at least
 * two full cycles (three recommended). Never official seasonally adjusted data.
 */
export function seasonalAdjustSimple(series, opts = {}) {
  const warnings = ['Ezana simple seasonal adjustment, not official seasonally adjusted data'];
  const s = toSeries(series, warnings, 'series');
  const f = seriesFreq(s);
  const P = f === 'quarterly' ? 4 : f === 'monthly' ? 12 : toNum(opts.period);
  const method = 'ratio to centred 2 x P moving average; mean factor per season, normalised';
  if (!P || (f !== 'monthly' && f !== 'quarterly' && !opts.period))
    return metric(
      'seasonalAdjustSimple',
      {
        value: null,
        unit: null,
        method,
        warnings: [...warnings, 'needs a monthly or quarterly series with periods'],
      },
      opts,
    );
  if (f === 'monthly' || f === 'quarterly') {
    for (let i = 1; i < s.length; i += 1) {
      const gap = monthsBetween(s[i - 1].period, s[i].period);
      if (gap !== (f === 'quarterly' ? 3 : 1))
        return metric(
          'seasonalAdjustSimple',
          {
            value: null,
            unit: null,
            method,
            warnings: [
              ...warnings,
              `gap between ${s[i - 1].period} and ${s[i].period}; not adjusted (no filling)`,
            ],
          },
          opts,
        );
    }
  }
  if (s.length < 2 * P)
    return metric(
      'seasonalAdjustSimple',
      {
        value: null,
        unit: null,
        method,
        warnings: [...warnings, `needs at least ${2 * P} observations; ${s.length} available`],
        n: s.length,
      },
      opts,
    );
  if (s.length < MIN_SAMPLE.seasonalCycles * P)
    warnings.push(
      `fewer than ${MIN_SAMPLE.seasonalCycles} full cycles: seasonal factors are rough`,
    );
  const additive = opts.additive || s.some((p) => p.value <= 0);
  const v = s.map((p) => p.value);
  const h = P / 2;
  const season = (i) => {
    const per = s[i].period;
    if (f === 'monthly') return Number(per.slice(5, 7)) - 1;
    if (f === 'quarterly') return Number(per.slice(-1)) - 1;
    return i % P;
  };
  const ratios = Array.from({ length: P }, () => []);
  for (let i = h; i + h < v.length; i += 1) {
    const cma = (0.5 * v[i - h] + sum(v.slice(i - h + 1, i + h)) + 0.5 * v[i + h]) / P;
    ratios[season(i)].push(additive ? v[i] - cma : v[i] / cma);
  }
  let factors = ratios.map((r) => (r.length ? mean(r) : additive ? 0 : 1));
  const fm = mean(factors);
  factors = factors.map((x) => (additive ? x - fm : x / fm));
  const adjusted = s.map((p, i) => ({
    period: p.period,
    value: additive ? p.value - factors[season(i)] : p.value / factors[season(i)],
  }));
  return metric(
    'seasonalAdjustSimple',
    {
      value: adjusted[adjusted.length - 1].value,
      unit: isObj(series?.[0]) ? (series[0].unit ?? null) : null,
      method: `${additive ? 'additive' : 'multiplicative'} ${method}`,
      periods: firstLast(s),
      warnings,
      n: s.length,
      factors,
      series: adjusted,
    },
    opts,
  );
}

/**
 * Import dependency = net imports / consumption, in %. imports: net imports, or
 * { imports, exports }; opts.exports also accepted. Negative = net exporter.
 */
export function importDependency(imports, consumption, opts = {}) {
  const warnings = [];
  let net;
  let ip = null;
  if (isObj(imports) && (imports.imports != null || imports.exports != null)) {
    net = (toNum(imports.imports) ?? 0) - (toNum(imports.exports) ?? 0);
    ip = imports.period ?? periodOf(imports.imports);
  } else {
    const im = latestOf(imports);
    net = im ? im.value - (toNum(opts.exports) ?? 0) : null;
    ip = im?.period ?? null;
  }
  const c = latestOf(consumption);
  if (net == null || !c || !(c.value > 0))
    return metric(
      'importDependency',
      {
        value: null,
        unit: '%',
        method: 'net imports / consumption',
        warnings: ['imports and positive consumption are required'],
      },
      opts,
    );
  if (ip && c.period && String(ip) !== String(c.period))
    warnings.push(`imports are for ${ip} and consumption for ${c.period}; periods differ`);
  const value = (net / c.value) * 100;
  if (value < 0) warnings.push('net exporter: dependency is negative');
  return metric(
    'importDependency',
    {
      value,
      unit: '%',
      method: 'net imports (imports - exports) / consumption',
      periods: [ip, c.period],
      warnings,
      netImports: net,
    },
    opts,
  );
}

/* ================================================================== existing engine functions */

/**
 * Is an IMF WEO value actual, an IMF staff estimate or a projection (weo-status.js and the
 * appendix reference table), as a metric: value 'actual' | 'estimate' | 'projection' | 'unknown'.
 */
export function weoStatus(iso3, indicatorGroup, year, opts = {}) {
  const status = weoStatusOf(iso3, indicatorGroup, year, { now: opts.now || new Date() });
  const last = weoLatestActual(iso3, indicatorGroup);
  return metric(
    'weoStatus',
    {
      value: status,
      unit: 'label',
      method: `compared with the country's last actual year for ${indicatorGroup} (IMF WEO ${WEO_VINTAGE || ''} Database Appendix); the current year and later are projections`,
      periods: [String(year)],
      warnings:
        status === 'unknown' ? ['country or indicator group not in the reference table'] : [],
      lastActual: last,
    },
    opts,
  );
}

/** Currency pressure classification (macro/playbook.js, Ezana's thresholds), as a metric. */
export function assessCurrencyPressure(metrics = {}, opts = {}) {
  const res = playbookAssessCurrencyPressure(metrics);
  return metric(
    'assessCurrencyPressure',
    {
      value: res,
      unit: 'pressure level (low, moderate, elevated, severe)',
      method:
        "Ezana's thresholds (CURRENCY_THRESHOLDS, macro/playbook.js); overall anchored on depreciation",
      warnings: res.missing?.length ? [`not assessed: ${res.missing.join('; ')}`] : [],
    },
    opts,
  );
}

/** FEWS NET country medians by product (macro/catalog.js aggregateFews), as a metric. */
export function aggregateFews(rows, opts = {}) {
  const res = catalogAggregateFews(rows);
  return metric(
    'aggregateFews',
    {
      value: res,
      unit: 'local currency per unit (median retail price)',
      method:
        'median retail price across markets reporting in the latest month; year-ago median only when at least half the markets have one (macro/catalog.js)',
      periods: [...new Set(res.map((r) => r.period))],
      warnings: res.length ? [] : ['no FEWS NET retail rows'],
      n: res.length,
    },
    opts,
  );
}

/* ================================================================== registry */

/** Every engine function by name, so evaluations can verify each `mustCompute` exists. */
/* ================================================================== activity over time */

/* Standard normal CDF (Abramowitz and Stegun 7.1.26 erf; error under 1.5e-7). */
function normalCdf(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/**
 * Two-proportion z test: did a share (purchases among purchases and sales) change between
 * two periods? a, b: { x, n }. Returns z (b minus a), the two-sided p-value and the change in
 * percentage points. Observations are treated as independent; when they cluster (trades by
 * the same member) the p-value overstates certainty, and a warning says so.
 */
export function twoProportionZ(a, b, opts = {}) {
  const x1 = toNum(a?.x);
  const n1 = toNum(a?.n);
  const x2 = toNum(b?.x);
  const n2 = toNum(b?.n);
  const warnings = [];
  if (!(n1 > 0) || !(n2 > 0) || x1 == null || x2 == null)
    return metric(
      'twoProportionZ',
      {
        value: null,
        unit: 'z',
        method: 'two-proportion z test',
        warnings: ['needs x and n for both periods'],
      },
      opts,
    );
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  if (n1 < 30 || n2 < 30) warnings.push(`small sample (n = ${n1}, ${n2})`);
  if (opts.clustered !== false)
    warnings.push('observations may cluster by member; treat the p-value as indicative');
  const z = se > 0 ? (p2 - p1) / se : null;
  return metric(
    'twoProportionZ',
    {
      value: z,
      unit: 'z',
      method: '(p2 - p1) / sqrt(p(1 - p)(1/n1 + 1/n2)), pooled p',
      warnings,
      p1,
      p2,
      changePp: (p2 - p1) * 100,
      pValue: z == null ? null : 2 * (1 - normalCdf(Math.abs(z))),
    },
    opts,
  );
}

/**
 * Splits a change in a total into a change in units and a change in intensity, on logs:
 * ln(T1/T0) = ln(U1/U0) + ln(I1/I0), I = T / U. For trades: members trading and trades per
 * member. Returns the log change of the total and each part's share of it (shares sum to 1;
 * a part moving against the total gets a negative share).
 */
export function logChangeDecomposition(p0, p1, opts = {}) {
  const t0 = toNum(p0?.total);
  const u0 = toNum(p0?.units);
  const t1 = toNum(p1?.total);
  const u1 = toNum(p1?.units);
  if (!(t0 > 0) || !(u0 > 0) || !(t1 > 0) || !(u1 > 0))
    return metric(
      'logChangeDecomposition',
      {
        value: null,
        unit: 'log',
        method: 'ln(T1/T0) = ln(U1/U0) + ln(I1/I0)',
        warnings: ['needs positive totals and units'],
      },
      opts,
    );
  const total = Math.log(t1 / t0);
  const units = Math.log(u1 / u0);
  const intensity = Math.log(t1 / u1 / (t0 / u0));
  const warnings = [];
  if (Math.abs(total) < 0.02) warnings.push('total barely changed; shares are unstable');
  return metric(
    'logChangeDecomposition',
    {
      value: total,
      unit: 'log',
      method: 'ln(T1/T0) = ln(U1/U0) + ln(I1/I0), I = T / U',
      warnings,
      unitsLog: units,
      intensityLog: intensity,
      unitsShare: total !== 0 ? units / total : null,
      intensityShare: total !== 0 ? intensity / total : null,
    },
    opts,
  );
}

export const QUANT = Object.freeze({
  weoStatus,
  pctChange,
  bothConventionsFx,
  annualise,
  yoyFromIndex,
  momChange,
  cagr,
  rollingVolatility,
  percentileVsHistory,
  zScore,
  drawdown,
  correlation,
  regressionOLS,
  eventStudy,
  alignPeriods,
  realRateExPost,
  reserveCoverMonths,
  shortTermDebtCover,
  debtDynamics,
  dcf,
  wacc,
  evToEquity,
  multiples,
  marginDecomposition,
  cashConversion,
  herfindahl,
  concentrationTopN,
  positionChange13F,
  dedupeHoldings,
  contractObligationsByFY,
  awardCeilingVsObligated,
  lobbyingSpendByQuarter,
  tradeRangeMidpoint,
  disclosureLagDays,
  impliedProbability,
  overround,
  brierScore,
  portfolioReturn,
  trackingError,
  betaVs,
  varHistorical,
  stressTest,
  effectiveNumberOfPositions,
  supplyDemandBalance,
  daysOfCover,
  seasonalAdjustSimple,
  importDependency,
  assessCurrencyPressure,
  aggregateFews,
  twoProportionZ,
  logChangeDecomposition,
});

export const QUANT_NAMES = Object.freeze(Object.keys(QUANT).sort());
