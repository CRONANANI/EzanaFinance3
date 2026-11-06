/**
 * Country & Currency Intelligence: deterministic computations (Nov 2026). Pure.
 *
 * Code computes every number the brief states; the model writes the judgement. Inputs are
 * series histories ([{ period, value }], oldest first) chosen by the macro catalogue:
 *
 *   fx         local currency per US dollar (daily or monthly)
 *   fxMonthly  a monthly series for the five-year view when `fx` is daily (optional)
 *   reer       real effective exchange rate index
 *   inflation  { history, mode: 'index' | 'rate' }  (an index is turned into y/y here)
 *   policy     policy rate, % a year
 *   reserves   official reserves (any unit), imports (monthly goods imports, US$) optional
 *   external   { currentAccount, externalDebt, portfolio }  latest rows ({ value, period })
 *   risk       GPR or WUI history; governance latest rows
 *
 * Every figure carries its period. A measure older than its freshness window is marked
 * "not current". The real rate is ex-post (policy minus latest annual inflation) and is
 * always labelled so.
 */
import { assessCurrencyPressure } from './playbook.js';
import { periodLabel, periodEnd, fmtNum } from './catalog.js';

/* ------------------------------------------------------------------ helpers */

const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
/** An exchange rate as quoted: two decimals below 1,000, whole units above. */
export const fmtRate = (v) =>
  n(v) == null ? null : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2);
/** 83 -> '83rd'. */
export const ordinal = (k) => {
  const v = Math.round(k);
  const sfx = ['th', 'st', 'nd', 'rd'];
  const m = v % 100;
  return `${v}${sfx[(m - 20) % 10] || sfx[m] || sfx[0]}`;
};
const withUnit = (val, unit) =>
  unit ? (unit.startsWith('%') ? `${val}${unit}` : `${val} ${unit}`) : val;
const round = (v, d = 2) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);

/** Percent more local currency a dollar costs (old -> now). */
export const dollarDearerPct = (old, now) => (n(old) && n(now) ? (now / old - 1) * 100 : null);
/** Percent of its dollar value the currency lost (old -> now): 1 - old/new. */
export const valueLostPct = (old, now) => (n(old) && n(now) ? (1 - old / now) * 100 : null);

const clean = (history) =>
  (history || [])
    .filter((p) => p && n(Number(p.value)) != null && p.period)
    .map((p) => ({ period: String(p.period), value: Number(p.value) }))
    .sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));

const isDaily = (h) => h.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(h[h.length - 1].period);

/** The observation at or before `months` before the latest one. */
export function valueMonthsBefore(history, months) {
  const h = clean(history);
  if (!h.length) return null;
  const last = periodEnd(h[h.length - 1].period);
  if (!last) return null;
  const target = new Date(
    Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - months, last.getUTCDate()),
  );
  let hit = null;
  for (const p of h) {
    const e = periodEnd(p.period);
    if (e && e <= target) hit = p;
  }
  return hit;
}

const stdev = (xs) => {
  const a = xs.filter((x) => n(x) != null);
  if (a.length < 2) return null;
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};
const median = (xs) => {
  const a = xs.filter((x) => n(x) != null).sort((p, q) => p - q);
  if (!a.length) return null;
  const k = Math.floor(a.length / 2);
  return a.length % 2 ? a[k] : (a[k - 1] + a[k]) / 2;
};
/** Share of observations at or below `v`, 0 to 100. */
export function percentileOf(values, v) {
  const a = values.filter((x) => n(x) != null);
  if (a.length < 12 || n(v) == null) return null;
  return (a.filter((x) => x <= v).length / a.length) * 100;
}

/* ------------------------------------------------------------------ freshness */

/** Days a measure stays current. */
export const FRESHNESS_DAYS = { fx: 10, fxMonthly: 45, cpi: 75, policy: 45, reserves: 75 };

/** 'current' | 'not current' for a period, by measure kind. */
export function freshness(period, kind, now = new Date()) {
  const end = periodEnd(period);
  if (!end) return null;
  const days = (now - end) / 864e5;
  return days <= (FRESHNESS_DAYS[kind] ?? 75) ? 'current' : 'not current';
}

/* ------------------------------------------------------------------ components */

/** Exchange rate: now, 1M, 3M, 1Y, 5Y ago, both conventions, pace and volatility. */
export function fxMetrics(fxHistory, { monthly = null, now = new Date() } = {}) {
  const h = clean(fxHistory);
  if (!h.length) return null;
  const latest = h[h.length - 1];
  const daily = isDaily(h);
  const longH = monthly && clean(monthly).length ? clean(monthly) : h;
  const change = (months, src = h) => {
    const old = valueMonthsBefore(src, months);
    if (!old) return null;
    const base = src === h ? latest : src[src.length - 1];
    return {
      fromPeriod: old.period,
      from: old.value,
      toPeriod: base.period,
      to: base.value,
      /* Three decimals here, one in the copy: 15.046 must read 15.0, not 15.05 -> 15.1. */
      dollarDearerPct: round(dollarDearerPct(old.value, base.value), 3),
      valueLostPct: round(valueLostPct(old.value, base.value), 3),
    };
  };
  const m1 = change(1);
  const m3 = change(3);
  const y1 = change(12);
  const y5 = change(60, longH);
  const annualised3m =
    m3 && m3.valueLostPct != null
      ? round((1 - Math.pow(1 - m3.valueLostPct / 100, 4)) * 100)
      : null;
  /* Volatility: stdev of period-on-period % changes over the last 3 months, against the
     median of the same measure over rolling 3-month windows in five years. */
  const chg = h.slice(1).map((p, i) => ({ period: p.period, c: (p.value / h[i].value - 1) * 100 }));
  const cutoff = valueMonthsBefore(h, 3)?.period;
  const recent = cutoff ? chg.filter((x) => x.period > cutoff).map((x) => x.c) : [];
  const vol3m = stdev(recent);
  const windows = [];
  const step = daily ? 63 : 3;
  for (let i = step; i <= chg.length; i += daily ? 21 : 1)
    windows.push(stdev(chg.slice(i - step, i).map((x) => x.c)));
  const volMedian = median(windows.slice(-(daily ? 60 : 60)));
  return {
    latest: { period: latest.period, value: latest.value },
    frequency: daily ? 'daily' : 'monthly',
    m1,
    m3,
    y1,
    y5,
    annualised3mValueLostPct: annualised3m,
    volatility3m: round(vol3m, 3),
    volatility5yMedian: round(volMedian, 3),
    freshness: freshness(latest.period, daily ? 'fx' : 'fxMonthly', now),
  };
}

/** Real effective exchange rate: 1-year change and own-history percentile. */
export function reerMetrics(reerHistory) {
  const h = clean(reerHistory);
  if (!h.length) return null;
  const latest = h[h.length - 1];
  const ya = valueMonthsBefore(h, 12);
  return {
    latest,
    yearAgo: ya,
    change1yPct: ya ? round((latest.value / ya.value - 1) * 100) : null,
    percentile: round(
      percentileOf(
        h.map((p) => p.value),
        latest.value,
      ),
      0,
    ),
    since: h[0].period,
  };
}

/** y/y series from a monthly index history. */
export function yoyFromIndexHistory(indexHistory) {
  const h = clean(indexHistory);
  const byPeriod = new Map(h.map((p) => [p.period, p.value]));
  const out = [];
  for (const p of h) {
    const m = /^(\d{4})-(\d{2})$/.exec(p.period);
    if (!m) continue;
    const prev = byPeriod.get(`${Number(m[1]) - 1}-${m[2]}`);
    if (prev) out.push({ period: p.period, value: (p.value / prev - 1) * 100 });
  }
  return out;
}

/** Inflation: annual rate, latest month-on-month, 12-month trend, 5-year peak. */
export function inflationMetrics({ history, mode = 'rate' } = {}, { now = new Date() } = {}) {
  const raw = clean(history);
  if (!raw.length) return null;
  const yoy = mode === 'index' ? yoyFromIndexHistory(raw) : raw;
  if (!yoy.length) return null;
  const latest = yoy[yoy.length - 1];
  const ya = valueMonthsBefore(yoy, 12);
  let mom = null;
  if (mode === 'index' && raw.length >= 2) {
    const a = raw[raw.length - 2];
    const b = raw[raw.length - 1];
    if (/^\d{4}-\d{2}$/.test(b.period))
      mom = { period: b.period, value: round((b.value / a.value - 1) * 100) };
  }
  const five = valueMonthsBefore(yoy, 60)?.period;
  const window = five ? yoy.filter((p) => p.period >= five) : yoy;
  const peak = window.reduce((m, p) => (!m || p.value > m.value ? p : m), null);
  return {
    annual: { period: latest.period, value: round(latest.value) },
    annualYearAgo: ya ? { period: ya.period, value: round(ya.value) } : null,
    trend: ya
      ? latest.value < ya.value
        ? 'falling'
        : latest.value > ya.value
          ? 'rising'
          : 'flat'
      : null,
    monthOnMonth: mom,
    peak5y: peak ? { period: peak.period, value: round(peak.value) } : null,
    series: yoy.map((p) => ({ period: p.period, value: round(p.value) })),
    computedFromIndex: mode === 'index',
    freshness: freshness(latest.period, 'cpi', now),
  };
}

/** Policy rate: level, 12-month change, last change, ex-post real rate. */
export function policyMetrics(policyHistory, inflationAnnual = null, { now = new Date() } = {}) {
  const h = clean(policyHistory);
  if (!h.length) return null;
  const latest = h[h.length - 1];
  const ya = valueMonthsBefore(h, 12);
  let lastChange = null;
  for (let i = h.length - 1; i > 0; i -= 1) {
    if (h[i].value !== h[i - 1].value) {
      lastChange = { period: h[i].period, from: h[i - 1].value, to: h[i].value };
      break;
    }
  }
  const real = n(inflationAnnual) != null ? round(latest.value - inflationAnnual) : null;
  return {
    level: latest,
    yearAgo: ya,
    change12mPp: ya ? round(latest.value - ya.value) : null,
    lastChange,
    expostRealRatePp: real,
    realRateNote:
      'ex-post: policy rate minus latest annual inflation, not a forward-looking real rate',
    freshness: freshness(latest.period, 'policy', now),
  };
}

/** Reserves: level, ~3-month change, months of imports when imports are given. */
export function reservesMetrics(
  reservesHistory,
  { importsMonthlyUsd = null, unitToUsd = 1, now = new Date() } = {},
) {
  const h = clean(reservesHistory);
  if (!h.length) return null;
  const latest = h[h.length - 1];
  const m3 = valueMonthsBefore(h, 3);
  const months =
    n(importsMonthlyUsd) && importsMonthlyUsd > 0
      ? round((latest.value * unitToUsd) / importsMonthlyUsd, 1)
      : null;
  return {
    level: latest,
    threeMonthsAgo: m3,
    change3mPct: m3 ? round((latest.value / m3.value - 1) * 100) : null,
    importMonths: months,
    freshness: freshness(latest.period, 'reserves', now),
  };
}

/** Stress: GPR or WUI own-history percentile. */
export function stressMetrics(riskHistory, label) {
  const h = clean(riskHistory);
  if (!h.length) return null;
  const latest = h[h.length - 1];
  return {
    label,
    latest,
    percentile: round(
      percentileOf(
        h.map((p) => p.value),
        latest.value,
      ),
      0,
    ),
  };
}

/* ------------------------------------------------------------------ the whole picture */

/**
 * All components -> { metrics, assessment, statements, kpis, missing }.
 * `currency` = { code, name } and `place` = the country's name, for the wording.
 */
export function buildCurrencyPicture(
  input = {},
  { currency = null, place = '', now = new Date() } = {},
) {
  const fx = input.fx ? fxMetrics(input.fx, { monthly: input.fxMonthly, now }) : null;
  const reer = input.reer ? reerMetrics(input.reer) : null;
  const infl = input.inflation ? inflationMetrics(input.inflation, { now }) : null;
  const policy = input.policy
    ? policyMetrics(input.policy, infl?.annual?.value ?? null, { now })
    : null;
  const reserves = input.reserves
    ? reservesMetrics(input.reserves, {
        importsMonthlyUsd: input.importsMonthlyUsd,
        unitToUsd: input.reservesUnitToUsd || 1,
        now,
      })
    : null;
  const risk = input.risk
    ? stressMetrics(input.risk, input.riskLabel || 'geopolitical risk')
    : null;
  const ext = input.external || {};

  const assessment = assessCurrencyPressure({
    fxNow: fx?.y1?.to ?? fx?.latest?.value,
    fxYearAgo: fx?.y1?.from,
    fx3mAgo: fx?.m3?.from,
    inflationAnnual: infl?.annual?.value,
    inflationAnnualYearAgo: infl?.annualYearAgo?.value,
    policyRate: policy?.level?.value,
    policyRateChange1y: policy?.change12mPp,
    reservesNow: reserves?.level?.value,
    reserves3mAgo: reserves?.threeMonthsAgo?.value,
    reserveImportMonths: reserves?.importMonths,
    currentAccountPctGdp: n(ext.currentAccount?.value),
    riskPercentile: risk?.percentile,
  });

  const cur = currency?.short || currency?.name || 'currency';
  const code = currency?.code || '';
  const statements = [];
  if (fx?.y1) {
    statements.push(
      `${code || 'Local currency'} per US dollar, ${periodLabel(fx.y1.toPeriod)}: ${fmtRate(fx.y1.to)}; ${periodLabel(fx.y1.fromPeriod)}: ${fmtRate(fx.y1.from)}. Over the year the dollar costs ${fmtNum(fx.y1.dollarDearerPct)}% more in ${cur}, and the ${cur} lost ${fmtNum(fx.y1.valueLostPct)}% of its dollar value.` +
        (fx.m3
          ? ` Over three months (since ${periodLabel(fx.m3.fromPeriod)}) the ${cur} lost ${fmtNum(fx.m3.valueLostPct)}%, an annualised pace of ${fmtNum(fx.annualised3mValueLostPct)}%.`
          : '') +
        (fx.y5
          ? ` Over five years (since ${periodLabel(fx.y5.fromPeriod)}) the dollar costs ${fmtNum(fx.y5.dollarDearerPct)}% more and the ${cur} lost ${fmtNum(fx.y5.valueLostPct)}% of its dollar value.`
          : '') +
        (fx.volatility3m != null && fx.volatility5yMedian != null
          ? ` The standard deviation of ${fx.frequency} percentage changes over the last three months is ${fmtNum(fx.volatility3m)}, against a five-year median of ${fmtNum(fx.volatility5yMedian)} for the same measure${fx.volatility3m < fx.volatility5yMedian ? ' (calmer than usual)' : ' (more volatile than usual)'}.`
          : ''),
    );
  }
  if (reer?.change1yPct != null) {
    statements.push(
      `Real effective exchange rate (index), ${periodLabel(reer.latest.period)}: ${fmtNum(reer.latest.value)}, against ${fmtNum(reer.yearAgo.value)} in ${periodLabel(reer.yearAgo.period)} (${reer.change1yPct >= 0 ? 'up' : 'down'} ${fmtNum(Math.abs(reer.change1yPct))}%).` +
        (reer.percentile != null
          ? ` It sits at the ${ordinal(reer.percentile)} percentile of its own history since ${periodLabel(reer.since)}; a high percentile means the currency is strong in real terms against its own past.`
          : ''),
    );
  }
  if (infl) {
    statements.push(
      `Annual inflation, ${periodLabel(infl.annual.period)}: ${fmtNum(infl.annual.value)}%${infl.computedFromIndex ? ' (computed from the consumer price index, change on a year earlier)' : ''}` +
        (infl.annualYearAgo
          ? `, ${infl.trend} from ${fmtNum(infl.annualYearAgo.value)}% in ${periodLabel(infl.annualYearAgo.period)}`
          : '') +
        '.' +
        (infl.monthOnMonth
          ? ` Latest month on month (${periodLabel(infl.monthOnMonth.period)}): ${fmtNum(infl.monthOnMonth.value)}%.`
          : '') +
        (infl.peak5y
          ? ` Five-year peak: ${fmtNum(infl.peak5y.value)}% in ${periodLabel(infl.peak5y.period)}.`
          : ''),
    );
  }
  if (policy) {
    statements.push(
      `Policy rate, ${periodLabel(policy.level.period)}: ${fmtNum(policy.level.value)}%` +
        (policy.yearAgo
          ? `, ${policy.change12mPp < 0 ? 'down' : policy.change12mPp > 0 ? 'up' : 'unchanged'}${policy.change12mPp ? ` ${fmtNum(Math.abs(policy.change12mPp))} percentage points` : ''} from ${fmtNum(policy.yearAgo.value)}% in ${periodLabel(policy.yearAgo.period)}`
          : '') +
        '.' +
        (policy.lastChange
          ? ` Last change in the series: ${periodLabel(policy.lastChange.period)}, from ${fmtNum(policy.lastChange.from)}% to ${fmtNum(policy.lastChange.to)}%.`
          : '') +
        (policy.expostRealRatePp != null
          ? ` Ex-post real policy rate (policy rate minus latest annual inflation): ${fmtNum(policy.expostRealRatePp)} percentage points.`
          : ''),
    );
  }
  if (reserves) {
    statements.push(
      `Official reserves, ${periodLabel(reserves.level.period)}: ${fmtNum(reserves.level.value, { money: true })}` +
        (reserves.change3mPct != null
          ? `, ${reserves.change3mPct >= 0 ? 'up' : 'down'} ${fmtNum(Math.abs(reserves.change3mPct))}% from ${periodLabel(reserves.threeMonthsAgo.period)}`
          : '') +
        '.' +
        (reserves.importMonths != null
          ? ` That covers about ${fmtNum(reserves.importMonths)} months of goods imports.`
          : '') +
        ' Gross reserves overstate what is usable.',
    );
  }
  for (const [k, label, unit] of [
    ['currentAccount', 'Current account balance', '% of GDP'],
    ['externalDebt', 'External debt', null],
  ]) {
    const r = ext[k];
    if (r && n(r.value) != null)
      statements.push(
        `${label}, ${periodLabel(r.period)}: ${withUnit(fmtNum(r.value), r.unit || unit)}.`,
      );
  }
  if (risk?.percentile != null) {
    statements.push(
      `${risk.label[0].toUpperCase()}${risk.label.slice(1)} index for ${place || 'the country'}, ${periodLabel(risk.latest.period)}: at the ${ordinal(risk.percentile)} percentile of its own history.`,
    );
  }

  const kpis = [];
  if (fx)
    kpis.push({
      id: 'fx',
      label: `${code || 'Local'} per USD`,
      value: fmtRate(fx.latest.value),
      period: periodLabel(fx.latest.period),
      change: fx.y1 ? `dollar +${fmtNum(fx.y1.dollarDearerPct)}% in a year` : null,
      stale: fx.freshness === 'not current',
    });
  if (infl)
    kpis.push({
      id: 'inflation',
      label: 'Inflation',
      value: `${fmtNum(infl.annual.value)}%`,
      period: periodLabel(infl.annual.period),
      change: infl.annualYearAgo ? `${infl.trend} from ${fmtNum(infl.annualYearAgo.value)}%` : null,
      stale: infl.freshness === 'not current',
    });
  if (policy)
    kpis.push({
      id: 'policy',
      label: 'Policy rate',
      value: `${fmtNum(policy.level.value)}%`,
      period: periodLabel(policy.level.period),
      change:
        policy.change12mPp != null
          ? `${policy.change12mPp > 0 ? '+' : ''}${fmtNum(policy.change12mPp)} pp in a year`
          : null,
      stale: policy.freshness === 'not current',
    });
  if (reserves)
    kpis.push({
      id: 'reserves',
      label: 'Reserves',
      value: fmtNum(reserves.level.value, { money: true }),
      period: periodLabel(reserves.level.period),
      change:
        reserves.change3mPct != null
          ? `${reserves.change3mPct > 0 ? '+' : ''}${fmtNum(reserves.change3mPct)}% in 3 months`
          : null,
      stale: reserves.freshness === 'not current',
    });

  /* What a currency judgement would use that Ezana does not hold. */
  const notHeld = ['sovereign CDS spreads', 'inflation expectations'];
  return {
    metrics: { fx, reer, inflation: infl, policy, reserves, risk, external: ext },
    assessment,
    statements,
    kpis: kpis.slice(0, 4),
    missing: [...assessment.missing, ...notHeld],
  };
}

/** One computed direction line for the fallback brief (no model). */
export function directionLine(picture, { place, currency } = {}) {
  const fx = picture?.metrics?.fx;
  const cur = currency?.short || 'currency';
  const label = picture?.assessment?.overall;
  if (!fx?.y1) return null;
  const lead = label
    ? `By Ezana's thresholds, pressure on the ${cur} is ${label}.`
    : `The ${cur}'s pressure level cannot be rated from the data held.`;
  return `${lead} Over the year to ${periodLabel(fx.y1.toPeriod)} the dollar costs ${fmtNum(fx.y1.dollarDearerPct)}% more in ${place ? `${place}'s ` : ''}${cur}, and the ${cur} lost ${fmtNum(fx.y1.valueLostPct)}% of its dollar value.`;
}

/* ── Historical stress episodes (deep research) ────────────────────────────────────── */

/** Month-end values ("YYYY-MM") from a daily or monthly history. */
function monthly(history) {
  const h = clean(history);
  const out = new Map();
  for (const p of h) out.set(p.period.slice(0, 7), p.value);
  return [...out.entries()].map(([period, value]) => ({ period, value }));
}

/**
 * Stress episodes found in Ezana's own series: runs of months when the currency had lost at
 * least `thresholdPct` of its dollar value over the year (Ezana's severe threshold by
 * default), with what annual inflation and the policy rate were at the worst month.
 * Most recent first, max `max`. Pure.
 */
export function stressEpisodes(
  fxHistory,
  { inflation = [], policy = [], thresholdPct = 25, max = 4 } = {},
) {
  const fx = monthly(fxHistory);
  const byMonth = new Map(fx.map((p) => [p.period, p.value]));
  const infl = new Map(monthly(inflation).map((p) => [p.period, p.value]));
  const pol = new Map(monthly(policy).map((p) => [p.period, p.value]));
  const lastAtOrBefore = (map, period) => {
    let hit = null;
    for (const [k, v] of map) if (k <= period) hit = { period: k, value: v };
    return hit;
  };
  const episodes = [];
  let cur = null;
  for (const p of fx) {
    const y = `${Number(p.period.slice(0, 4)) - 1}${p.period.slice(4)}`;
    const old = byMonth.get(y);
    const lost = old ? valueLostPct(old, p.value) : null;
    if (lost != null && lost >= thresholdPct) {
      if (!cur) cur = { from: p.period, to: p.period, peak: { period: p.period, lostPct: lost } };
      cur.to = p.period;
      if (lost > cur.peak.lostPct) cur.peak = { period: p.period, lostPct: lost };
    } else if (cur) {
      episodes.push(cur);
      cur = null;
    }
  }
  if (cur) episodes.push(cur);
  return episodes
    .map((e) => ({
      from: e.from,
      to: e.to,
      peakPeriod: e.peak.period,
      peakLostPct: round(e.peak.lostPct, 3),
      inflationAtPeak: lastAtOrBefore(infl, e.peak.period),
      policyAtPeak: lastAtOrBefore(pol, e.peak.period),
    }))
    .reverse()
    .slice(0, max);
}

/** One evidence sentence for the episodes, or null. */
export function episodesStatement(episodes, { currency = null, thresholdPct = 25 } = {}) {
  if (!episodes?.length) return null;
  const cur = currency?.short || 'currency';
  const parts = episodes.map((e) => {
    const span =
      e.from === e.to ? periodLabel(e.from) : `${periodLabel(e.from)} to ${periodLabel(e.to)}`;
    const ctx = [
      e.inflationAtPeak ? `annual inflation ${fmtNum(e.inflationAtPeak.value)}%` : null,
      e.policyAtPeak ? `the policy rate ${fmtNum(e.policyAtPeak.value)}%` : null,
    ].filter(Boolean);
    return `${span}, worst in ${periodLabel(e.peakPeriod)} when the ${cur} had lost ${fmtNum(e.peakLostPct)}% of its dollar value over the year${ctx.length ? ` (${ctx.join(', ')})` : ''}`;
  });
  return `Stress episodes in Ezana's own series, months when the ${cur} had lost ${thresholdPct}% or more of its dollar value over a year (Ezana's severe threshold): ${parts.join('; ')}.`;
}
