/**
 * Historical valuation (Nov 2026): a stock's trading multiples through time, computed from
 * point-in-time data, and where today's value sits in that history. Pure: no I/O. The
 * provider payloads come in through fetch.js; tested in scripts/check-sonar-valuation.mjs.
 *
 * How a historical observation is built (one per month end over the lookback):
 *   - Market capitalization on that date, from the provider's daily market-cap history. Using
 *     market cap rather than price x per-share figures keeps the series right through stock
 *     splits: an as-reported EPS from before a split is never divided into a split-adjusted
 *     price.
 *   - Fundamentals as they were known on that date: the latest four consecutive fiscal
 *     quarters whose filing date is on or before it (point in time). A quarter without a
 *     filing date counts as known 45 days after its period end. Today's figures are never
 *     applied to past prices.
 *   - Enterprise value = market cap + total debt - cash and short-term investments
 *     (+ minority interest when reported), from the latest balance sheet filed by that date.
 *
 * Metrics:
 *   pe_ttm     trailing P/E      market cap / trailing four-quarter net income
 *   ev_ebitda  EV/EBITDA         enterprise value / trailing four-quarter EBITDA
 *   ps_ttm     price-to-sales    market cap / trailing four-quarter revenue
 *   fcf_yield  FCF yield         trailing four-quarter free cash flow / market cap x 100
 *   pe_fwd     forward P/E       current price / consensus EPS for the next fiscal year.
 *                                No percentile: the provider has no point-in-time history
 *                                of estimates, and today's estimates applied to past prices
 *                                would not be an authentic history.
 *
 * A multiple with a zero or negative denominator is not meaningful (NM): it is left out of
 * the distribution and counted, never shown as a number. FCF yield can be negative and stays.
 *
 * Percentile convention: the percentile rank of the current value is the share of valid
 * historical observations in the lookback window that are less than or equal to it, times
 * 100 (ties count as at or below, so a value equal to every observation is the 100th
 * percentile). The current observation is not part of the distribution. Fewer than
 * MIN_OBSERVATIONS valid observations: no percentile, an "insufficient history" state.
 *
 * A higher percentile on a multiple means a higher valuation than usual for this stock. On
 * FCF yield it means the opposite (a higher yield, a lower valuation), and the snapshot says
 * so. A percentile is position in the stock's own history, never a verdict that the stock is
 * cheap or expensive.
 */

export const VALUATION_VERSION = 'valuation-v1';
export const LOOKBACK_YEARS = 5;
export const MIN_OBSERVATIONS = 24;
const FILING_LAG_DAYS = 45;
const DAY = 24 * 60 * 60 * 1000;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const toNum = (v) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return num(n);
};
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const time = (s) => {
  const t = Date.parse(String(s || '').slice(0, 10));
  return Number.isFinite(t) ? t : null;
};

export const METRICS = [
  { id: 'pe_ttm', label: 'Trailing P/E', short: 'P/E (TTM)', unit: 'x', direction: 'multiple' },
  { id: 'pe_fwd', label: 'Forward P/E', short: 'P/E (fwd)', unit: 'x', direction: 'multiple' },
  { id: 'ev_ebitda', label: 'EV/EBITDA', short: 'EV/EBITDA', unit: 'x', direction: 'multiple' },
  { id: 'ps_ttm', label: 'Price-to-sales', short: 'P/S', unit: 'x', direction: 'multiple' },
  { id: 'fcf_yield', label: 'FCF yield', short: 'FCF yield', unit: '%', direction: 'yield' },
];
export const METRIC_BY_ID = Object.fromEntries(METRICS.map((m) => [m.id, m]));

/** The provider's quarterly statement rows, normalized and oldest first. */
export function normalizeQuarters(rows, fields) {
  return (Array.isArray(rows) ? rows : [])
    .map((r) => {
      const end = time(r?.date);
      if (end == null) return null;
      const filed = time(r?.filingDate) ?? time(r?.acceptedDate) ?? end + FILING_LAG_DAYS * DAY;
      const out = { end, known: Math.max(filed, end), period: String(r.date).slice(0, 10) };
      for (const [k, src] of Object.entries(fields)) {
        const keys = Array.isArray(src) ? src : [src];
        let v = null;
        for (const s of keys) {
          v = typeof s === 'function' ? s(r) : toNum(r?.[s]);
          if (v != null) break;
        }
        out[k] = v;
      }
      return out;
    })
    .filter(Boolean)
    .sort((a, b) => a.end - b.end);
}

/**
 * Trailing four-quarter sums, each known once its latest quarter was filed. Only four
 * consecutive quarters count (period ends 70 to 110 days apart); a gap breaks the window.
 * -> [{ end, known, period, revenue, ebitda, netIncome, fcf, ... }]
 */
export function trailingSums(quarters, keys) {
  const out = [];
  for (let i = 3; i < quarters.length; i += 1) {
    const w = quarters.slice(i - 3, i + 1);
    let ok = true;
    for (let j = 1; j < 4; j += 1) {
      const gap = (w[j].end - w[j - 1].end) / DAY;
      if (gap < 70 || gap > 110) ok = false;
    }
    if (!ok) continue;
    const row = { end: w[3].end, known: w[3].known, period: w[3].period };
    for (const k of keys) {
      const vals = w.map((q) => q[k]);
      row[k] = vals.every((v) => v != null) ? vals.reduce((s, v) => s + v, 0) : null;
    }
    out.push(row);
  }
  return out;
}

/** The latest row known on or before `t` (rows sorted by end; `known` may be out of order). */
export function knownAt(rows, t) {
  let best = null;
  for (const r of rows) if (r.known <= t && (!best || r.end > best.end)) best = r;
  return best;
}

/** Month-end sample dates over the lookback, oldest first, each the last trading day held. */
export function monthEnds(caps, { now, years = LOOKBACK_YEARS } = {}) {
  const start = new Date(now);
  start.setUTCFullYear(start.getUTCFullYear() - years);
  const byMonth = new Map();
  for (const c of caps) {
    if (c.t < start.getTime() || c.t > now.getTime()) continue;
    const key = iso(c.t).slice(0, 7);
    const cur = byMonth.get(key);
    if (!cur || c.t > cur.t) byMonth.set(key, c);
  }
  const thisMonth = iso(now).slice(0, 7);
  /* The current month is the "today" observation, not part of the history. */
  return [...byMonth.entries()]
    .filter(([k]) => k !== thisMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, c]) => c);
}

/**
 * Percentile rank of `value` among `sample`: share of observations <= value, x 100 (ties at
 * or below). Null when the sample is smaller than `min`.
 */
export function percentileRank(sample, value, { min = MIN_OBSERVATIONS } = {}) {
  const xs = (sample || []).filter((x) => num(x) != null);
  if (num(value) == null || xs.length < min) return null;
  const le = xs.filter((x) => x <= value).length;
  return Math.round((le / xs.length) * 1000) / 10;
}

/** Quantile of a sample by linear interpolation (q in 0..1). */
export function quantile(sample, q) {
  const xs = (sample || []).filter((x) => num(x) != null).sort((a, b) => a - b);
  if (!xs.length) return null;
  const pos = (xs.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo);
}

/**
 * Where a value sits against its own history's median: 'above' | 'near' | 'below'. Near is
 * within 5% of the median.
 */
export function medianPosition(value, median) {
  if (num(value) == null || num(median) == null || median === 0) return null;
  const r = value / median - 1;
  return Math.abs(r) <= 0.05 ? 'near' : r > 0 ? 'above' : 'below';
}

function multiples({ cap, ttm, bs }) {
  const ev =
    cap != null && bs && bs.debt != null && bs.cash != null
      ? cap + bs.debt - bs.cash + (bs.minority || 0)
      : null;
  const ratio = (a, b) => (a != null && b != null && b > 0 ? a / b : 'NM');
  return {
    pe_ttm: ttm ? ratio(cap, ttm.netIncome) : null,
    ev_ebitda: ttm && ev != null ? ratio(ev, ttm.ebitda) : null,
    ps_ttm: ttm ? ratio(cap, ttm.revenue) : null,
    fcf_yield: ttm && ttm.fcf != null && cap > 0 ? (ttm.fcf / cap) * 100 : null,
    ev,
  };
}

/**
 * The provider payloads as normalized inputs.
 * raw: { income, cashflow, balance, caps, estimates, quote }
 */
export function normalizeInputs(raw = {}) {
  const income = normalizeQuarters(raw.income, {
    revenue: 'revenue',
    ebitda: 'ebitda',
    netIncome: ['netIncome', 'netIncomeFromContinuingOperations'],
    operatingIncome: 'operatingIncome',
    incomeBeforeTax: 'incomeBeforeTax',
    incomeTax: 'incomeTaxExpense',
    interestExpense: 'interestExpense',
    da: 'depreciationAndAmortization',
    sharesDiluted: 'weightedAverageShsOutDil',
  });
  const cash = normalizeQuarters(raw.cashflow, {
    fcf: [
      'freeCashFlow',
      (r) => {
        const o = toNum(r?.operatingCashFlow ?? r?.netCashProvidedByOperatingActivities);
        const c = toNum(r?.capitalExpenditure);
        return o != null && c != null ? o - Math.abs(c) : null;
      },
    ],
    capex: [
      (r) => (toNum(r?.capitalExpenditure) != null ? Math.abs(toNum(r.capitalExpenditure)) : null),
    ],
    cfoDa: 'depreciationAndAmortization',
    wcChange: 'changeInWorkingCapital',
  });
  const balance = normalizeQuarters(raw.balance, {
    debt: [
      'totalDebt',
      (r) => {
        const s = toNum(r?.shortTermDebt);
        const l = toNum(r?.longTermDebt);
        return s != null || l != null ? (s || 0) + (l || 0) : null;
      },
    ],
    cash: ['cashAndShortTermInvestments', 'cashAndCashEquivalents'],
    minority: 'minorityInterest',
  });
  /* Merge cash flow into the income quarters by period end. */
  const byEnd = new Map(cash.map((c) => [c.period, c]));
  const quarters = income.map((q) => {
    const c = byEnd.get(q.period);
    return {
      ...q,
      fcf: c?.fcf ?? null,
      capex: c?.capex ?? null,
      wcChange: c?.wcChange ?? null,
      da: q.da ?? c?.cfoDa ?? null,
      known: Math.max(q.known, c?.known ?? q.known),
    };
  });
  const caps = (Array.isArray(raw.caps) ? raw.caps : [])
    .map((r) => ({ t: time(r?.date), cap: toNum(r?.marketCap) }))
    .filter((r) => r.t != null && r.cap != null && r.cap > 0)
    .sort((a, b) => a.t - b.t);
  return { quarters, balance, caps, estimates: raw.estimates, quote: raw.quote || null };
}

/** The next fiscal year's consensus EPS (the first estimate year ending after today). */
export function forwardEps(estimates, now) {
  const today = iso(now);
  const rows = (Array.isArray(estimates) ? estimates : [])
    .map((r) => ({
      date: String(r?.date || '').slice(0, 10),
      eps: toNum(r?.epsAvg ?? r?.estimatedEpsAvg),
    }))
    .filter((r) => r.date > today && r.eps != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  return rows[0] || null;
}

/**
 * The valuation history and today's position for every metric the data supports.
 * @param {object} raw   provider payloads (see normalizeInputs)
 * @param {{ now?: Date, years?: number }} opts
 * -> { version, asOf, lookbackYears, metrics: [...], current, ttm, coverage }
 */
export function buildValuationHistory(raw, { now = new Date(), years = LOOKBACK_YEARS } = {}) {
  const inp = normalizeInputs(raw);
  const ttmRows = trailingSums(inp.quarters, [
    'revenue',
    'ebitda',
    'netIncome',
    'fcf',
    'operatingIncome',
    'incomeBeforeTax',
    'incomeTax',
    'interestExpense',
    'da',
    'capex',
    'wcChange',
  ]);
  const samples = monthEnds(inp.caps, { now, years });
  const series = { pe_ttm: [], ev_ebitda: [], ps_ttm: [], fcf_yield: [] };
  const nm = { pe_ttm: 0, ev_ebitda: 0, ps_ttm: 0, fcf_yield: 0 };
  for (const s of samples) {
    const ttm = knownAt(ttmRows, s.t);
    const bs = knownAt(inp.balance, s.t);
    const m = multiples({ cap: s.cap, ttm, bs });
    for (const k of Object.keys(series)) {
      if (m[k] === 'NM') nm[k] += 1;
      else if (num(m[k]) != null) series[k].push({ date: iso(s.t), value: m[k] });
    }
  }

  /* Today: the quote's market cap (else the latest daily cap) and fundamentals known now. */
  const nowT = now.getTime();
  const quoteCap = toNum(inp.quote?.marketCap);
  const lastCap = inp.caps.at(-1);
  const cap = quoteCap ?? lastCap?.cap ?? null;
  const ttmNow = knownAt(ttmRows, nowT);
  const bsNow = knownAt(inp.balance, nowT);
  const cur = multiples({ cap, ttm: ttmNow, bs: bsNow });
  const price = toNum(inp.quote?.price);
  const fwd = forwardEps(inp.estimates, now);
  const peFwd = price != null && fwd ? (fwd.eps > 0 ? price / fwd.eps : 'NM') : null;
  const values = { ...cur, pe_fwd: peFwd };

  const metrics = METRICS.map((def) => {
    const v = values[def.id];
    const hist = series[def.id] || null;
    const sample = hist ? hist.map((h) => h.value) : [];
    const pct = hist && num(v) != null ? percentileRank(sample, v) : null;
    const median = hist && sample.length >= MIN_OBSERVATIONS ? quantile(sample, 0.5) : null;
    let status = 'ok';
    let note = null;
    if (v === 'NM') {
      status = 'nm';
      note =
        def.id === 'pe_fwd'
          ? 'Consensus EPS for the next fiscal year is zero or negative.'
          : 'Not meaningful: the denominator is zero or negative.';
    } else if (v == null) {
      status = 'unavailable';
      note =
        def.id === 'pe_fwd'
          ? 'No consensus EPS estimate for the next fiscal year.'
          : 'The inputs for this multiple are not available.';
    } else if (def.id === 'pe_fwd') {
      note = 'No percentile: a point-in-time history of consensus estimates is not available.';
    } else if (pct == null) {
      status = 'insufficient';
      note = `Insufficient history: ${sample.length} valid month-end observations (at least ${MIN_OBSERVATIONS} needed).`;
    }
    return {
      id: def.id,
      label: def.label,
      short: def.short,
      unit: def.unit,
      direction: def.direction,
      value: num(v),
      status,
      percentile: pct,
      percentileKind: pct != null ? 'historical' : null,
      median,
      p25: hist && sample.length >= MIN_OBSERVATIONS ? quantile(sample, 0.25) : null,
      p75: hist && sample.length >= MIN_OBSERVATIONS ? quantile(sample, 0.75) : null,
      min: sample.length ? Math.min(...sample) : null,
      max: sample.length ? Math.max(...sample) : null,
      observations: sample.length,
      excludedNm: nm[def.id] || 0,
      window: hist
        ? {
            years,
            from: hist[0]?.date || null,
            to: hist.at(-1)?.date || null,
            frequency: 'month-end',
          }
        : null,
      position: pct != null ? medianPosition(num(v), median) : null,
      series: hist,
      note,
      basis:
        def.id === 'pe_fwd' && fwd
          ? `price / consensus EPS for the fiscal year ending ${fwd.date}`
          : null,
    };
  });

  const ttm = ttmNow
    ? {
        period: ttmNow.period,
        revenue: ttmNow.revenue,
        ebitda: ttmNow.ebitda,
        netIncome: ttmNow.netIncome,
        fcf: ttmNow.fcf,
        operatingIncome: ttmNow.operatingIncome,
        incomeBeforeTax: ttmNow.incomeBeforeTax,
        incomeTax: ttmNow.incomeTax,
        interestExpense: ttmNow.interestExpense,
        da: ttmNow.da,
        capex: ttmNow.capex,
        wcChange: ttmNow.wcChange,
      }
    : null;
  /* Revenue growth: TTM against the TTM a year earlier (four quarters back). */
  const idx = ttmNow ? ttmRows.indexOf(ttmNow) : -1;
  const yearAgo = idx >= 4 ? ttmRows[idx - 4] : null;
  const threeAgo = idx >= 12 ? ttmRows[idx - 12] : null;
  const growth = (a, b) => (a != null && b != null && b > 0 ? (a / b - 1) * 100 : null);
  const lastQ = inp.quarters.at(-1);
  return {
    version: VALUATION_VERSION,
    asOf: iso(now),
    lookbackYears: years,
    metrics,
    current: {
      marketCap: cap,
      enterpriseValue: num(cur.ev),
      price,
      debt: bsNow?.debt ?? null,
      cash: bsNow?.cash ?? null,
      minority: bsNow?.minority ?? null,
      sharesDiluted: lastQ?.sharesDiluted ?? null,
      forwardEps: fwd,
    },
    ttm,
    growth: {
      revenueYoyPct: growth(ttmNow?.revenue, yearAgo?.revenue),
      revenueCagr3yPct:
        ttmNow?.revenue != null && threeAgo?.revenue > 0
          ? ((ttmNow.revenue / threeAgo.revenue) ** (1 / 3) - 1) * 100
          : null,
      netIncomeYoyPct: growth(ttmNow?.netIncome, yearAgo?.netIncome),
    },
    coverage: {
      quarters: inp.quarters.length,
      trailingWindows: ttmRows.length,
      monthEnds: samples.length,
      latestQuarter: lastQ?.period || null,
      latestFiled: ttmNow ? iso(ttmNow.known) : null,
    },
  };
}

const POSITION_LABEL = {
  above: 'Above historical median',
  near: 'Near historical median',
  below: 'Below historical median',
};

/**
 * The snapshot the quick ping shows: today's value, historical percentile and its window for
 * each metric, most important first, and one context label when the multiples agree. The
 * label compares with the stock's own median; it is never "undervalued" or "overvalued".
 * -> { asOf, lookbackYears, context: { position, label, basis } | null, rows: [...] }
 */
export function valuationSnapshot(history) {
  if (!history) return null;
  const rows = history.metrics
    .filter((m) => m.status !== 'unavailable')
    .map(({ series, ...rest }) => rest);
  if (!rows.length) return null;
  const mult = history.metrics.filter((m) => m.direction === 'multiple' && m.position);
  const counts = mult.reduce((c, m) => ({ ...c, [m.position]: (c[m.position] || 0) + 1 }), {});
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  /* A context label needs at least two multiples, and most of them, agreeing. */
  const context =
    top && top[1] >= 2 && top[1] > mult.length / 2
      ? {
          position: top[0],
          label: POSITION_LABEL[top[0]],
          basis: `${top[1]} of ${mult.length} multiples with a ${history.lookbackYears}-year history`,
        }
      : null;
  return {
    version: history.version,
    asOf: history.asOf,
    lookbackYears: history.lookbackYears,
    latestQuarter: history.coverage.latestQuarter,
    context,
    rows,
    growth: history.growth,
  };
}

/** The snapshot from a deep valuation model (model.js), for the research board. */
export function snapshotFromModel(model) {
  if (!model?.history?.metrics?.length) return null;
  return valuationSnapshot({
    version: model.version,
    asOf: model.asOf,
    lookbackYears: model.history.lookbackYears,
    metrics: model.history.metrics,
    coverage: model.history.coverage || {},
    growth: {},
  });
}
