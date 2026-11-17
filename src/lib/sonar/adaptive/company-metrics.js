/**
 * Sonar adaptive research: arithmetic on reported statements and disclosures (Nov 2026).
 *
 * Pure. Quarterly statements in, growth and margins out; disclosed trades in, counts and
 * reporting lags out. A ratio whose denominator is missing or not positive is null, and a
 * year-over-year figure compares a quarter with the same quarter a year earlier, never with
 * the one before it.
 */

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const ratio = (a, b) => (num(a) != null && num(b) != null && b > 0 ? (a / b) * 100 : null);
const growth = (a, b) => (num(a) != null && num(b) != null && b > 0 ? (a / b - 1) * 100 : null);
const DAY = 86400000;

/**
 * @param {{ quarters: object[], balance: object[] }} inputs  normalizeInputs() output
 * @returns {null | { rows, latest, ttm, priorTtm, netDebt, balanceAsOf }}
 */
export function statementTrend(inputs, { quarters: keep = 8 } = {}) {
  const qs = (inputs?.quarters || []).filter((q) => num(q.revenue) != null);
  if (qs.length < 5) return null;
  const rows = qs.map((q, i) => {
    /* Same quarter a year earlier: four back, and about a year apart. */
    const prior = qs[i - 4];
    const yearApart = prior && Math.abs((q.end - prior.end) / DAY - 365) <= 20;
    return {
      period: q.period,
      revenue: q.revenue,
      revenueYoyPct: yearApart ? growth(q.revenue, prior.revenue) : null,
      operatingMarginPct: ratio(q.operatingIncome, q.revenue),
      netMarginPct: ratio(q.netIncome, q.revenue),
      netIncome: num(q.netIncome),
      fcf: num(q.fcf),
      fcfMarginPct: ratio(q.fcf, q.revenue),
    };
  });
  const sum = (list, k) =>
    list.length === 4 && list.every((r) => num(r[k]) != null)
      ? list.reduce((s, r) => s + r[k], 0)
      : null;
  const window = (list) => ({
    revenue: sum(list, 'revenue'),
    netIncome: sum(list, 'netIncome'),
    fcf: sum(list, 'fcf'),
  });
  const ttm = window(rows.slice(-4));
  const priorTtm = rows.length >= 8 ? window(rows.slice(-8, -4)) : null;
  const bs = (inputs?.balance || []).at(-1) || null;
  const latest = rows.at(-1);
  const yearAgo = rows.at(-5) || null;
  return {
    rows: rows.slice(-keep),
    latest,
    marginChangePts:
      latest.operatingMarginPct != null && yearAgo?.operatingMarginPct != null
        ? latest.operatingMarginPct - yearAgo.operatingMarginPct
        : null,
    ttm: {
      ...ttm,
      revenueYoyPct: growth(ttm.revenue, priorTtm?.revenue),
      fcfMarginPct: ratio(ttm.fcf, ttm.revenue),
      /* Cash conversion: free cash flow per dollar of net income. Only when both are positive. */
      cashConversionPct:
        num(ttm.netIncome) > 0 && num(ttm.fcf) != null ? (ttm.fcf / ttm.netIncome) * 100 : null,
    },
    netDebt: bs && num(bs.debt) != null && num(bs.cash) != null ? bs.debt - bs.cash : null,
    debt: bs ? num(bs.debt) : null,
    cash: bs ? num(bs.cash) : null,
    balanceAsOf: bs?.period || null,
  };
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * @param {{ member, type, transactionDate, disclosureDate }[]} trades
 * @returns {{ total, purchases, sales, exchanges, members, medianLagDays, lateCount, from, to }}
 */
export function tradeSummary(trades = []) {
  const rows = trades.filter((t) => t?.transactionDate);
  const lags = rows
    .map((t) =>
      t.disclosureDate
        ? Math.round((Date.parse(t.disclosureDate) - Date.parse(t.transactionDate)) / DAY)
        : null,
    )
    .filter((d) => d != null && d >= 0);
  const dates = rows.map((t) => t.transactionDate).sort();
  return {
    total: rows.length,
    purchases: rows.filter((t) => t.type === 'purchase').length,
    sales: rows.filter((t) => t.type === 'sale' || t.type === 'sale_partial').length,
    exchanges: rows.filter((t) => t.type === 'exchange').length,
    members: new Set(rows.map((t) => t.member).filter(Boolean)).size,
    medianLagDays: median(lags),
    /* The STOCK Act asks for a report within 45 days of the transaction. */
    lateCount: lags.filter((d) => d > 45).length,
    from: dates[0] || null,
    to: dates.at(-1) || null,
  };
}

/** Counts of 13F position changes by kind, tolerant of how the filing index words them. */
export function holderChanges(rows = []) {
  const out = { added: 0, reduced: 0, opened: 0, unchanged: 0, unknown: 0 };
  for (const r of rows) {
    const c = String(r?.changeType || '').toLowerCase();
    if (/new|open|initiat/.test(c)) out.opened += 1;
    else if (/increas|add|bought|buy/.test(c)) out.added += 1;
    else if (/decreas|reduc|trim|sold|sell/.test(c)) out.reduced += 1;
    else if (/unchanged|hold|same/.test(c)) out.unchanged += 1;
    else out.unknown += 1;
  }
  return out;
}

const RANK_METRICS = [
  [
    'gdp_per_capita_ppp',
    /\bper (capita|person|head)\b.{0,30}\bppp\b|\bppp\b.{0,30}\bper (capita|person|head)\b/i,
  ],
  [
    'gdp_per_capita_usd',
    /\b(gdp|income|output)\b.{0,12}\bper (capita|person|head)\b|\brichest countr/i,
  ],
  ['gdp_ppp', /\b(ppp|purchasing power)\b/i],
  [
    'gdp_growth_real',
    /\b(fastest[- ]growing|gdp growth|growth rate|growing (the )?fastest)\b.{0,40}\b(econom|countr)|\b(econom|countr)\w*\b.{0,40}\b(fastest[- ]growing|gdp growth|growing (the )?fastest)\b/i,
  ],
  [
    'gdp_nominal_usd',
    /\b(largest|biggest|top)\b.{0,20}\beconom(y|ies)\b|\b(largest|biggest|highest|top)\b.{0,20}\bgdp\b|\bgdp\b.{0,20}\brank/i,
  ],
];

/** The country-ranking measure a question asks for, or null when it is not one Sonar holds. */
export function rankingMetricOf(question) {
  const q = String(question || '');
  for (const [id, re] of RANK_METRICS) if (re.test(q)) return id;
  return null;
}

/* Open-market codes on Forms 4 and 5. Awards, option exercises, tax withholding and gifts are
   reported on the same forms and are not purchases or sales in the market. */
const INSIDER_KIND = {
  P: 'Open-market purchase',
  S: 'Open-market sale',
  A: 'Award or grant',
  M: 'Option exercise',
  F: 'Shares withheld for tax',
  G: 'Gift',
  D: 'Disposition to the issuer',
  C: 'Conversion',
  X: 'Option exercise',
  J: 'Other',
};
export const insiderKind = (code) => INSIDER_KIND[String(code || '').toUpperCase()] || 'Other';

/** Counts and values of insider filings, with open-market trades kept apart from the rest. */
export function insiderSummary(rows = []) {
  const list = rows.filter((r) => r?.date);
  const sum = (xs) => xs.reduce((s, r) => s + (Number.isFinite(r.valueUsd) ? r.valueUsd : 0), 0);
  const buys = list.filter((r) => r.code === 'P');
  const sells = list.filter((r) => r.code === 'S');
  const dates = list.map((r) => r.date).sort();
  return {
    total: list.length,
    purchases: buys.length,
    purchaseValue: sum(buys),
    sales: sells.length,
    saleValue: sum(sells),
    other: list.length - buys.length - sells.length,
    reporters: new Set(list.map((r) => r.reporter).filter(Boolean)).size,
    from: dates[0] || null,
    to: dates.at(-1) || null,
  };
}

/** Trades per calendar month, purchases and sales apart, oldest first, gaps filled with 0. */
export function tradesByMonth(trades = [], { months = 12, now = new Date() } = {}) {
  const keys = [];
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = months - 1; i >= 0; i -= 1) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    keys.push(m.toISOString().slice(0, 7));
  }
  const at = new Map(keys.map((k) => [k, { month: k, purchases: 0, sales: 0 }]));
  for (const t of trades) {
    const row = at.get(String(t?.transactionDate || '').slice(0, 7));
    if (!row) continue;
    if (t.type === 'purchase') row.purchases += 1;
    else if (t.type === 'sale' || t.type === 'sale_partial') row.sales += 1;
  }
  return [...at.values()];
}

/** The most-traded tickers in a list of disclosed trades. */
export function topTickers(trades = [], limit = 8) {
  const by = new Map();
  for (const t of trades) {
    if (!t?.ticker) continue;
    const r = by.get(t.ticker) || {
      ticker: t.ticker,
      trades: 0,
      purchases: 0,
      sales: 0,
      members: new Set(),
    };
    r.trades += 1;
    if (t.type === 'purchase') r.purchases += 1;
    else if (t.type === 'sale' || t.type === 'sale_partial') r.sales += 1;
    if (t.member) r.members.add(t.member);
    by.set(t.ticker, r);
  }
  return [...by.values()]
    .map((r) => ({ ...r, members: r.members.size }))
    .sort((a, b) => b.trades - a.trades || a.ticker.localeCompare(b.ticker))
    .slice(0, limit);
}

/* Country-ranking measures held in the macro series store, by the family that ranks them.
   Most specific first. `asc` when the question asks for the lowest. */
const RANK_FAMILIES = [
  [
    'oil_production',
    /\b(crude|oil)\b.{0,30}\b(produc|output|pump)|\b(produc\w*|pump\w*)\b.{0,30}\b(crude|oil)\b/i,
  ],
  [
    'gas_production',
    /\b(natural gas|gas|lng)\b.{0,30}\b(produc|output)|\bproduc\w*\b.{0,30}\b(natural gas|gas)\b/i,
  ],
  ['oil_demand', /\boil\b.{0,30}\b(demand|consum)|\bconsum\w*\b.{0,30}\boil\b/i],
  [
    'gas_demand',
    /\b(natural gas|gas)\b.{0,30}\b(demand|consum)|\bconsum\w*\b.{0,30}\b(natural gas|gas)\b/i,
  ],
  ['gas_imports', /\b(natural gas|gas|lng)\b.{0,20}\bimport/i],
  ['inflation_annual', /\binflation\b/i],
  ['unemployment', /\b(unemployment|jobless)\b/i],
  [
    'gov_debt',
    /\b(government|public|sovereign|national) debt\b|\bdebt[- ]to[- ]gdp\b|\bmost indebted\b/i,
  ],
  ['gov_balance', /\b(fiscal|budget) (deficit|balance|surplus)e?s?\b/i],
  ['current_account', /\bcurrent[- ]account\b/i],
  ['policy_rate', /\b(policy|interest|central bank) rates?\b/i],
  [
    'trade_goods',
    /\b(largest|biggest|top)\b.{0,20}\bexporters?\b|\bexports?\b.{0,30}\b(most|largest|biggest)\b|\bmost\b.{0,20}\bexports?\b/i,
  ],
];
const LOWEST = /\b(lowest|smallest|least|slowest|weakest)\b/i;

/**
 * The ranking a question asks for: a GDP measure from the World Bank snapshot
 * ({ kind: 'gdp', id }), a macro-store family ({ kind: 'family', id, order }), or null.
 */
export function rankingOf(question) {
  const q = String(question || '');
  for (const [id, re] of RANK_FAMILIES)
    if (re.test(q)) return { kind: 'family', id, order: LOWEST.test(q) ? 'asc' : 'desc' };
  const gdp = rankingMetricOf(q);
  return gdp ? { kind: 'gdp', id: gdp, order: 'desc' } : null;
}
