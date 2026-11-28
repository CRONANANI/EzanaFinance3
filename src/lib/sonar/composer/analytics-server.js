/**
 * Sonar 6.2 (Nov 28 2026): analytical executors that read validated data. SERVER ONLY.
 *
 *   runScreen            financial-screen       GICS sector (ticker_sectors) or named tickers
 *                                               -> filters on filed SEC figures, federal
 *                                               obligations, Form 4 purchases, STOCK Act
 *                                               purchases, LD-2 lobbying -> ranking (any of
 *                                               those, or distinct 13F managers)
 *   runComparison        company-comparison     2 to 8 named companies on filed annual ratios,
 *                                               leaders per metric, fiscal-year alignment
 *   runGovDependence     government-dependence  federal obligations by fiscal year and agency
 *                                               (USAspending) against filed annual revenue
 *
 * Each returns the composer analysis shape ({ output, title, coverage, table, columns,
 * limitations, text, ... }); `text` becomes cited evidence for the writer and `table` with
 * `columns` renders in the report. Reads go through the admin client on public datasets
 * only; nothing here touches a user's or an organization's data.
 */

import { companyRatios, ttmFigure, valuationRatios } from './calc.js';
import { universeFor, dodDefined, industryMembers } from './industries.js';
import { MACRO_VERSION, inflationTrend, policyChanges, realPolicyRate } from './macro.js';
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { fetchRevenueMix } from '@/lib/sonar/revenue-mix';
import { normalizeUniverse } from './ownership.js';
import {
  pageAll,
  rankInstitutionalOwnershipForUniverse,
  securityMaster,
} from './ownership-server.js';
import {
  SCREEN_MEASURES,
  SCREEN_VERSION,
  applyScreen,
  compareCompanies,
  governmentDependence,
  screenSources,
} from './screen.js';

const RATIO_CONCEPTS = [
  'revenue',
  'gross_profit',
  'operating_income',
  'net_income',
  'operating_cash_flow',
  'capex',
];
const INSTANT_CONCEPTS = ['equity', 'long_term_debt'];
const MAX_UNIVERSE = 1200;
const MAX_RANKED_13F = 150;
const chunk = (xs, n) => {
  const out = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};
const usd = (v) => {
  if (v == null || !Number.isFinite(v)) return 'N/A';
  const a = Math.abs(v);
  const s =
    a >= 1e12
      ? `${(a / 1e12).toFixed(2)}T`
      : a >= 1e9
        ? `${(a / 1e9).toFixed(2)}B`
        : a >= 1e6
          ? `${(a / 1e6).toFixed(1)}M`
          : a >= 1e3
            ? `${(a / 1e3).toFixed(0)}K`
            : a.toFixed(0);
  return `${v < 0 ? '-' : ''}$${s}`;
};
const pct = (v) => (v == null || !Number.isFinite(v) ? 'N/A' : `${(v * 100).toFixed(1)}%`);
const fmt = (unit, v) =>
  unit === 'pct'
    ? pct(v)
    : unit === 'usd'
      ? usd(v)
      : unit === 'x'
        ? v == null
          ? 'N/A'
          : v.toFixed(2)
        : v == null
          ? 'N/A'
          : String(v);

/* ── filed figures, paged (a sector can hold 1,000+ companies) ─────────── */

export async function filedFiguresPaged(admin, tickers, now = new Date()) {
  const out = {};
  if (!tickers.length) return out;
  const since = new Date(now.getTime() - 3.2 * 365 * 86400000).toISOString().slice(0, 10);
  for (const batch of chunk(tickers, 200)) {
    const [annual, instant] = await Promise.all([
      pageAll(() =>
        admin
          .from('sec_fundamentals')
          .select('ticker, concept, period_end, value')
          .in('ticker', batch)
          .in('concept', RATIO_CONCEPTS)
          .eq('period_type', 'annual')
          .gte('period_end', since)
          .order('ticker', { ascending: true })
          .order('concept', { ascending: true })
          .order('period_end', { ascending: false }),
      ),
      pageAll(() =>
        admin
          .from('sec_fundamentals')
          .select('ticker, concept, period_end, value')
          .in('ticker', batch)
          .in('concept', INSTANT_CONCEPTS)
          .eq('period_type', 'instant')
          .gte('period_end', since)
          .order('ticker', { ascending: true })
          .order('concept', { ascending: true })
          .order('period_end', { ascending: false }),
      ),
    ]);
    for (const r of annual) {
      const v = Number(r.value);
      if (!Number.isFinite(v)) continue;
      const t = (out[r.ticker] ||= { annual: {}, instant: {} });
      const list = (t.annual[r.concept] ||= []);
      if (!list.some((x) => x.end === r.period_end)) list.push({ end: r.period_end, value: v });
    }
    for (const r of instant) {
      const v = Number(r.value);
      if (!Number.isFinite(v)) continue;
      const t = (out[r.ticker] ||= { annual: {}, instant: {} });
      if (!t.instant[r.concept]) t.instant[r.concept] = { end: r.period_end, value: v };
    }
  }
  for (const t of Object.values(out))
    for (const list of Object.values(t.annual)) list.sort((a, b) => (a.end < b.end ? 1 : -1));
  return out;
}

/* ── Sonar 6.4: authorized prices and valuation ──────────────────────────── */

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
/* One quote per company when the bulk endpoint is refused: keep the count bounded. */
const MAX_VALUED = 150;

const quoteRow = (q) => {
  const price = Number(q?.price);
  if (!q?.symbol || !Number.isFinite(price) || price <= 0) return null;
  const ts = Number(q.timestamp);
  return [
    String(q.symbol).toUpperCase().replace(/-/g, '.'),
    {
      price,
      asOf: Number.isFinite(ts)
        ? new Date(ts * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    },
  ];
};

/**
 * Authorized prices from FMP with the quote time kept: { TICKER: { price, asOf } }.
 * The bulk endpoint answers 402 on Ezana's current FMP plan (sector-detail.js, Oct 30),
 * so a refusal falls back to one /quote per symbol, 8 in flight.
 */
async function fmpQuotes(tickers) {
  const key = process.env.FMP_API_KEY || '';
  const out = {};
  const list = [...new Set(tickers)];
  if (!key || !list.length) return out;
  const sym = (t) => t.replace(/\./g, '-');
  let refused = false;
  for (const group of chunk(list, 100)) {
    try {
      const res = await fetchWithTimeout(
        `${FMP_STABLE}/batch-quote?symbols=${encodeURIComponent(group.map(sym).join(','))}&apikey=${encodeURIComponent(key)}`,
        { cache: 'no-store' },
        8000,
      );
      if (res.status === 402 || res.status === 403) {
        refused = true;
        break;
      }
      if (!res.ok) continue;
      const rows = await res.json();
      for (const q of Array.isArray(rows) ? rows : []) {
        const r = quoteRow(q);
        if (r) out[r[0]] = r[1];
      }
    } catch {
      /* a failed group leaves its tickers without a price (counted, never guessed) */
    }
  }
  if (!refused) return out;
  const queue = [...list];
  const worker = async () => {
    while (queue.length) {
      const t = queue.shift();
      try {
        const res = await fetchWithTimeout(
          `${FMP_STABLE}/quote?symbol=${encodeURIComponent(sym(t))}&apikey=${encodeURIComponent(key)}`,
          { cache: 'no-store' },
          6000,
        );
        if (!res.ok) continue;
        const rows = await res.json();
        const r = quoteRow(Array.isArray(rows) ? rows[0] : rows);
        if (r) out[t] = r[1];
      } catch {
        /* no price for this ticker */
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, list.length) }, worker));
  return out;
}

let quoteProvider = fmpQuotes;
/** Tests and evaluations supply their own authorized prices. */
export function setQuoteProvider(fn) {
  quoteProvider = typeof fn === 'function' ? fn : fmpQuotes;
}

/**
 * Sonar 6.4 hardening: prices for a screen without one live request per company.
 * Closes already stored in price_data_cache (written by the price sync jobs from the same
 * licensed sources) within the 7-day staleness limit are used first, for every company;
 * live quotes are requested only for the companies the cache does not hold, the largest
 * `liveCap` by `sizeOf` (filed revenue). Companies left without a price are returned as
 * `unchecked`, so the screen reports itself as bounded instead of complete.
 * @returns {{ prices: Record<string,{price,asOf,source}>, cached: number, live: number,
 *   unchecked: string[] }}
 */
export async function pricesFor(
  admin,
  tickers,
  { now = new Date(), liveCap = MAX_VALUED, sizeOf = () => -1 } = {},
) {
  const prices = {};
  const since = new Date(now.getTime() - 10 * 86400000).toISOString().slice(0, 10);
  const asOf = now.toISOString().slice(0, 10);
  for (const batch of chunk([...new Set(tickers)], 200)) {
    let rows = [];
    try {
      rows = await pageAll(() =>
        admin
          .from('price_data_cache')
          .select('ticker, date, close')
          .in('ticker', batch)
          .gte('date', since)
          .lte('date', asOf)
          .order('ticker', { ascending: true })
          .order('date', { ascending: false }),
      );
    } catch {
      rows = [];
    }
    for (const r of rows || []) {
      const c = r.close == null || r.close === '' ? NaN : Number(r.close);
      if (!Number.isFinite(c) || c <= 0 || prices[r.ticker]) continue;
      prices[r.ticker] = { price: c, asOf: String(r.date).slice(0, 10), source: 'cache' };
    }
  }
  const cached = Object.keys(prices).length;
  const missing = tickers.filter((t) => !prices[t]);
  const ask = [...missing].sort((x, y) => sizeOf(y) - sizeOf(x)).slice(0, liveCap);
  const live = ask.length
    ? (await Promise.resolve(quoteProvider(ask)).catch(() => ({}))) || {}
    : {};
  for (const t of ask) if (live[t]) prices[t] = { ...live[t], source: 'live' };
  const askedSet = new Set(ask);
  return {
    prices,
    cached,
    live: ask.filter((t) => live[t]).length,
    asked: ask.length,
    unchecked: missing.filter((t) => !askedSet.has(t)),
  };
}

/**
 * TTM net income and revenue, the latest filed share count and a price for each ticker,
 * then P/E, P/S, earnings yield and market cap (calc.js). Filed periods after the price
 * date are never used.
 * @returns {{ values: Record<string, object>, priceSource: string }}
 */
export async function valuationFor(admin, tickers, figs, now = new Date(), given = null) {
  const asOf = now.toISOString().slice(0, 10);
  const since = new Date(now.getTime() - 2.5 * 365 * 86400000).toISOString().slice(0, 10);
  const quarters = {};
  const shares = {};
  for (const batch of chunk(tickers, 200)) {
    const [q, sh] = await Promise.all([
      pageAll(() =>
        admin
          .from('sec_fundamentals')
          .select('ticker, concept, period_end, value')
          .in('ticker', batch)
          .in('concept', ['net_income', 'revenue'])
          .eq('period_type', 'quarter')
          .gte('period_end', since)
          .order('ticker', { ascending: true })
          .order('period_end', { ascending: false }),
      ),
      pageAll(() =>
        admin
          .from('sec_fundamentals')
          .select('ticker, period_end, value')
          .in('ticker', batch)
          .eq('concept', 'shares_outstanding')
          .eq('period_type', 'instant')
          .gte('period_end', since)
          .order('ticker', { ascending: true })
          .order('period_end', { ascending: false }),
      ),
    ]);
    for (const r of q) {
      if (r.value == null || r.value === '') continue;
      const v = Number(r.value);
      if (!Number.isFinite(v)) continue;
      ((quarters[r.ticker] ||= {})[r.concept] ||= []).push({ end: r.period_end, value: v });
    }
    for (const r of sh) {
      if (r.value == null || r.value === '') continue;
      const v = Number(r.value);
      if (!Number.isFinite(v) || r.period_end > asOf) continue;
      if (!shares[r.ticker] || r.period_end > shares[r.ticker].end)
        shares[r.ticker] = { end: r.period_end, value: v };
    }
  }
  const prices = given || (await Promise.resolve(quoteProvider(tickers)).catch(() => ({}))) || {};
  const values = {};
  for (const t of tickers) {
    const f = figs[t] || { annual: {} };
    const ni = ttmFigure(f.annual?.net_income || [], quarters[t]?.net_income || [], { asOf });
    const rev = ttmFigure(f.annual?.revenue || [], quarters[t]?.revenue || [], { asOf });
    const v = valuationRatios({ ni, rev, shares: shares[t], price: prices[t], asOf });
    values[t] = {
      pe: v.pe,
      ps: v.ps,
      earnings_yield: v.earningsYield,
      market_cap: v.marketCap,
      peStatus: v.peStatus,
      valuationStale: v.stale,
      valuationMissing: v.missing,
      ttmThrough: ni.through,
      ttmMethod: ni.method,
      ttmNetIncome: ni.value,
      ttmRevenue: rev.value,
      priceAsOf: prices[t]?.asOf || null,
      price: prices[t]?.price ?? null,
      sharesAsOf: shares[t]?.end || null,
    };
  }
  return { values };
}

/** Why a company has no valuation, in words (for the limitations). */
function valuationGaps(tickers, values) {
  const neg = [];
  const stale = [];
  const missing = [];
  for (const t of tickers) {
    const v = values[t] || {};
    if (v.peStatus === 'negative') neg.push(t);
    if (v.valuationStale?.length) stale.push(`${t} (${v.valuationStale.join(', ')})`);
    if (v.valuationMissing?.length) missing.push(`${t} (no ${v.valuationMissing.join(', ')})`);
  }
  return [
    neg.length
      ? `P/E is not meaningful for zero or negative trailing earnings, so these companies are left out of any P/E filter or ranking and shown with their (negative) earnings yield instead: ${neg.join(', ')}.`
      : null,
    stale.length
      ? `Valuation withheld on stale inputs (filed figures more than 270 days old, a share count more than 200 days old or a price more than 7 days old): ${stale.slice(0, 12).join('; ')}${stale.length > 12 ? `; and ${stale.length - 12} more` : ''}.`
      : null,
    missing.length
      ? `No valuation where an input is missing: ${missing.slice(0, 12).join('; ')}${missing.length > 12 ? `; and ${missing.length - 12} more` : ''}.`
      : null,
  ].filter(Boolean);
}

/* ── Sonar 6.4: verified universes ─────────────────────────────────────── */

/**
 * The tickers a universe id names, from verified data only.
 * @returns {{ tickers: string[], label: string, notes: string[] }}
 */
async function resolveUniverse(admin, id, now, country = null) {
  const u = universeFor(id);
  if (u.kind === 'unsupported') throw new Error(u.reason);
  /* Sonar 6.4 hardening: a country-qualified universe ("Canadian banks") is the industry
     members whose EDGAR business address is in that country; never the whole industry. */
  if (country) {
    const base = await resolveUniverse(admin, id, now, null);
    let rows = [];
    try {
      rows = await pageAll(() =>
        admin
          .from('company_industry')
          .select('ticker, business_country')
          .in('ticker', base.tickers)
          .order('ticker', { ascending: true }),
      );
    } catch {
      throw new Error(
        'Company business addresses are not classified in Ezana\u2019s data yet, so a country-specific universe cannot be established; Sonar does not substitute the whole industry.',
      );
    }
    const classified = rows.filter((r) => r.business_country != null);
    const tickers = classified.filter((r) => r.business_country === country).map((r) => r.ticker);
    const label = `${base.label}, business address in ${country === 'CA' ? 'Canada' : country === 'US' ? 'the United States' : country}`;
    if (!tickers.length)
      throw new Error(
        `No companies in ${base.label} have a business address in ${country === 'CA' ? 'Canada' : country} in Ezana\u2019s classified data (${classified.length} of ${base.tickers.length} members have a classified address), so that universe cannot be screened; Sonar does not substitute the whole industry.`,
      );
    return {
      tickers,
      label,
      notes: [
        ...base.notes,
        `Country from each registrant's EDGAR business address; ${base.tickers.length - classified.length} of ${base.tickers.length} industry members have no classified address and are not included.`,
      ],
      unclassifiedCountry: base.tickers.length - classified.length,
    };
  }
  if (u.kind === 'gics') {
    const rows = await pageAll(() =>
      admin
        .from('ticker_sectors')
        .select('ticker')
        .eq('sector', u.sector)
        .order('ticker', { ascending: true }),
    );
    return { tickers: rows.map((r) => r.ticker), label: `GICS sector ${u.sector}`, notes: [] };
  }
  const notes = [];
  let classified = [];
  let classificationOk = true;
  try {
    const rows = await pageAll(() =>
      admin
        .from('company_industry')
        .select('ticker, sic')
        .in('sic', u.def.sic)
        .order('ticker', { ascending: true }),
    );
    classified = industryMembers(u.def, rows);
  } catch {
    classificationOk = false;
  }
  let defined = [];
  if (u.def.data === 'dod_awards') {
    const fy = completeFederalFy(now);
    const rows = await pageAll(() =>
      admin
        .from('company_contract_history')
        .select('ticker, awarding_agency, total_amount')
        .eq('fiscal_year', fy)
        .order('ticker', { ascending: true }),
    ).catch(() => []);
    defined = dodDefined(rows);
    notes.push(u.def.note);
  }
  const tickers = [...new Set([...classified, ...defined])].sort();
  if (!tickers.length) {
    throw new Error(
      classificationOk
        ? `No companies are classified as ${u.def.label} in Ezana's data yet, so that universe cannot be established; Sonar does not substitute a broader sector.`
        : `Industry classification is not loaded yet, so the ${u.def.label} universe cannot be established; Sonar does not substitute a broader sector.`,
    );
  }
  if (!classificationOk)
    notes.push(
      'SEC industry codes are not loaded yet; the universe is the companies the contract data defines only.',
    );
  return { tickers, label: u.def.label, notes };
}

/* ── event and money sources, for a set of tickers ─────────────────────── */

/* The latest complete federal fiscal year (it ends September 30): a year still in
   progress is never compared with a full one. */
export function completeFederalFy(now = new Date()) {
  return now.getUTCMonth() >= 9 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

async function contractsByTicker(admin, tickers, now = new Date()) {
  const fyWanted = completeFederalFy(now);
  const out = {};
  for (const batch of chunk(tickers, 200)) {
    const rows = await pageAll(() =>
      admin
        .from('company_contract_history')
        .select('ticker, fiscal_year, total_amount')
        .in('ticker', batch)
        .order('ticker', { ascending: true })
        .order('fiscal_year', { ascending: false }),
    );
    /* One fiscal year for every company, so the ranking compares like with like. */
    for (const r of rows) {
      if (Number(r.fiscal_year) !== fyWanted) continue;
      out[r.ticker] = (out[r.ticker] || 0) + (Number(r.total_amount) || 0);
    }
  }
  return out;
}

async function insiderPurchases(admin, tickers, sinceDate) {
  const out = {};
  for (const batch of chunk(tickers, 200)) {
    const rows = await pageAll(() =>
      admin
        .from('sec_insider_transactions')
        .select('issuer_ticker, value_usd')
        .in('issuer_ticker', batch)
        .eq('transaction_code', 'P')
        .gte('transaction_date', sinceDate)
        .order('accession_no', { ascending: true }),
    );
    for (const r of rows)
      out[r.issuer_ticker] = (out[r.issuer_ticker] || 0) + (Number(r.value_usd) || 0);
  }
  return out;
}

async function congressBuyers(admin, tickers, sinceDate) {
  const sets = {};
  for (const batch of chunk(tickers, 200)) {
    const rows = await pageAll(() =>
      admin
        .from('congress_trades')
        .select('ticker, bioguide_id, type')
        .in('ticker', batch)
        .gte('transaction_date', sinceDate)
        .order('id', { ascending: true }),
    );
    for (const r of rows) {
      if (!/purchase|buy/i.test(String(r.type || ''))) continue;
      (sets[r.ticker] ||= new Set()).add(r.bioguide_id);
    }
  }
  return Object.fromEntries(Object.entries(sets).map(([t, s]) => [t, s.size]));
}

async function lobbyingSpend(admin, tickers) {
  const out = {};
  const names = {};
  for (const batch of chunk(tickers, 200)) {
    const { data, error } = await admin
      .from('lobbying_client_tickers')
      .select('client_name, ticker, verified')
      .in('ticker', batch)
      .eq('verified', true)
      .limit(2000);
    if (error) throw new Error('Lobbying clients could not be read');
    for (const r of data || []) names[r.client_name] ||= r.ticker;
  }
  const clients = Object.keys(names);
  if (!clients.length) return { values: out, year: null };
  const { data: yr } = await admin
    .from('lobbying_filings')
    .select('filing_year')
    .order('filing_year', { ascending: false })
    .limit(1);
  /* The latest year with all four quarters is the one before the newest year on file. */
  const year = yr?.[0]?.filing_year ? Number(yr[0].filing_year) - 1 : null;
  if (!year) return { values: out, year: null };
  for (const batch of chunk(clients, 150)) {
    const rows = await pageAll(() =>
      admin
        .from('lobbying_filings')
        .select('client_name, amount')
        .in('client_name', batch)
        .eq('filing_year', year)
        .order('uuid', { ascending: true }),
    );
    for (const r of rows) {
      const t = names[r.client_name];
      if (t) out[t] = (out[t] || 0) + (Number(r.amount) || 0);
    }
  }
  return { values: out, year };
}

async function holders13f(admin, tickers, issuers) {
  const holdings = tickers.map((t) => ({ ticker: t, issuer: issuers[t] || t }));
  const master = await securityMaster(admin, tickers);
  const universe = normalizeUniverse(holdings, master);
  if (!universe.eligible.length) return { values: {}, period: null };
  const ranked = await rankInstitutionalOwnershipForUniverse(admin, {
    universe,
    metric: 'managers',
    comparePrior: false,
  });
  const out = {};
  for (const r of ranked.rows || []) if (r.ticker) out[r.ticker] = r.managers ?? null;
  return { values: out, period: ranked.period || ranked.meta?.period || null };
}

/* ── financial-screen ──────────────────────────────────────────────────── */

export async function runScreen(admin, att, { now = new Date() } = {}) {
  const p = att.params || {};
  const filters = Array.isArray(p.filters) ? p.filters : [];
  const rankBy = p.rank_by || null;
  const direction = p.direction === 'ascending' ? 'ascending' : 'descending';
  const topN = Math.min(50, Math.max(1, Number(p.top_n) || 15));
  const windowDays = Math.min(730, Math.max(7, Number(p.window_days) || 90));
  const since = new Date(now.getTime() - windowDays * 86400000).toISOString().slice(0, 10);

  /* Universe: named tickers, an exact GICS sector, or a verified industry (6.4). */
  let universe = [];
  let universeLabel = '';
  const universeNotes = [];
  if (Array.isArray(p.tickers) && p.tickers.length) {
    universe = p.tickers.slice(0, 60).map((t) => ({ ticker: String(t).toUpperCase() }));
    universeLabel = `${universe.length} named companies`;
  } else if (p.sector) {
    const u = await resolveUniverse(admin, p.sector, now, p.country || null);
    universe = u.tickers.map((t) => ({ ticker: t }));
    universeLabel = u.label;
    universeNotes.push(...u.notes);
  } else {
    throw new Error('The screen has no universe: name a sector, an industry or companies.');
  }
  const fullUniverse = universe.length;
  if (universe.length > MAX_UNIVERSE) universe = universe.slice(0, MAX_UNIVERSE);

  /* Filed figures for the whole universe (every filter and most rankings need them). */
  const figs = await filedFiguresPaged(
    admin,
    universe.map((u) => u.ticker),
    now,
  );
  const values = {};
  const issuers = {};
  for (const u of universe) {
    const r = companyRatios(figs[u.ticker]);
    values[u.ticker] = r
      ? {
          revenue_growth: r.revenue_growth,
          earnings_growth: r.earnings_growth,
          operating_margin: r.operating_margin,
          fcf: r.fcf,
          debt_to_equity: r.debt_to_equity,
          revenue: r.revenue,
          revenue_prior: r.revenue_prior,
          fiscalYearEnd: r.fiscalYearEnd,
        }
      : {};
  }
  const withFilings = universe.filter((u) => values[u.ticker]?.revenue != null);

  /* Cheap filters first (filed figures), then the event sources only for survivors. */
  const ratioFilters = filters.filter((f) => SCREEN_MEASURES[f.metric]?.source === 'ratios');
  const otherFilters = filters.filter((f) => SCREEN_MEASURES[f.metric]?.source !== 'ratios');
  const stage1 = applyScreen({
    universe: withFilings,
    values,
    filters: ratioFilters,
    rankBy: null,
    topN: 100000,
  });
  let survivors = stage1.rows.map((r) => ({ ticker: r.ticker }));
  const sources = screenSources(otherFilters, rankBy).filter((s) => s !== 'ratios');
  const notes = [];
  const valuationNotes = [];
  let priceCoverage = null;
  let capped13f = 0;
  let lobbyYear = null;
  let period13f = null;
  for (const src of sources) {
    const tick = survivors.map((s) => s.ticker);
    if (!tick.length) break;
    if (src === 'contracts') {
      const v = await contractsByTicker(admin, tick, now);
      for (const t of tick) values[t].contracts = v[t] ?? null;
      notes.push(
        `Federal contracts: value of prime awards that started in federal fiscal year ${completeFederalFy(now)} (the latest complete year, ending September 30), obligated to date, for every company. This is not revenue.`,
      );
    } else if (src === 'valuation') {
      /* Stored closes first for every company; live quotes only for the rest, largest by
         filed revenue first, capped. Companies left unpriced are unchecked (coverage). */
      const pr = await pricesFor(admin, tick, {
        now,
        liveCap: MAX_VALUED,
        sizeOf: (t) => values[t]?.revenue ?? -1,
      });
      priceCoverage = {
        candidates: tick.length,
        cached: pr.cached,
        live: pr.live,
        unchecked: pr.unchecked,
      };
      const valued = tick.filter((t) => pr.prices[t]);
      if (pr.unchecked.length)
        notes.push(
          `Valuation could be checked for ${valued.length} of ${tick.length} remaining companies (${pr.cached} from stored closes, ${pr.live} from live quotes, live quotes capped at ${MAX_VALUED}, largest by filed revenue first); ${pr.unchecked.length} were not checked, so this is not a complete ranking of the universe.`,
        );
      const v = await valuationFor(admin, valued, figs, now, pr.prices);
      for (const t of tick) Object.assign(values[t], v.values[t] || {});
      valuationNotes.push(...valuationGaps(valued, v.values));
      const dates = [...new Set(valued.map((t) => v.values[t]?.priceAsOf).filter(Boolean))].sort();
      if (dates.length)
        notes.push(
          `Prices as of ${dates[dates.length - 1]}${dates.length > 1 ? ` (earliest ${dates[0]})` : ''}; earnings and revenue are trailing twelve months from filed 10-K and 10-Q figures; share counts are the latest filed cover-page counts.`,
        );
    } else if (src === 'insider') {
      const v = await insiderPurchases(admin, tick, since);
      for (const t of tick) values[t].insider = v[t] ?? 0;
    } else if (src === 'congress') {
      const v = await congressBuyers(admin, tick, since);
      for (const t of tick) values[t].congress = v[t] ?? 0;
    } else if (src === 'lobbying') {
      const v = await lobbyingSpend(admin, tick);
      lobbyYear = v.year;
      for (const t of tick) values[t].lobbying = v.values[t] ?? null;
    } else if (src === 'holders13f') {
      /* 13F breadth is the costliest read: only after every other filter, and capped. */
      const ranked = tick.slice(0, MAX_RANKED_13F);
      capped13f = Math.max(0, tick.length - MAX_RANKED_13F);
      if (tick.length > MAX_RANKED_13F)
        notes.push(
          `13F breadth was computed for the first ${MAX_RANKED_13F} of ${tick.length} remaining companies (alphabetical).`,
        );
      const v = await holders13f(admin, ranked, issuers);
      period13f = v.period;
      for (const t of tick) values[t].holders13f = v.values[t] ?? null;
    }
  }
  const final = applyScreen({
    universe: survivors,
    values,
    filters: otherFilters,
    rankBy,
    direction,
    topN,
  });
  /* One funnel across both stages. */
  const funnel = [
    { step: 'universe', label: universeLabel, count: fullUniverse },
    ...(fullUniverse > universe.length
      ? [{ step: 'cap', label: `First ${MAX_UNIVERSE} screened`, count: universe.length }]
      : []),
    { step: 'filings', label: 'With filed annual revenue', count: withFilings.length },
    ...stage1.funnel.slice(1),
    ...final.funnel.slice(1),
  ];
  const rankM = rankBy ? SCREEN_MEASURES[rankBy] : null;
  const shown = [
    ...new Set([...filters.map((f) => f.metric), rankBy].filter((m) => SCREEN_MEASURES[m])),
  ];
  /* Sonar 6.4 quality context, never a filter: company size (market cap when priced,
     otherwise filed revenue), the fiscal year end each figure comes from, and flags for
     growth on a small base, revenue that more than doubled and figures that are stale. */
  const sizeKey = sources.includes('valuation') ? 'market_cap' : 'revenue';
  const shownKeys = new Set(shown.map((m) => SCREEN_MEASURES[m].key));
  const flagsFor = (t) => {
    const v = values[t] || {};
    const out = [];
    if (v.revenue_growth != null && v.revenue_prior != null && v.revenue_prior < 25e6)
      out.push('small base');
    if (v.revenue_growth != null && v.revenue_growth > 1)
      out.push('revenue more than doubled (check for acquisitions)');
    if (v.fiscalYearEnd && (now - Date.parse(v.fiscalYearEnd)) / 86400000 > 456)
      out.push(`stale filing (FY ended ${v.fiscalYearEnd})`);
    if (v.peStatus === 'negative') out.push('negative TTM earnings');
    return out;
  };
  const columns = [
    { key: 'rank', label: '#' },
    { key: 'ticker', label: 'Ticker' },
    ...shown.map((m) => ({
      key: SCREEN_MEASURES[m].key,
      label: SCREEN_MEASURES[m].label,
      unit: SCREEN_MEASURES[m].unit,
    })),
    ...(shownKeys.has(sizeKey)
      ? []
      : [
          {
            key: sizeKey,
            label: sizeKey === 'market_cap' ? 'Market cap' : 'Revenue (latest FY)',
            unit: 'usd',
          },
        ]),
    ...(sources.includes('valuation') && !shownKeys.has('earnings_yield')
      ? [{ key: 'earnings_yield', label: 'Earnings yield (TTM)', unit: 'pct' }]
      : []),
    { key: 'fiscalYearEnd', label: 'FY end' },
    { key: 'flags', label: 'Notes' },
  ];
  const table = final.rows.map((r) => ({
    rank: r.rank,
    ticker: r.ticker,
    ...Object.fromEntries(
      shown.map((m) => [SCREEN_MEASURES[m].key, r.values[SCREEN_MEASURES[m].key] ?? null]),
    ),
    [sizeKey]: values[r.ticker]?.[sizeKey] ?? null,
    earnings_yield: values[r.ticker]?.earnings_yield ?? null,
    fiscalYearEnd: values[r.ticker]?.fiscalYearEnd ?? null,
    flags: flagsFor(r.ticker).join('; ') || null,
  }));
  /* Sonar 6.3: flag growth computed from a tiny prior year (a production screen ranked
     a company first on +2,944% after it bought producing assets). */
  const growthShown = shown.includes('revenue_growth');
  const smallBase = growthShown
    ? final.rows
        .filter((r) => {
          const v = values[r.ticker] || {};
          return (
            v.revenue_growth != null &&
            ((v.revenue_prior != null && v.revenue_prior < 25e6) || v.revenue_growth > 3)
          );
        })
        .map((r) => r.ticker)
    : [];
  const ends = [
    ...new Set(final.rows.map((r) => values[r.ticker]?.fiscalYearEnd).filter(Boolean)),
  ].sort();
  const noFilings = universe.filter((u) => values[u.ticker]?.revenue == null).map((u) => u.ticker);
  const limitations = [
    ...universeNotes,
    noFilings.length
      ? `${noFilings.length} of ${universe.length} companies have no filed annual revenue in Ezana's filed-figure store and could not be evaluated (for example, foreign private issuers reporting under IFRS on Forms 20-F or 40-F, which are not ingested yet): ${noFilings.slice(0, 12).join(', ')}${noFilings.length > 12 ? ` and ${noFilings.length - 12} more` : ''}.`
      : null,
    ends.length > 1
      ? `Filed figures are each company's latest fiscal year, which end between ${ends[0]} and ${ends[ends.length - 1]}; the periods are not the same for every company.`
      : 'Filed figures are the latest fiscal year each company reported.',
    ...valuationNotes,
    sources.includes('contracts')
      ? 'Federal contract figures are the value of prime awards that started in the fiscal year, obligated to date; they are not revenue.'
      : null,
    smallBase.length
      ? `Growth from a small base (prior-year revenue under $25M, or growth above 300%), often after an acquisition or a change of business: ${smallBase.join(', ')}. The arithmetic is correct; the rate says little about the ongoing business.`
      : null,
    sources.includes('insider') || sources.includes('congress')
      ? `Purchases are counted over the last ${windowDays} days.`
      : null,
    lobbyYear
      ? `Lobbying spend is the ${lobbyYear} total of LD-2 filings for clients verified against a ticker; unverified clients are left out.`
      : null,
    period13f ? `13F breadth is the count of distinct managers in the ${period13f} quarter.` : null,
    ...final.unsupported,
    ...stage1.unsupported,
    ...notes,
  ].filter(Boolean);
  /* Sonar 6.4 hardening: machine-readable coverage. A screen is complete only when every
     eligible company was checked against every condition; caps make it bounded. */
  const coverage = screenCoverage({
    eligible: fullUniverse,
    evaluated: universe.length,
    withData: withFilings.length,
    shown: table.length,
    priceCoverage,
    capped13f,
    funnel,
  });
  if (coverage.status === 'bounded')
    limitations.unshift(
      `Bounded screen: ${coverage.unchecked} of ${coverage.eligibleUniverse} eligible companies were not checked against every condition (${coverage.excluded
        .filter((e) => e.kind === 'unchecked')
        .map((e) => `${e.count} ${e.reason}`)
        .join('; ')}). The ranking covers the companies checked, not the whole universe.`,
    );
  const lines = [
    `Financial screen (${SCREEN_VERSION}, calculated): ${universeLabel}.`,
    `Coverage: ${coverage.status} (${coverage.evaluatedCount} of ${coverage.eligibleUniverse} eligible companies evaluated; ${coverage.unchecked} unchecked; ${coverage.unavailable} without the required data).`,
    `Funnel: ${funnel.map((f) => `${f.label} ${f.count}${f.noData ? ` (${f.noData} without the data)` : ''}`).join(' -> ')}.`,
    rankM
      ? `Ranked by ${rankM.label}, ${direction === 'ascending' ? 'lowest' : 'highest'} first.`
      : 'No ranking measure: listed alphabetically.',
    '',
    `| ${columns.map((c) => c.label).join(' | ')} |`,
    `|${columns.map(() => '---').join('|')}|`,
    ...table.map(
      (r) =>
        `| ${columns.map((c) => (c.unit ? fmt(c.unit, r[c.key]) : (r[c.key] ?? ''))).join(' | ')} |`,
    ),
  ];
  return {
    output: 'calculated',
    title: 'Financial Screen',
    version: SCREEN_VERSION,
    coverage,
    funnel,
    columns,
    table,
    rankBy,
    direction,
    limitations,
    text: [...lines, '', ...limitations.map((l) => `Limitation: ${l}`)].join('\n'),
  };
}

/**
 * Coverage metadata for a screen (exported for tests): eligible universe, evaluated count,
 * unchecked (caps: universe cap, unpriced valuation candidates, 13F cap) and unavailable
 * (checked, but without the data a condition needs), the sampling method when a cap
 * applied, and the completeness status:
 *   complete                    every eligible company checked, every one had the data
 *   complete_with_missing_data  every eligible company checked; some lacked data
 *   bounded                     some eligible companies were not checked (never exhaustive)
 */
export function screenCoverage({
  eligible,
  evaluated,
  withData,
  shown,
  priceCoverage,
  capped13f = 0,
  funnel = [],
}) {
  const excluded = [];
  const sampling = [];
  if (eligible > evaluated) {
    excluded.push({
      kind: 'unchecked',
      reason: `beyond the first ${evaluated} companies (alphabetical universe cap)`,
      count: eligible - evaluated,
    });
    sampling.push('alphabetical_universe_cap');
  }
  if (priceCoverage?.unchecked?.length) {
    excluded.push({
      kind: 'unchecked',
      reason: 'not priced (live quotes capped; largest by filed revenue first)',
      count: priceCoverage.unchecked.length,
    });
    sampling.push('largest_by_filed_revenue');
  }
  if (capped13f) {
    excluded.push({
      kind: 'unchecked',
      reason: '13F breadth not computed (cap, alphabetical)',
      count: capped13f,
    });
    sampling.push('alphabetical_13f_cap');
  }
  if (evaluated > withData)
    excluded.push({
      kind: 'unavailable',
      reason: 'no filed annual revenue',
      count: evaluated - withData,
    });
  const noData = funnel.reduce((n, f) => n + (Number(f.noData) || 0), 0);
  if (noData)
    excluded.push({
      kind: 'unavailable',
      reason: 'missing a figure a condition needs',
      count: noData,
    });
  const unchecked = excluded.filter((e) => e.kind === 'unchecked').reduce((n, e) => n + e.count, 0);
  const unavailable = excluded
    .filter((e) => e.kind === 'unavailable')
    .reduce((n, e) => n + e.count, 0);
  return {
    status: unchecked ? 'bounded' : unavailable ? 'complete_with_missing_data' : 'complete',
    exhaustive: unchecked === 0,
    eligibleUniverse: eligible,
    evaluatedCount: evaluated,
    unchecked,
    unavailable,
    excluded,
    sampling: sampling.length ? sampling : null,
    prices: priceCoverage
      ? {
          candidates: priceCoverage.candidates,
          cached: priceCoverage.cached,
          live: priceCoverage.live,
          unchecked: priceCoverage.unchecked.length,
        }
      : null,
    /* earlier keys, kept for consumers */
    selected: eligible,
    withData,
    complete: shown,
  };
}

/* ── company-comparison ────────────────────────────────────────────────── */

const COMPARE_LABEL = {
  revenue_growth: 'Revenue growth',
  earnings_growth: 'Net income growth',
  gross_margin: 'Gross margin',
  operating_margin: 'Operating margin',
  net_margin: 'Net margin',
  fcf_margin: 'FCF margin',
  roe: 'ROE',
  debt_to_equity: 'Debt/equity',
  pe: 'P/E (TTM)',
  ps: 'P/S (TTM)',
  earnings_yield: 'Earnings yield (TTM)',
  market_cap: 'Market cap',
};
const VALUATION_METRICS = new Set(['pe', 'ps', 'earnings_yield', 'market_cap']);
const COMPARE_UNIT = { debt_to_equity: 'x', pe: 'x', ps: 'x', market_cap: 'usd' };

export async function runComparison(admin, att, { now = new Date() } = {}) {
  const tickers = [
    ...new Set((att.params?.tickers || []).map((t) => String(t).toUpperCase())),
  ].slice(0, 8);
  if (tickers.length < 2) throw new Error('A comparison needs at least two resolved companies.');
  const metrics = (
    att.params?.metrics?.length
      ? att.params.metrics
      : ['revenue_growth', 'operating_margin', 'net_margin', 'fcf_margin', 'debt_to_equity']
  ).filter((m) => COMPARE_LABEL[m]);
  /* P/E is undefined for losses: earnings yield is shown beside it, so a loss-maker is
     never just a blank (Sonar 6.4 live validation). */
  if (metrics.includes('pe') && !metrics.includes('earnings_yield')) metrics.push('earnings_yield');
  const figs = await filedFiguresPaged(admin, tickers, now);
  const names = att.params?.names || {};
  /* Sonar 6.4: valuation metrics from TTM figures and an authorized price. */
  const wantsValuation = metrics.some((m) => VALUATION_METRICS.has(m));
  const val = wantsValuation ? await valuationFor(admin, tickers, figs, now) : { values: {} };
  const rows = tickers.map((t) => ({
    ticker: t,
    name: names[t] || t,
    ratios: (() => {
      const r = companyRatios(figs[t]);
      const v = val.values[t];
      return r || v
        ? {
            ...(r || {}),
            ...(v
              ? { pe: v.pe, ps: v.ps, earnings_yield: v.earnings_yield, market_cap: v.market_cap }
              : {}),
          }
        : null;
    })(),
  }));
  const cmp = compareCompanies(rows, metrics);
  /* Valuation is trailing twelve months to the latest filed quarter, not the fiscal year:
     the live run attributed a TTM P/E to a fiscal year end ten months earlier. A
     valuation-only comparison is aligned on the TTM end dates. */
  const valuationOnly = wantsValuation && metrics.every((m) => VALUATION_METRICS.has(m));
  if (valuationOnly) {
    const ends = tickers.map((t) => val.values[t]?.ttmThrough).filter(Boolean);
    const times = ends.map((e) => Date.parse(e));
    cmp.fiscalYearEnds = [...new Set(ends)];
    cmp.aligned = times.length ? (Math.max(...times) - Math.min(...times)) / 86400000 <= 45 : true;
  }
  /* A metric that is undefined by definition (P/E of a loss-maker) is not missing data. */
  cmp.missing = cmp.missing.filter(
    (t) => !(val.values[t]?.peStatus === 'negative' && valuationOnly),
  );
  const columns = [
    { key: 'ticker', label: 'Ticker' },
    valuationOnly
      ? { key: 'ttmThrough', label: 'TTM through' }
      : { key: 'fiscalYearEnd', label: 'Fiscal year end' },
    ...(wantsValuation ? [{ key: 'priceAsOf', label: 'Price date' }] : []),
    ...metrics.map((m) => ({
      key: m,
      label: COMPARE_LABEL[m],
      unit: COMPARE_UNIT[m] || 'pct',
    })),
  ];
  const table = rows.map((r) => ({
    ticker: r.ticker,
    fiscalYearEnd: r.ratios?.fiscalYearEnd || null,
    ttmThrough: val.values[r.ticker]?.ttmThrough || null,
    priceAsOf: val.values[r.ticker]?.priceAsOf || null,
    ...Object.fromEntries(metrics.map((m) => [m, r.ratios?.[m] ?? null])),
  }));
  const limitations = [
    cmp.aligned
      ? null
      : valuationOnly
        ? `The trailing twelve months end on different dates (${cmp.fiscalYearEnds.join(', ')}), so the periods overlap only in part.`
        : `The latest fiscal years end on different dates (${cmp.fiscalYearEnds.join(', ')}), so the periods overlap only in part or not at all.`,
    cmp.missing.length
      ? `Missing filed figures for some metrics: ${cmp.missing.join(', ')}.`
      : null,
    'Margin and leverage ratios are not comparable for banks and insurers.',
    ...(wantsValuation ? valuationGaps(tickers, val.values) : []),
    ...(wantsValuation
      ? [
          `Valuation uses prices as of ${[...new Set(tickers.map((t) => val.values[t]?.priceAsOf).filter(Boolean))].join(', ') || 'N/A'} and trailing twelve months of filed earnings and revenue through ${[...new Set(tickers.map((t) => val.values[t]?.ttmThrough).filter(Boolean))].join(', ') || 'N/A'}.`,
        ]
      : []),
    att.params?.unresolved?.length
      ? `Not matched to a company with SEC filings, so left out: ${att.params.unresolved.join(', ')}.`
      : null,
  ].filter(Boolean);
  const lines = [
    `Company comparison (calculated from filed SEC annual figures): ${tickers.join(', ')}.`,
    ...Object.entries(cmp.leaders).map(
      ([m, t]) =>
        `Leader on ${COMPARE_LABEL[m]}: ${t}${['debt_to_equity', 'pe', 'ps'].includes(m) ? ' (lowest)' : ''}.`,
    ),
    '',
    `| ${columns.map((c) => c.label).join(' | ')} |`,
    `|${columns.map(() => '---').join('|')}|`,
    ...table.map(
      (r) =>
        `| ${columns.map((c) => (c.unit ? fmt(c.unit, r[c.key]) : (r[c.key] ?? 'N/A'))).join(' | ')} |`,
    ),
  ];
  return {
    output: 'calculated',
    title: 'Company Comparison',
    coverage: {
      selected: tickers.length,
      withData: rows.filter((r) => r.ratios?.revenue != null).length,
      complete: tickers.length - cmp.missing.length,
    },
    columns,
    table,
    leaders: cmp.leaders,
    aligned: cmp.aligned,
    limitations,
    text: [...lines, '', ...limitations.map((l) => `Limitation: ${l}`)].join('\n'),
  };
}

/* ── government-dependence ─────────────────────────────────────────────── */

export async function runGovDependence(
  admin,
  att,
  { now = new Date(), fetchMix = fetchRevenueMix } = {},
) {
  const ticker = String(att.params?.ticker || att.subject?.id || '').toUpperCase();
  if (!ticker) throw new Error('Government dependence needs a resolved company ticker.');
  const [rows, figs] = await Promise.all([
    pageAll(() =>
      admin
        .from('company_contract_history')
        .select('fiscal_year, awarding_agency, award_count, total_amount')
        .eq('ticker', ticker)
        .order('fiscal_year', { ascending: false }),
    ),
    filedFiguresPaged(admin, [ticker], now),
  ]);
  if (!rows.length) throw new Error(`No federal contract history is on record for ${ticker}.`);
  const lastFy = completeFederalFy(now);
  const byYearMap = {};
  for (const r of rows.filter((x) => Number(x.fiscal_year) <= lastFy))
    byYearMap[r.fiscal_year] = (byYearMap[r.fiscal_year] || 0) + (Number(r.total_amount) || 0);
  const byYear = Object.entries(byYearMap)
    .map(([fy, total]) => ({ fiscal_year: Number(fy), total }))
    .slice(-6);
  if (!byYear.length)
    throw new Error(`No complete federal fiscal year of contract history for ${ticker} yet.`);
  const latestFy = Math.max(...byYear.map((y) => y.fiscal_year));
  const agencies = rows
    .filter((r) => Number(r.fiscal_year) === latestFy && latestFy <= lastFy)
    .map((r) => ({
      agency: r.awarding_agency,
      total: Number(r.total_amount) || 0,
      awards: Number(r.award_count) || 0,
    }));
  const r = companyRatios(figs[ticker]);
  /* Recognized government revenue: the company's own segment disclosure (10-K), for the
     SAME fiscal year as the filed revenue. A different year is never paired silently. */
  const mix = await Promise.resolve(fetchMix(ticker)).catch(() => null);
  const seg = mix?.annual?.find((p) => r?.fiscalYearEnd && p.date === r.fiscalYearEnd) || null;
  const g = governmentDependence({
    byYear,
    agencies,
    revenue: r?.revenue ?? null,
    fiscalYearEnd: r?.fiscalYearEnd ?? null,
    recognizedGovernmentRevenue: seg ? seg.gov : null,
    recognizedSegmentTotal: seg ? seg.total : null,
  });
  if (seg) g.recognizedLabel = seg.govLabel;
  const columns = [
    { key: 'fiscal_year', label: 'Award start (federal FY)' },
    { key: 'total', label: 'Value of awards started, obligated to date', unit: 'usd' },
  ];
  const fyRange = (fy) => `Oct ${fy - 1} to Sep ${fy}`;
  const limitations = [
    'Each federal prime award is counted once, in the federal fiscal year its performance starts, at the amount obligated on it to date. A year’s figure is the value of awards that began that year, not the money obligated or paid during it, and the latest years keep growing as options are exercised.',
    'This is not recognized government revenue: revenue is recognized as work is delivered, multi-year awards span several company years, and only prime awards matched to the company by recipient name are counted (no subcontracts, grants, other transaction agreements or classified work).',
    g.recognizedGovernmentShare != null
      ? `Recognized government revenue is the company’s ${g.recognizedLabel} segment for the fiscal year ending ${g.fiscalYearEnd}, as reported; the share is of total segment revenue. It covers every government customer the segment includes, not only US federal agencies.`
      : mix?.annual?.length
        ? `The company’s segment disclosure does not cover the fiscal year ending ${g.fiscalYearEnd}, so no recognized government revenue share is given.`
        : 'Ezana could not retrieve a government segment disclosure for this company, so no recognized government revenue share is given here. That does not mean the company does not disclose one; check the segment note of its annual report.',
    g.pairedFiscalYear != null
      ? `The ratio pairs federal FY${g.pairedFiscalYear} (${fyRange(g.pairedFiscalYear)}) with the company’s fiscal year ending ${g.fiscalYearEnd}; they share ${g.pairedOverlapMonths} of 12 months.`
      : null,
    r?.revenue == null ? `No filed annual revenue for ${ticker}, so no ratio was computed.` : null,
  ].filter(Boolean);
  const lines = [
    `Government dependence (calculated): ${ticker}.`,
    `Value of federal prime awards that started in FY${g.latestFiscalYear} (${fyRange(g.latestFiscalYear)}), obligated to date: ${usd(g.latestObligations)}${g.obligationGrowth != null ? ` (${pct(g.obligationGrowth)} vs the FY${g.latestFiscalYear - 1} vintage)` : ''}.`,
    g.revenue != null && g.pairedFiscalYear != null
      ? `Filed annual revenue, fiscal year ending ${g.fiscalYearEnd}: ${usd(g.revenue)}. Awards started in the overlapping FY${g.pairedFiscalYear}: ${usd(g.pairedValue)}, ${pct(g.obligationsToRevenue)} of that revenue (exposure indicator, not a revenue share).`
      : null,
    g.recognizedGovernmentShare != null
      ? `Recognized government revenue (${g.recognizedLabel} segment, fiscal year ending ${g.fiscalYearEnd}): ${usd(g.recognizedGovernmentRevenue)}, ${pct(g.recognizedGovernmentShare)} of segment revenue.`
      : 'Recognized government revenue share: not available for this fiscal year.',
    `Top agencies, FY${g.latestFiscalYear} awards: ${g.topAgencies.map((a) => `${a.agency} ${usd(a.total)} (${pct(a.share)})`).join('; ')}.`,
    g.agencyConcentration != null
      ? `Agency concentration (HHI): ${g.agencyConcentration.toFixed(2)}.`
      : null,
    '',
    '| Award start (federal FY) | Value of awards started, obligated to date |',
    '|---|---|',
    ...g.years.map((y) => `| FY${y.fiscal_year} | ${usd(y.total)} |`),
  ].filter((l) => l !== null);
  return {
    output: 'calculated',
    title: 'Government Dependence',
    coverage: {
      selected: 1,
      withData: g.revenue != null ? 1 : 0,
      complete: g.obligationsToRevenue != null ? 1 : 0,
    },
    columns,
    table: g.years,
    dependence: g,
    limitations,
    text: [...lines, '', ...limitations.map((l) => `Limitation: ${l}`)].join('\n'),
  };
}

/* ── macro-indicators (Sonar 6.4) ──────────────────────────────────────── */

const COUNTRY_NAME = {
  USA: 'United States',
  CAN: 'Canada',
  GBR: 'United Kingdom',
  JPN: 'Japan',
  DEU: 'Germany',
  FRA: 'France',
  ITA: 'Italy',
  CHN: 'China',
  IND: 'India',
  BRA: 'Brazil',
  MEX: 'Mexico',
  AUS: 'Australia',
  TUR: 'Turkey',
  ZAF: 'South Africa',
  KOR: 'South Korea',
  CHE: 'Switzerland',
};

export async function runMacro(admin, att, { now = new Date() } = {}) {
  const p = att.params || {};
  const countries = [...new Set((p.countries || []).map((c) => String(c).toUpperCase()))]
    .filter((c) => /^[A-Z]{3}$/.test(c))
    .slice(0, 8);
  if (!countries.length) throw new Error('Name at least one country with data.');
  const measures = new Set(p.measures?.length ? p.measures : ['inflation']);
  const from = /^\d{4}-\d{2}$/.test(p.from || '') ? p.from : `${now.getUTCFullYear()}-01`;
  const sinceMonth = `${now.getUTCFullYear() - 3}-01`;
  const [cpiRows, polRows, dayRows] = await Promise.all([
    pageAll(() =>
      admin
        .from('macro_series_values')
        .select('country_iso3, period, value')
        .eq('source', 'imf')
        .eq('series_name', 'Consumer price index')
        .eq('frequency', 'M')
        .in('country_iso3', countries)
        .gte('period', sinceMonth)
        .order('country_iso3', { ascending: true })
        .order('period', { ascending: true }),
    ),
    pageAll(() =>
      admin
        .from('macro_series_values')
        .select('country_iso3, period, value')
        .eq('source', 'bis')
        .eq('series_name', 'Central bank policy rates')
        .eq('frequency', 'M')
        .in('country_iso3', countries)
        .gte('period', sinceMonth)
        .order('country_iso3', { ascending: true })
        .order('period', { ascending: true }),
    ),
    measures.has('policy_changes')
      ? pageAll(() =>
          admin
            .from('macro_series_values')
            .select('country_iso3, period, value')
            .eq('source', 'bis')
            .eq('series_name', 'Central bank policy rates')
            .eq('frequency', 'D')
            .in('country_iso3', countries)
            .gte('period', `${now.getUTCFullYear() - 1}-01-01`)
            .order('country_iso3', { ascending: true })
            .order('period', { ascending: true }),
        )
      : Promise.resolve([]),
  ]);
  const group = (rows) => {
    const out = {};
    for (const r of rows) {
      /* A missing observation is null (BIS daily series carry nulls on weekends);
         Number(null) is 0, which read as a policy cut and back every weekend in a live
         run. Missing stays missing. */
      if (r.value == null || r.value === '') continue;
      const v = Number(r.value);
      if (Number.isFinite(v)) (out[r.country_iso3] ||= {})[String(r.period)] = v;
    }
    return out;
  };
  const cpi = group(cpiRows);
  const pol = group(polRows);
  const day = group(dayRows);
  const byCountry = {};
  const missing = [];
  for (const c of countries) {
    if (!cpi[c] && !pol[c]) {
      missing.push(c);
      continue;
    }
    const t = cpi[c] ? inflationTrend(cpi[c]) : null;
    const r = cpi[c] && pol[c] ? realPolicyRate(pol[c], cpi[c]) : null;
    const ch =
      pol[c] || day[c] ? policyChanges({ daily: day[c], monthly: pol[c] }, { from }) : null;
    byCountry[c] = {
      country: COUNTRY_NAME[c] || c,
      latestYoYPeriod: t?.latestYoYPeriod ?? null,
      latestYoY: t?.latestYoY ?? null,
      annualized3m: t?.annualized3m ?? null,
      yoySixMonthsEarlier: t?.yoySixMonthsEarlier ?? null,
      direction: t?.direction ?? null,
      accelerating: t ? t.accelerating : null,
      gapNote: t?.gapNote ?? null,
      policyRate: ch?.latest?.value ?? null,
      policyRateDate: ch?.latest?.date ?? null,
      realRate: r?.realRate ?? null,
      realRatePeriod: r?.realRatePeriod ?? null,
      changesThisYear: ch ? ch.count : null,
      netChangeThisYear: ch ? ch.net : null,
      changes: ch?.changes || [],
      changeBasis: ch?.basis || null,
    };
  }
  if (!Object.keys(byCountry).length)
    throw new Error(
      `No inflation or policy rate series are in Ezana's data for ${countries.join(', ')}.`,
    );
  const pct = (v) => (v == null ? 'N/A' : `${(v * 100).toFixed(1)}%`);
  const pp = (v) => (v == null ? 'N/A' : `${v.toFixed(2)}%`);
  const columns = [
    { key: 'country', label: 'Country' },
    { key: 'latestYoYPeriod', label: 'CPI month' },
    { key: 'latestYoY', label: 'Inflation, y/y', unit: 'pct' },
    { key: 'annualized3m', label: '3-month annualised', unit: 'pct' },
    { key: 'yoySixMonthsEarlier', label: 'y/y six months earlier', unit: 'pct' },
    { key: 'direction', label: 'Trend' },
    { key: 'policyRateLabel', label: 'Policy rate' },
    { key: 'realRateLabel', label: 'Real policy rate' },
    ...(measures.has('policy_changes')
      ? [{ key: 'changesLabel', label: `Changes since ${from}` }]
      : []),
  ];
  const table = Object.entries(byCountry).map(([iso, x]) => ({
    iso3: iso,
    country: x.country,
    latestYoYPeriod: x.latestYoYPeriod,
    latestYoY: x.latestYoY,
    annualized3m: x.annualized3m,
    yoySixMonthsEarlier: x.yoySixMonthsEarlier,
    direction: x.direction,
    policyRateLabel: x.policyRate != null ? `${pp(x.policyRate)} (${x.policyRateDate})` : 'N/A',
    realRateLabel: x.realRate != null ? `${pp(x.realRate)} (${x.realRatePeriod})` : 'N/A',
    changesLabel:
      x.changesThisYear != null
        ? x.changes.length
          ? x.changes
              .map((c) => `${c.date} ${c.change > 0 ? '+' : ''}${c.change.toFixed(2)}`)
              .join(', ')
          : 'none'
        : 'N/A',
  }));
  const limitations = [
    'Inflation is the year-on-year change of the IMF consumer price index (not seasonally adjusted); the 3-month annualised rate on an unadjusted index is noisy and can move with seasonal patterns.',
    'The real policy rate subtracts year-on-year inflation for the same month as the policy rate; it is backward-looking (not inflation expectations).',
    byCountry.USA
      ? 'For the United States, BIS reports the midpoint of the Federal Reserve target range as the policy rate.'
      : null,
    ...Object.values(byCountry)
      .map((x) => x.gapNote && `${x.country}: ${x.gapNote}`)
      .filter(Boolean),
    measures.has('policy_changes')
      ? `Policy changes are read from BIS ${Object.values(byCountry).every((x) => x.changeBasis === 'daily') ? 'daily data (effective dates)' : 'monthly data where daily data does not cover the window (the month each change took effect)'}.`
      : null,
    missing.length ? `No series in Ezana's data for: ${missing.join(', ')}.` : null,
  ].filter(Boolean);
  const lines = [
    `Macro indicators (${MACRO_VERSION}, calculated from IMF and BIS series): ${Object.values(
      byCountry,
    )
      .map((x) => x.country)
      .join(', ')}.`,
    ...Object.values(byCountry).map(
      (x) =>
        `${x.country}: inflation ${pct(x.latestYoY)} year on year in ${x.latestYoYPeriod || 'N/A'}; 3-month annualised ${pct(x.annualized3m)}; ${pct(x.yoySixMonthsEarlier)} six months earlier; trend ${x.direction || 'not determined'}. Policy rate ${x.policyRate != null ? `${pp(x.policyRate)} (${x.policyRateDate})` : 'N/A'}; real policy rate ${x.realRate != null ? `${pp(x.realRate)} in ${x.realRatePeriod}` : 'N/A'}.${
          measures.has('policy_changes') && x.changesThisYear != null
            ? ` Policy changes since ${from}: ${x.changesThisYear}${x.changes.length ? ` (${x.changes.map((c) => `${c.date} ${c.change > 0 ? '+' : ''}${c.change.toFixed(2)} points`).join(', ')})` : ''}, net ${x.netChangeThisYear > 0 ? '+' : ''}${x.netChangeThisYear.toFixed(2)} points.`
            : ''
        }`,
    ),
  ];
  return {
    output: 'calculated',
    title: 'Macro Indicators',
    version: MACRO_VERSION,
    coverage: {
      selected: countries.length,
      withData: Object.keys(byCountry).length,
      complete: Object.values(byCountry).filter((x) => x.latestYoY != null).length,
    },
    columns,
    table,
    macro: { byCountry, measures: [...measures], from },
    limitations,
    text: [...lines, '', ...limitations.map((l) => `Limitation: ${l}`)].join('\n'),
  };
}
