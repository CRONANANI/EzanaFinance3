/**
 * Sample market data in FMP's own response shapes (Nov 28 2026, temporary).
 *
 * Used ONLY while FMP refuses Ezana's key for billing (HTTP 401/402/403) and ONLY inside the
 * equities and asset routes wrapped with withFmpSample (lib/market-sample/index.js). Every
 * value is deterministic per symbol (a hash-seeded generator, never Math.random), company
 * names say "sample", and the UI shows a sample-data banner. Nothing here is written to the
 * database, read by Sonar, used for trading, or presented as a real observation.
 *
 * Endpoints without a sample (search, peers, earnings, dividends, grades, calendars, DCF)
 * return undefined, so the caller keeps FMP's refusal and shows its unavailable state.
 */

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: a small deterministic generator seeded by a string. */
export function seeded(seed) {
  let a = hash(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const iso = (d) => d.toISOString().slice(0, 10);

/* Rough reference levels so sample assets are on a recognisable scale. */
const ANCHORS = {
  BTCUSD: 90000,
  ETHUSD: 3200,
  SOLUSD: 180,
  XRPUSD: 2.2,
  DOGEUSD: 0.3,
  ADAUSD: 0.8,
  GCUSD: 2600,
  SIUSD: 30,
  CLUSD: 70,
  BZUSD: 74,
  NGUSD: 3,
  HGUSD: 4.3,
  PLUSD: 950,
  '^GSPC': 6000,
  '^IXIC': 19500,
  '^DJI': 44000,
  '^RUT': 2300,
  '^VIX': 16,
  SPY: 600,
  QQQ: 520,
  DIA: 440,
  IWM: 230,
};

function basePrice(sym) {
  if (ANCHORS[sym] != null) return ANCHORS[sym];
  const r = seeded(`${sym}:base`);
  return round(15 + r() * 385, 2);
}

/** Daily closes for the trading days in [from, to], ending at today's sample price. */
function series(sym, from, to) {
  const end = to ? new Date(`${to}T00:00:00Z`) : new Date();
  const start = from ? new Date(`${from}T00:00:00Z`) : new Date(end.getTime() - 365 * 86400000);
  const days = [];
  for (
    let d = new Date(end);
    d >= start && days.length < 2600;
    d = new Date(d.getTime() - 86400000)
  ) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) days.push(new Date(d));
  }
  const r = seeded(`${sym}:walk`);
  let p = basePrice(sym);
  const out = [];
  for (const d of days) {
    const close = round(p, p < 5 ? 4 : 2);
    const open = round(close * (1 + (r() - 0.5) * 0.01), p < 5 ? 4 : 2);
    const high = round(Math.max(open, close) * (1 + r() * 0.008), p < 5 ? 4 : 2);
    const low = round(Math.min(open, close) * (1 - r() * 0.008), p < 5 ? 4 : 2);
    out.push({ date: iso(d), open, high, low, close, volume: Math.round(1e6 + r() * 9e6) });
    p = p / (1 + (r() - 0.49) * 0.024);
  }
  return out.reverse();
}

function quote(sym) {
  const s = series(sym, null, null).slice(-252);
  const last = s[s.length - 1];
  const prev = s[s.length - 2] || last;
  const r = seeded(`${sym}:quote`);
  const shares = Math.round((50 + r() * 2950) * 1e6);
  const change = round(last.close - prev.close, 4);
  const pct = round((change / prev.close) * 100, 2);
  const closes = s.map((x) => x.close);
  const avg = (n) =>
    round(closes.slice(-n).reduce((a, b) => a + b, 0) / Math.min(n, closes.length));
  const eps = round(last.close / (12 + r() * 28), 2);
  return {
    symbol: sym,
    name: `${sym} (sample data)`,
    price: last.close,
    changePercentage: pct,
    changesPercentage: pct,
    change,
    volume: last.volume,
    dayLow: last.low,
    dayHigh: last.high,
    yearHigh: round(Math.max(...closes)),
    yearLow: round(Math.min(...closes)),
    marketCap: Math.round(shares * last.close),
    priceAvg50: avg(50),
    priceAvg200: avg(200),
    exchange: 'SAMPLE',
    open: last.open,
    previousClose: prev.close,
    eps,
    pe: round(last.close / eps, 2),
    timestamp: Math.floor(Date.now() / 1000),
    _sample: true,
  };
}

function profile(sym) {
  const q = quote(sym);
  return {
    symbol: sym,
    companyName: `${sym} (sample data)`,
    price: q.price,
    marketCap: q.marketCap,
    mktCap: q.marketCap,
    beta: round(0.6 + seeded(`${sym}:beta`)() * 1.2, 2),
    lastDividend: 0,
    lastDiv: 0,
    range: `${q.yearLow}-${q.yearHigh}`,
    change: q.change,
    changePercentage: q.changePercentage,
    currency: 'USD',
    exchange: 'SAMPLE',
    exchangeShortName: 'SAMPLE',
    industry: 'Sample data',
    sector: 'Sample data',
    description:
      'Sample data. Live market data is temporarily unavailable, so these figures are illustrative and are not this company’s reported or market values.',
    ceo: null,
    website: null,
    image: null,
    ipoDate: null,
    isEtf: false,
    isActivelyTrading: true,
    _sample: true,
  };
}

function statements(sym, kind, limit = 5) {
  const r = seeded(`${sym}:fin`);
  const rev0 = (0.5 + r() * 60) * 1e9;
  const growth = 0.02 + r() * 0.15;
  const gm = 0.25 + r() * 0.45;
  const om = 0.05 + r() * 0.25;
  const year = new Date().getUTCFullYear() - 1;
  const out = [];
  for (let i = 0; i < Math.min(5, limit); i += 1) {
    const y = year - i;
    const rev = rev0 / (1 + growth) ** i;
    const ni = rev * om * 0.78;
    const shares = (rev0 / 40) * (1 + i * 0.01);
    const base = {
      date: `${y}-12-31`,
      symbol: sym,
      reportedCurrency: 'USD',
      fiscalYear: String(y),
      period: 'FY',
      filingDate: `${y + 1}-02-15`,
      _sample: true,
    };
    if (kind === 'income')
      out.push({
        ...base,
        revenue: Math.round(rev),
        costOfRevenue: Math.round(rev * (1 - gm)),
        grossProfit: Math.round(rev * gm),
        researchAndDevelopmentExpenses: Math.round(rev * 0.06),
        sellingGeneralAndAdministrativeExpenses: Math.round(rev * (gm - om - 0.06)),
        operatingExpenses: Math.round(rev * (gm - om)),
        operatingIncome: Math.round(rev * om),
        ebitda: Math.round(rev * (om + 0.05)),
        interestExpense: Math.round(rev * 0.01),
        incomeBeforeTax: Math.round(ni / 0.79),
        incomeTaxExpense: Math.round((ni / 0.79) * 0.21),
        netIncome: Math.round(ni),
        eps: round(ni / shares, 2),
        epsDiluted: round(ni / shares, 2),
        weightedAverageShsOut: Math.round(shares),
        weightedAverageShsOutDil: Math.round(shares),
      });
    else if (kind === 'balance') {
      const assets = rev * 1.4;
      const debt = rev * 0.3;
      const equity = assets * 0.45;
      out.push({
        ...base,
        cashAndCashEquivalents: Math.round(rev * 0.12),
        shortTermInvestments: Math.round(rev * 0.05),
        netReceivables: Math.round(rev * 0.15),
        inventory: Math.round(rev * 0.08),
        totalCurrentAssets: Math.round(rev * 0.45),
        propertyPlantEquipmentNet: Math.round(rev * 0.4),
        totalAssets: Math.round(assets),
        accountPayables: Math.round(rev * 0.1),
        totalCurrentLiabilities: Math.round(rev * 0.3),
        shortTermDebt: Math.round(debt * 0.15),
        longTermDebt: Math.round(debt * 0.85),
        totalDebt: Math.round(debt),
        totalLiabilities: Math.round(assets - equity),
        totalStockholdersEquity: Math.round(equity),
        totalEquity: Math.round(equity),
        netDebt: Math.round(debt - rev * 0.12),
      });
    } else {
      const ocf = rev * (om + 0.07);
      const capex = rev * 0.05;
      out.push({
        ...base,
        netIncome: Math.round(ni),
        depreciationAndAmortization: Math.round(rev * 0.05),
        stockBasedCompensation: Math.round(rev * 0.02),
        changeInWorkingCapital: Math.round(-rev * 0.01),
        operatingCashFlow: Math.round(ocf),
        capitalExpenditure: Math.round(-capex),
        freeCashFlow: Math.round(ocf - capex),
        commonDividendsPaid: 0,
        commonStockRepurchased: Math.round(-rev * 0.02),
        netDebtIssuance: 0,
      });
    }
  }
  return out;
}

function ratios(sym, ttm) {
  const q = quote(sym);
  const [inc] = statements(sym, 'income', 1);
  const [bal] = statements(sym, 'balance', 1);
  const pe = round(q.price / inc.epsDiluted, 2);
  const ps = round(q.marketCap / inc.revenue, 2);
  const pb = round(q.marketCap / bal.totalStockholdersEquity, 2);
  const gm = round(inc.grossProfit / inc.revenue, 4);
  const om = round(inc.operatingIncome / inc.revenue, 4);
  const nm = round(inc.netIncome / inc.revenue, 4);
  const de = round(bal.totalDebt / bal.totalStockholdersEquity, 4);
  const roe = round(inc.netIncome / bal.totalStockholdersEquity, 4);
  const evEbitda = round((q.marketCap + bal.netDebt) / inc.ebitda, 2);
  const evSales = round((q.marketCap + bal.netDebt) / inc.revenue, 2);
  const s = ttm ? 'TTM' : '';
  return {
    symbol: sym,
    ...(ttm ? {} : { date: inc.date, fiscalYear: inc.fiscalYear, period: 'FY' }),
    [`priceToEarningsRatio${s}`]: pe,
    [`peRatio${s}`]: pe,
    [`priceEarningsRatio${s}`]: pe,
    [`priceToSalesRatio${s}`]: ps,
    [`priceSalesRatio${s}`]: ps,
    [`psRatio${s}`]: ps,
    [`priceToBookRatio${s}`]: pb,
    [`priceBookValueRatio${s}`]: pb,
    [`pbRatio${s}`]: pb,
    [`grossProfitMargin${s}`]: gm,
    [`operatingProfitMargin${s}`]: om,
    [`netProfitMargin${s}`]: nm,
    [`debtToEquityRatio${s}`]: de,
    [`debtEquityRatio${s}`]: de,
    [`debtToEquity${s}`]: de,
    [`currentRatio${s}`]: 1.5,
    [`returnOnEquity${s}`]: roe,
    [`dividendYield${s}`]: 0,
    [`netIncomePerShare${s}`]: inc.epsDiluted,
    [`eps${s}`]: inc.epsDiluted,
    [`enterpriseValueOverEBITDA${s}`]: evEbitda,
    [`evToEbitda${s}`]: evEbitda,
    [`enterpriseValueOverRevenue${s}`]: evSales,
    [`evToSales${s}`]: evSales,
    [`marketCap${s}`]: q.marketCap,
    marketCap: q.marketCap,
    _sample: true,
  };
}

const MOVER_SYMBOLS = [
  'AAPL',
  'MSFT',
  'NVDA',
  'AMZN',
  'GOOGL',
  'META',
  'TSLA',
  'AMD',
  'NFLX',
  'INTC',
  'JPM',
  'XOM',
];
function movers(kind) {
  const rows = MOVER_SYMBOLS.map((s) => quote(s)).map((q) => ({
    symbol: q.symbol,
    name: q.name,
    price: q.price,
    change: q.change,
    changesPercentage: q.changePercentage,
    changePercentage: q.changePercentage,
    exchange: 'SAMPLE',
    _sample: true,
  }));
  if (kind === 'biggest-gainers')
    return rows.sort((a, b) => b.changesPercentage - a.changesPercentage).slice(0, 8);
  if (kind === 'biggest-losers')
    return rows.sort((a, b) => a.changesPercentage - b.changesPercentage).slice(0, 8);
  return rows.slice(0, 8);
}

const SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Industrials',
  'Communication Services',
  'Consumer Defensive',
  'Energy',
  'Basic Materials',
  'Real Estate',
  'Utilities',
];

/**
 * The sample body for an FMP URL, or undefined when that endpoint has no sample.
 * @param {string} url
 */
export function sampleForFmpUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  const path = u.pathname.replace(/^\/(stable|api\/v3|api\/v4)\//, '');
  const symParam = (
    u.searchParams.get('symbol') ||
    u.searchParams.get('symbols') ||
    ''
  ).toUpperCase();
  const syms = symParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 60);
  const sym = syms[0];
  const limit = Number(u.searchParams.get('limit')) || 5;
  switch (path) {
    case 'quote':
    case 'batch-quote':
    case 'quote-short':
      return syms.map(quote);
    case 'profile':
      return sym ? [profile(sym)] : undefined;
    case 'income-statement':
      return sym ? statements(sym, 'income', limit) : undefined;
    case 'balance-sheet-statement':
      return sym ? statements(sym, 'balance', limit) : undefined;
    case 'cash-flow-statement':
      return sym ? statements(sym, 'cash', limit) : undefined;
    case 'ratios-ttm':
    case 'key-metrics-ttm':
      return sym ? [ratios(sym, true)] : undefined;
    case 'ratios':
    case 'key-metrics':
      return sym ? [ratios(sym, false)] : undefined;
    case 'historical-price-eod/full':
      return sym
        ? series(sym, u.searchParams.get('from'), u.searchParams.get('to'))
            .reverse()
            .map((b) => ({
              symbol: sym,
              ...b,
              change: round(b.close - b.open),
              changePercent: round(((b.close - b.open) / b.open) * 100),
              vwap: round((b.high + b.low + b.close) / 3),
              _sample: true,
            }))
        : undefined;
    case 'historical-price-eod/light':
      return sym
        ? series(sym, u.searchParams.get('from'), u.searchParams.get('to'))
            .reverse()
            .map((b) => ({ symbol: sym, date: b.date, price: b.close, volume: b.volume }))
        : undefined;
    case 'historical-chart/5min':
    case 'historical-chart/15min':
    case 'historical-chart/1hour': {
      if (!sym) return undefined;
      const q = quote(sym);
      const r = seeded(`${sym}:intraday`);
      const today = iso(new Date());
      const out = [];
      let p = q.open;
      for (let m = 0; m < 78; m += 1) {
        const mins = 9 * 60 + 30 + m * 5;
        const t = `${today} ${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`;
        const next = m === 77 ? q.price : round(p * (1 + (r() - 0.5) * 0.004));
        out.push({
          date: t,
          open: p,
          high: round(Math.max(p, next) * 1.001),
          low: round(Math.min(p, next) * 0.999),
          close: next,
          volume: Math.round(2e4 + r() * 2e5),
        });
        p = next;
      }
      return out.reverse();
    }
    case 'biggest-gainers':
    case 'biggest-losers':
    case 'most-actives':
      return movers(path);
    case 'sector-performance-snapshot':
    case 'sector-performance':
      return SECTORS.map((sector) => ({
        date: iso(new Date()),
        sector,
        exchange: 'SAMPLE',
        averageChange: round((seeded(`${sector}:${iso(new Date())}`)() - 0.5) * 3, 2),
        _sample: true,
      }));
    default:
      return undefined;
  }
}
