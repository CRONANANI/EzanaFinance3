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
import { DEBT_COMPONENTS } from '../../sec/concept-map.js';
import { indexSuccessions, preferSuccessorFacts } from '../../sec/registrant-map.js';
import { resolveTicker } from '../../sec/security-identity.js';
import {
  MACRO_VERSION,
  inflationTrend,
  macroProvenance,
  policyChanges,
  realPolicyRate,
} from './macro.js';
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
import {
  SEED_SOURCES,
  emptyStage,
  failedStage,
  filterStage,
  stageResult,
  stageRow,
} from './stages.js';
import { evaluate as evaluateCondition, screenEntities } from '../execution/conditions.js';
import { stepResult, entity as stepEntity } from '../execution/envelope.js';
import { evaluateObjective } from '../execution/requirements.js';
import { writerInput, telemetry as executionTelemetry } from '../execution/synthesis.js';
import { PERIOD_SEMANTICS } from '../execution/temporal.js';
import { analyzeStep } from '../execution/gaps.js';

const RATIO_CONCEPTS = [
  'revenue',
  'gross_profit',
  'operating_income',
  'net_income',
  'operating_cash_flow',
  'capex',
];
/* Sonar 6.4 final hardening: debt components for total debt (calc.js totalDebt). */
const INSTANT_CONCEPTS = ['equity', 'long_term_debt', ...DEBT_COMPONENTS];
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
  /* Sonar 6.5. Verified successions (6.4 registrant map): after a predecessor backfill a
     frame both registrants reported must resolve to one fact, the successor's
     (preferSuccessorFacts). Unread or missing table: no successions, nothing preferred,
     which is exactly today's state until the backfill is approved. */
  let successions = new Map();
  try {
    const { data, error } = await admin
      .from('sec_registrant_successions')
      .select(
        'ticker, predecessor_cik, successor_cik, effective_date, relationship, source_accession, verified, applies_from, applies_to',
      )
      .eq('verified', true)
      .limit(500);
    if (!error) successions = indexSuccessions(data || []);
  } catch {
    /* successions unavailable: loaders behave as before */
  }
  /* Same legal entity under another symbol (PSKY and SKYD, CIK 2041610): its filed rows are
     read under the requested symbol, joined only when the filing CIK is the entity's own. */
  const asOf = now.toISOString().slice(0, 10);
  const alt = new Map();
  for (const t of tickers) {
    const r = resolveTicker(t, { asOf });
    if (!r?.cik) continue;
    for (const x of r.lookupTickers)
      if (x !== t && !tickers.includes(x)) alt.set(x, { to: t, cik: r.cik });
  }
  const remap = (rows) => {
    const kept = [];
    for (const r of rows) {
      /* Missing stays missing, and is dropped before the one-fact-per-frame rule so a null
         row can never displace a filed figure. */
      if (r.value == null || r.value === '' || !Number.isFinite(Number(r.value))) continue;
      const a = alt.get(r.ticker);
      if (!a) kept.push(r);
      else if (r.cik && String(r.cik).replace(/^0+/, '') === a.cik)
        kept.push({ ...r, ticker: a.to, filedTicker: r.ticker });
    }
    const keyed = kept.map((r) => ({ ...r, frame: r.period_end }));
    return preferSuccessorFacts(keyed, successions).rows;
  };
  for (const batch0 of chunk(tickers, 200)) {
    const batch = [...batch0, ...[...alt.keys()].filter((x) => batch0.includes(alt.get(x).to))];
    const [annual0, instant0] = await Promise.all([
      pageAll(() =>
        admin
          .from('sec_fundamentals')
          .select('ticker, cik, accession_no, concept, period_end, value, taxonomy_concept')
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
          .select('ticker, cik, accession_no, concept, period_end, value')
          .in('ticker', batch)
          .in('concept', INSTANT_CONCEPTS)
          .eq('period_type', 'instant')
          .gte('period_end', since)
          .order('ticker', { ascending: true })
          .order('concept', { ascending: true })
          .order('period_end', { ascending: false }),
      ),
    ]);
    const annual = remap(annual0);
    const instant = remap(instant0);
    for (const r of annual) {
      /* Missing stays missing: Number(null) is 0 (Sonar 6.4 null audit). */
      if (r.value == null || r.value === '') continue;
      const v = Number(r.value);
      if (!Number.isFinite(v)) continue;
      const t = (out[r.ticker] ||= { annual: {}, instant: {} });
      const list = (t.annual[r.concept] ||= []);
      if (!list.some((x) => x.end === r.period_end))
        /* Provenance kept: the filing CIK and accession (original registrant, 6.4). */
        list.push({
          end: r.period_end,
          value: v,
          concept: r.taxonomy_concept || null,
          cik: r.cik || null,
          accession: r.accession_no || null,
          ...(r.filedTicker ? { filedTicker: r.filedTicker } : {}),
        });
    }
    for (const r of instant) {
      /* Missing stays missing: Number(null) is 0 (Sonar 6.4 null audit). */
      if (r.value == null || r.value === '') continue;
      const v = Number(r.value);
      if (!Number.isFinite(v)) continue;
      const t = (out[r.ticker] ||= { annual: {}, instant: {} });
      if (!t.instant[r.concept]) t.instant[r.concept] = { end: r.period_end, value: v };
    }
  }
  for (const t of Object.values(out))
    for (const list of Object.values(t.annual)) list.sort((a, b) => (a.end < b.end ? 1 : -1));
  /* SIC codes where classified, so leverage ratios skip financial institutions (calc.js). */
  for (const batch of chunk(Object.keys(out), 500)) {
    try {
      const { data } = await admin
        .from('company_industry')
        .select('ticker, sic')
        .in('ticker', batch);
      for (const r of data || []) if (out[r.ticker] && r.sic) out[r.ticker].sic = r.sic;
    } catch {
      /* classification unavailable: no SIC */
    }
  }
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

/** The licensed quote reader for the price sync job (never the test provider). */
export const fmpQuotesForSync = (tickers) => fmpQuotes(tickers);

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
      /* Missing stays missing: Number(null) is 0 (Sonar 6.4 null audit). */
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
      unclassified: base.unclassified || 0,
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
  /* Sonar 6.4 hardening: while the SEC classification backfill is in progress, companies
     not yet classified could belong to the industry; they are unchecked, so the screen is
     bounded, never presented as complete. */
  let unclassified = 0;
  if (classificationOk) {
    try {
      const [all, done] = await Promise.all([
        admin.from('ticker_sectors').select('ticker', { count: 'exact', head: true }),
        admin.from('company_industry').select('ticker', { count: 'exact', head: true }),
      ]);
      if (Number.isFinite(all?.count) && Number.isFinite(done?.count))
        unclassified = Math.max(0, all.count - done.count);
    } catch {
      unclassified = 0;
    }
    if (unclassified)
      notes.push(
        `SEC industry classification is still loading: ${unclassified} listed companies are not classified yet, so members of ${u.def.label} among them are not in this universe.`,
      );
  }
  return { tickers, label: u.def.label, notes, unclassified };
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
      if (r.total_amount == null || r.total_amount === '') continue;
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
    for (const r of rows) {
      if (r.value_usd == null || r.value_usd === '') continue;
      out[r.issuer_ticker] = (out[r.issuer_ticker] || 0) + (Number(r.value_usd) || 0);
    }
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
      if (t && r.amount != null && r.amount !== '')
        out[t] = (out[t] || 0) + (Number(r.amount) || 0);
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

/* ── seed stages and windowed reads (Nov 28 2026, stages.js) ─────────── */

/* A listed equity ticker (drops options, notes, "--" and free text in trade records). */
const TICKER_RE = /^[A-Z][A-Z0-9]{0,4}(?:[.-][A-Z])?$/;

/**
 * The companies a seed source lists from dated records in [since, until] (until = today:
 * future-dated records are excluded). Returns a stage result: ok with one row per company
 * (value = members buying, purchase dollars, or award dollars), empty with a reason, or
 * failed when the read errors. Nothing is inferred for a company without a record.
 */
export async function seedUniverse(admin, source, since, until) {
  const stage = `seed:${source}`;
  const period = { from: since, to: until };
  const def = SEED_SOURCES[source];
  if (!def) return failedStage(stage, source, `unknown seed source ${source}`);
  let rows;
  try {
    if (source === 'congress') {
      rows = await pageAll(() =>
        admin
          .from('congress_trades')
          .select('ticker, bioguide_id, type, transaction_date')
          .gte('transaction_date', since)
          .lte('transaction_date', until)
          .order('id', { ascending: true }),
      );
    } else if (source === 'insider') {
      rows = await pageAll(() =>
        admin
          .from('sec_insider_transactions')
          .select('issuer_ticker, value_usd, transaction_date')
          .eq('transaction_code', 'P')
          .gte('transaction_date', since)
          .lte('transaction_date', until)
          .order('accession_no', { ascending: true }),
      );
    } else {
      rows = await pageAll(
        () =>
          admin
            .from('contract_awards_resolved')
            .select('ticker, award_amount, action_date')
            .not('ticker', 'is', null)
            .gte('action_date', since)
            .lte('action_date', until)
            .order('generated_award_id', { ascending: true }),
        80,
      );
    }
  } catch (e) {
    return failedStage(
      stage,
      source,
      `${def.table} could not be read: ${String(e?.message || e).slice(0, 120)}`,
      { period },
    );
  }
  return seedFromRows(source, rows, { since, until });
}

/** Pure part of seedUniverse (exported for fixture tests). */
export function seedFromRows(source, rows = [], { since, until }) {
  const stage = `seed:${source}`;
  const period = { from: since, to: until };
  const def = SEED_SOURCES[source];
  const by = new Map();
  let dateKey = 'transaction_date';
  let dropped = 0;
  let asOf = null;
  for (const r of rows) {
    let t;
    let v;
    if (source === 'congress') {
      if (!/purchase|buy/i.test(String(r.type || ''))) continue;
      t = String(r.ticker || '')
        .trim()
        .toUpperCase();
      v = r.bioguide_id;
    } else if (source === 'insider') {
      t = String(r.issuer_ticker || '')
        .trim()
        .toUpperCase();
      v = Number(r.value_usd);
    } else {
      dateKey = 'action_date';
      t = String(r.ticker || '')
        .trim()
        .toUpperCase();
      v = Number(r.award_amount);
    }
    const d = String(r[dateKey] || '').slice(0, 10);
    if (!d || d < since || d > until) {
      dropped += 1;
      continue;
    }
    if (!TICKER_RE.test(t)) {
      dropped += 1;
      continue;
    }
    if (!asOf || d > asOf) asOf = d;
    const cur = by.get(t) || (source === 'congress' ? new Set() : 0);
    if (source === 'congress') {
      if (v) cur.add(v);
      by.set(t, cur);
    } else if (Number.isFinite(v)) by.set(t, cur + v);
  }
  const out = [...by.entries()]
    .map(([ticker, v]) => stageRow({ ticker, value: source === 'congress' ? v.size : v }))
    .filter((r) => r.value != null && r.value > 0)
    .sort((a, b) => (a.ticker < b.ticker ? -1 : 1));
  const lineage = [
    {
      source,
      table: def.table,
      filter: `${dateKey} ${since} to ${until}${source === 'congress' ? ', purchases' : source === 'insider' ? ', code P' : ', resolved ticker'}`,
      asOf,
      recordsRead: rows.length,
      recordsDropped: dropped,
    },
  ];
  if (!out.length)
    return emptyStage(
      stage,
      source,
      `no ${def.label.toLowerCase()} between ${since} and ${until}`,
      {
        measure: def.measure,
        period,
        lineage,
        coverage: { requested: 0, covered: 0, missing: 0 },
      },
    );
  return stageResult({
    stage,
    source,
    measure: def.measure,
    status: 'ok',
    rows: out,
    period,
    asOf: lineage[0].asOf,
    lineage,
  });
}

/** New federal award dollars per ticker with an action date in [since, until]. */
async function contractsInWindow(admin, tickers, since, until) {
  const values = {};
  let asOf = null;
  for (const batch of chunk(tickers, 200)) {
    const rows = await pageAll(() =>
      admin
        .from('contract_awards_resolved')
        .select('ticker, award_amount, action_date')
        .in('ticker', batch)
        .gte('action_date', since)
        .lte('action_date', until)
        .order('generated_award_id', { ascending: true }),
    );
    for (const r of rows) {
      const a = Number(r.award_amount);
      if (!Number.isFinite(a)) continue;
      values[r.ticker] = (values[r.ticker] || 0) + a;
      const d = String(r.action_date || '').slice(0, 10);
      if (d && (!asOf || d > asOf)) asOf = d;
    }
  }
  /* Sonar 6.5: records dated after the screen's end are excluded and counted, never summed.
     An award action date is the date the obligation was recorded, so one after today is an
     invalid action date (a data error), not a valid future contract; a future period of
     performance is a different field this view does not carry. */
  let futureDated = 0;
  for (const batch of chunk(tickers, 200)) {
    const { count } = await admin
      .from('contract_awards_resolved')
      .select('generated_award_id', { count: 'exact', head: true })
      .in('ticker', batch)
      .gt('action_date', until);
    futureDated += Number(count) || 0;
  }
  return { values, asOf, futureDated };
}

/** Net change in comparable 13F managers per ticker (latest covered quarter vs prior). */
async function holders13fChange(admin, tickers, issuers) {
  const holdings = tickers.map((t) => ({ ticker: t, issuer: issuers[t] || t }));
  const master = await securityMaster(admin, tickers);
  const universe = normalizeUniverse(holdings, master);
  if (!universe.eligible.length) return { values: {}, period: null, prior: null };
  const ranked = await rankInstitutionalOwnershipForUniverse(admin, {
    universe,
    metric: 'change',
    comparePrior: true,
  });
  const out = {};
  if (ranked.prior)
    for (const r of ranked.rows || [])
      if (r.ticker && r.comparablePrior != null && r.comparableNow != null)
        out[r.ticker] = r.comparableNow - r.comparablePrior;
  return { values: out, period: ranked.period || null, prior: ranked.prior || null };
}

/** The result of a screen whose seed stage found nothing: explicit, not an error. */
function emptyScreenResult({ seed, filters, rankBy, direction, windowDays, stages }) {
  const funnel = [{ step: 'universe', label: seed.reason, count: 0 }];
  const coverage = screenCoverage({
    eligible: 0,
    evaluated: 0,
    withData: 0,
    shown: 0,
    priceCoverage: null,
    capped13f: 0,
    funnel,
    unclassified: 0,
  });
  const limitations = [
    `The screen stopped at its first stage: ${seed.reason}. Later conditions (${filters.map((f) => f.metric).join(', ')}) were not run.`,
    `Window: the last ${windowDays} days.`,
  ];
  return {
    output: 'calculated',
    title: 'Financial Screen',
    version: SCREEN_VERSION,
    coverage,
    funnel,
    columns: [],
    table: [],
    rankBy,
    direction,
    limitations,
    stages: [
      ...stages,
      ...filters.slice(1).map((f) =>
        stageResult({
          stage: `filter:${f.metric}`,
          source: SCREEN_MEASURES[f.metric]?.source || null,
          status: 'skipped',
          reason: `not run: stage ${seed.stage} was ${seed.status} (${seed.reason})`,
        }),
      ),
    ],
    text: [
      `Financial screen (${SCREEN_VERSION}, calculated): no companies.`,
      ...limitations.map((l) => `Limitation: ${l}`),
    ].join('\n'),
  };
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

  /* Universe: named tickers, an exact GICS sector, a verified industry (6.4), or (Nov 28
     2026) a seed stage that lists companies from dated records: congressional purchases,
     insider purchases or new federal awards in the screen window. */
  const until = now.toISOString().slice(0, 10);
  let universe = [];
  let universeLabel = '';
  let unclassified = 0;
  const universeNotes = [];
  const stages = [];
  const seedValues = {};
  let seedSource = null;
  if (Array.isArray(p.tickers) && p.tickers.length) {
    universe = p.tickers.slice(0, 60).map((t) => ({ ticker: String(t).toUpperCase() }));
    universeLabel = `${universe.length} named companies`;
  } else if (p.sector) {
    const u = await resolveUniverse(admin, p.sector, now, p.country || null);
    universe = u.tickers.map((t) => ({ ticker: t }));
    universeLabel = u.label;
    universeNotes.push(...u.notes);
    unclassified = u.unclassified || 0;
  } else if (p.universe_from && SEED_SOURCES[p.universe_from]) {
    seedSource = p.universe_from;
    const seed = await seedUniverse(admin, seedSource, since, until);
    stages.push(seed);
    if (seed.status !== 'ok' && seed.status !== 'partial')
      return emptyScreenResult({ seed, filters, rankBy, direction, windowDays, stages });
    universe = seed.rows.map((r) => ({ ticker: r.ticker }));
    for (const r of seed.rows) seedValues[r.ticker] = r.value;
    universeLabel = `${SEED_SOURCES[seedSource].label} (${since} to ${until})`;
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
          operating_margin_prior: r.operating_margin_prior ?? null,
          margin_change: r.margin_change ?? null,
          fcf: r.fcf,
          debt_to_equity: r.debt_to_equity,
          debt_to_equity_status: r.debt_to_equity_status,
          debt_to_equity_reason: r.debt_to_equity_reason,
          revenue: r.revenue,
          revenue_prior: r.revenue_prior,
          fiscalYearEnd: r.fiscalYearEnd,
        }
      : {};
  }
  /* The seed's own measure is already read: its value carries forward. A contracts seed
     inside a window is the windowed measure (awards signed in the window). */
  const seedRead = seedSource === 'contracts' && p.window_days ? 'contracts_window' : seedSource;
  const seedKey = seedRead
    ? Object.values(SCREEN_MEASURES).find((m) => m.source === seedRead)?.key
    : null;
  if (seedKey) for (const u of universe) values[u.ticker][seedKey] = seedValues[u.ticker] ?? null;

  /* A sector or ticker universe needs filed revenue to be evaluated at all; a seeded
     universe needs it only when a condition or the ranking reads filed figures. */
  const ratioFilters = filters.filter((f) => SCREEN_MEASURES[f.metric]?.source === 'ratios');
  const otherFilters = filters.filter((f) => SCREEN_MEASURES[f.metric]?.source !== 'ratios');
  const needsFilings =
    !seedSource || ratioFilters.length || SCREEN_MEASURES[rankBy]?.source === 'ratios';
  const withFilings = needsFilings
    ? universe.filter((u) => values[u.ticker]?.revenue != null)
    : universe;

  /* Cheap filters first (filed figures), then each event source only for the survivors
     of the stage before it, in the order the question states the conditions. */
  const stage1 = applyScreen({
    universe: withFilings,
    values,
    filters: ratioFilters,
    rankBy: null,
    topN: 100000,
  });
  let survivors = stage1.rows.map((r) => ({ ticker: r.ticker }));
  const notes = [];
  const valuationNotes = [];
  let priceCoverage = null;
  let capped13f = 0;
  let lobbyYear = null;
  let period13f = null;
  let prior13f = null;
  const read = new Set(seedRead ? [seedRead] : []);
  const lineage = {};
  /* Sonar 6.5: per-source execution status, companies left unchecked by a cap, and the
     companies that pass every condition so far (kept apart from those still unknown). */
  const sourceStatus = {};
  const uncheckedTickers = new Set();
  let passing = new Set(stage1.rows.map((r) => r.ticker));

  async function readSource(src, tick) {
    if (!tick.length || read.has(src)) return;
    read.add(src);
    if (src === 'contracts') {
      const v = await contractsByTicker(admin, tick, now);
      for (const t of tick) values[t].contracts = v[t] ?? null;
      lineage[src] = {
        table: 'company_contract_history',
        filter: `fiscal_year = ${completeFederalFy(now)}`,
      };
      notes.push(
        `Federal contracts: value of prime awards that started in federal fiscal year ${completeFederalFy(now)} (the latest complete year, ending September 30), obligated to date, for every company. This is not revenue.`,
      );
    } else if (src === 'contracts_window') {
      const v = await contractsInWindow(admin, tick, since, until);
      for (const t of tick) values[t].contracts_window = v.values[t] ?? 0;
      lineage[src] = {
        table: 'contract_awards_resolved',
        filter: `action_date ${since} to ${until}`,
        asOf: v.asOf,
        futureDatedExcluded: v.futureDated || 0,
      };
      if (v.futureDated)
        notes.push(
          `${v.futureDated} award records for these companies carry an action date after ${until}; an action date records when an obligation was made, so these are treated as invalid dates and excluded, not counted as future contracts.`,
        );
      notes.push(
        `New federal contracts: prime awards with an action date from ${since} to ${until} (future-dated records excluded), by resolved ticker. A company with no award in the window counts as none.`,
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
      lineage[src] = {
        table: 'price_data_cache',
        filter: 'stored closes, then live quotes',
        asOf: dates[dates.length - 1] || null,
      };
      if (dates.length)
        notes.push(
          `Prices as of ${dates[dates.length - 1]}${dates.length > 1 ? ` (earliest ${dates[0]})` : ''}; earnings and revenue are trailing twelve months from filed 10-K and 10-Q figures; share counts are the latest filed cover-page counts.`,
        );
    } else if (src === 'insider') {
      const v = await insiderPurchases(admin, tick, since);
      for (const t of tick) values[t].insider = v[t] ?? 0;
      lineage[src] = { table: 'sec_insider_transactions', filter: `code P since ${since}` };
    } else if (src === 'congress') {
      const v = await congressBuyers(admin, tick, since);
      for (const t of tick) values[t].congress = v[t] ?? 0;
      lineage[src] = { table: 'congress_trades', filter: `purchases since ${since}` };
    } else if (src === 'lobbying') {
      const v = await lobbyingSpend(admin, tick);
      lobbyYear = v.year;
      for (const t of tick) values[t].lobbying = v.values[t] ?? null;
      lineage[src] = { table: 'lobbying_filings', filter: `filing_year ${v.year}` };
    } else if (src === 'holders13f' || src === 'holders13f_change') {
      /* 13F is the costliest read: only after every other filter, and capped. */
      const ranked = tick.slice(0, MAX_RANKED_13F);
      capped13f = Math.max(capped13f, tick.length - MAX_RANKED_13F);
      /* Sonar 6.5: beyond the cap a company is unchecked (not evaluated), never failed. */
      for (const t of tick.slice(MAX_RANKED_13F)) uncheckedTickers.add(t);
      if (tick.length > MAX_RANKED_13F)
        notes.push(
          `13F was computed for the first ${MAX_RANKED_13F} of ${tick.length} remaining companies (alphabetical).`,
        );
      if (src === 'holders13f') {
        const v = await holders13f(admin, ranked, issuers);
        period13f = v.period;
        for (const t of tick) values[t].holders13f = v.values[t] ?? null;
      } else {
        const v = await holders13fChange(admin, ranked, issuers);
        period13f = v.period;
        prior13f = v.prior;
        for (const t of tick) values[t].holders13f_change = v.values[t] ?? null;
      }
      lineage[src] = {
        table: 'sec_13f_holdings',
        filter: `period ${period13f}${prior13f ? ` vs ${prior13f}` : ''}`,
        asOf: period13f,
      };
    }
  }

  /* The chain: one stage per condition, each on its predecessor's verified survivors. */
  const unsupportedNotes = [...stage1.unsupported];
  const filterFunnel = [];
  let stopped = null;
  for (const f of otherFilters) {
    const m = SCREEN_MEASURES[f.metric];
    if (stopped) {
      stages.push(
        stageResult({
          stage: `filter:${f.metric}`,
          source: m?.source || null,
          status: 'skipped',
          reason: `not run: stage ${stopped.stage} was ${stopped.status} (${stopped.reason})`,
        }),
      );
      continue;
    }
    /* The seed stage is this condition when it only asks for a record; a threshold
       ("more than two members") still runs on the seed's values. */
    if (m && seedRead && m.source === seedRead && f.op === 'exists') continue;
    /* Sonar 6.5: a failed read is that condition's failure, not the screen's: the condition
       is unknown for every company, its step says why, and the other conditions still run. */
    if (m && !sourceStatus[m.source]) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await readSource(
          m.source,
          survivors.map((x) => x.ticker),
        );
        sourceStatus[m.source] = { status: 'complete' };
      } catch (e) {
        const msg = String(e?.message || e).slice(0, 200);
        sourceStatus[m.source] = {
          status: /\b403\b|permission|not entitled/i.test(msg)
            ? 'permission_denied'
            : 'provider_error',
          reason: msg,
        };
      }
    }
    if (m && sourceStatus[m.source]?.status !== 'complete') {
      stages.push(
        failedStage(
          `filter:${f.metric}`,
          m.source,
          `${sourceStatus[m.source].status}: ${sourceStatus[m.source].reason}`,
        ),
      );
      passing = new Set();
      continue;
    }
    const r = applyScreen({
      universe: survivors,
      values,
      filters: [f],
      rankBy: null,
      topN: 100000,
    });
    unsupportedNotes.push(...r.unsupported);
    filterFunnel.push(...r.funnel.slice(1));
    if (!m) continue;
    const stage = filterStage({
      stage: `filter:${f.metric}`,
      source: m.source,
      measure: f.metric,
      universe: survivors,
      values: Object.fromEntries(
        survivors.map((x) => [x.ticker, values[x.ticker]?.[m.key] ?? null]),
      ),
      passed: new Set(r.rows.map((x) => x.ticker)),
      period: { from: since, to: until },
      asOf: lineage[m.source]?.asOf || null,
      lineage: [{ source: m.source, ...(lineage[m.source] || {}) }],
    });
    stages.push(stage);
    /* Sonar 6.5: a company without the data is unknown on this condition, not failed: it
       stays in the set the next source reads, and in the final report as unknown. */
    const passed = new Set(r.rows.map((x) => x.ticker));
    const unknownHere = survivors.filter(
      (x) =>
        !passed.has(x.ticker) &&
        !uncheckedTickers.has(x.ticker) &&
        evaluateCondition(
          { ...f, value: f.value != null && m.unit === 'pct' ? f.value / 100 : f.value },
          values[x.ticker]?.[m.key] ?? null,
        ) === 'unknown',
    );
    passing = new Set([...passing].filter((t) => passed.has(t)));
    survivors = [
      ...r.rows.map((x) => ({ ticker: x.ticker })),
      ...unknownHere.map((x) => ({ ticker: x.ticker })),
    ];
    if (!survivors.length) stopped = stage;
  }
  const rankSrc = rankBy ? SCREEN_MEASURES[rankBy]?.source : null;
  if (rankSrc && rankSrc !== 'ratios')
    await readSource(
      rankSrc,
      survivors.map((x) => x.ticker),
    );
  const sources = [...read];
  const final = applyScreen({
    universe: survivors.filter((x) => passing.has(x.ticker)),
    values,
    filters: [],
    rankBy,
    direction,
    topN,
  });
  unsupportedNotes.push(...final.unsupported);
  /* One funnel across every stage. */
  const funnel = [
    { step: 'universe', label: universeLabel, count: fullUniverse },
    ...(fullUniverse > universe.length
      ? [{ step: 'cap', label: `First ${MAX_UNIVERSE} screened`, count: universe.length }]
      : []),
    ...(needsFilings
      ? [{ step: 'filings', label: 'With filed annual revenue', count: withFilings.length }]
      : []),
    ...stage1.funnel.slice(1),
    ...filterFunnel,
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
    if (
      shownKeys.has('debt_to_equity') &&
      v.debt_to_equity_status &&
      v.debt_to_equity_status !== 'complete'
    )
      out.push(
        `debt/equity ${v.debt_to_equity_status.replace('_', ' ')}: ${v.debt_to_equity_reason}`,
      );
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
    shown.includes('debt')
      ? debtNote(universe.map((u) => values[u.ticker]).filter((v) => v?.revenue != null))
      : null,
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
    period13f && !prior13f
      ? `13F breadth is the count of distinct managers in the ${period13f} quarter.`
      : null,
    prior13f
      ? `Change in 13F managers is ${period13f} against ${prior13f}, counting only managers that filed in both quarters.`
      : null,
    ...unsupportedNotes,
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
    unclassified,
  });
  if (coverage.status === 'bounded')
    limitations.unshift(
      `Bounded screen: ${coverage.unchecked} companies were not checked against every condition (${coverage.excluded
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
  /* Sonar 6.5: the three-valued condition report over every company the screen evaluated,
     the per-source step envelopes, the objective against the question's requirements and
     the structured writer input. All additive: earlier fields are unchanged. */
  const conds = filters
    .filter((f) => SCREEN_MEASURES[f.metric])
    .map((f) => {
      const m = SCREEN_MEASURES[f.metric];
      return {
        id: f.metric,
        metric: f.metric,
        label: m.label,
        source: m.source === seedRead && f.op === 'exists' ? seedRead : m.source,
        op: f.op,
        value: f.value != null && m.unit === 'pct' ? Number(f.value) / 100 : (f.value ?? null),
        /* Dated sources over a complete window: no record is a confirmed zero. */
        zeroIsConfirmed: ['congress', 'insider', 'contracts_window'].includes(m.source),
      };
    });
  const evalUniverse = needsFilings ? withFilings : universe;
  const condValues = {};
  for (const u of evalUniverse) {
    condValues[u.ticker] = {};
    for (const c of conds)
      condValues[u.ticker][c.id] = values[u.ticker]?.[SCREEN_MEASURES[c.metric].key] ?? null;
  }
  const report = screenEntities({
    universe: evalUniverse,
    conditions: conds,
    values: condValues,
    sources: sourceStatus,
    unchecked: [...uncheckedTickers],
  });
  const steps = [
    ...Object.entries(sourceStatus).map(([src, st]) =>
      st.status === 'complete'
        ? stepResult({
            stepId: `read:${src}`,
            operation: 'read_measure',
            status: 'complete',
            sources: [{ source: src, ...(lineage[src] || {}) }],
            reportingPeriod: { ...(PERIOD_SEMANTICS[src] || {}), from: since, to: until },
          })
        : stepResult({
            stepId: `read:${src}`,
            operation: 'read_measure',
            status: st.status,
            reason: st.reason,
          }),
    ),
  ].map((st) => ({ ...st, source: st.stepId.slice(5) }));
  const reqs = Array.isArray(p.requirements) ? { requirements: p.requirements } : null;
  const draft = {
    coverage,
    rankBy,
    steps,
    conditionReport: {
      conditions: report.conditions.map((c, i) => ({ ...c, metric: conds[i].metric })),
      matrix: report.matrix,
    },
  };
  const objective = reqs ? evaluateObjective(reqs, draft) : null;
  const synthesis = writerInput({
    screen: {
      ...draft,
      conditionReport: {
        ...draft.conditionReport,
        passing: report.passing,
        failing: report.failing,
        unknown: report.unknown,
      },
    },
    objective,
  });
  const failedSteps = steps.filter((st) => st.status !== 'complete');
  if (failedSteps.length)
    limitations.unshift(
      `Not executed: ${failedSteps.map((st) => `${st.source} (${st.status}: ${st.reason})`).join('; ')}. Conditions on these sources are unknown for every company; no company is reported as passing them.`,
    );
  if (report.unknown.length)
    limitations.push(
      `${report.unknown.length} companies could not be evaluated on every condition and are listed as unknown, not as failing: ${report.unknown
        .slice(0, 12)
        .map((x) => x.ticker)
        .join(
          ', ',
        )}${report.unknown.length > 12 ? ` and ${report.unknown.length - 12} more` : ''}.`,
    );
  if (uncheckedTickers.size)
    limitations.push(
      `The ranking covers the companies checked, not the universe: ${uncheckedTickers.size} were not checked on 13F (alphabetical cap of ${MAX_RANKED_13F}), so their absence from the table says nothing about their ownership.`,
    );
  return {
    conditionReport: {
      conditions: draft.conditionReport.conditions,
      matrix: report.matrix.slice(0, 400),
      matrixTruncated: report.matrix.length > 400,
      outcome: report.outcome,
      exhaustive: report.exhaustive && coverage.status !== 'bounded',
    },
    outcome: report.outcome,
    unknownTickers: report.unknown.map((x) => x.ticker),
    steps,
    /* Gap analysis per step (6.5). Recovery is bounded to one attempt and never substitutes a
       dataset; here the gaps are reported, not retried. */
    gaps: steps.flatMap((st) => analyzeStep(st)),
    objective,
    synthesis: synthesis.block,
    rankingScope:
      uncheckedTickers.size || coverage.status === 'bounded'
        ? 'checked_companies_only'
        : 'eligible_universe',
    telemetry: executionTelemetry({
      planType: 'financial_screen',
      required: conds.map((c) => c.source),
      steps,
      objective,
    }),
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
    /* Nov 28 2026: the typed stage chain (stages.js) behind the funnel. */
    stages,
    text: [...lines, '', ...limitations.map((l) => `Limitation: ${l}`), '', synthesis.block].join(
      '\n',
    ),
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
  unclassified = 0,
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
  if (unclassified)
    excluded.push({
      kind: 'unchecked',
      reason: 'listed companies not yet classified by SEC industry code (classification loading)',
      count: unclassified,
    });
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

/** Why debt to equity is missing for some companies (Sonar 6.4 final hardening). */
function debtNote(vals) {
  const by = {};
  for (const v of vals) {
    const st = v.debt_to_equity_status || 'unavailable';
    if (st === 'complete') continue;
    by[st] = (by[st] || 0) + 1;
  }
  const parts = Object.entries(by).map(([k, n]) => `${n} ${k.replace('_', ' ')}`);
  return `Debt to equity is total debt (noncurrent plus current debt, short-term borrowings included, reconstructed from filed XBRL components without double counting) over shareholders' equity at the same balance-sheet date.${parts.length ? ` Not computed for ${parts.join(', ')} companies: a missing debt component is never read as zero, negative equity makes the ratio meaningless, and banks and insurers are excluded.` : ''}`;
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
      provenance: cpi[c] ? macroProvenance(cpi[c]) : null,
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
