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

import { companyRatios } from './calc.js';
import { fetchRevenueMix } from '@/lib/sonar/revenue-mix';
import { normalizeUniverse } from './ownership.js';
import {
  pageAll,
  rankInstitutionalOwnershipForUniverse,
  securityMaster,
} from './ownership-server.js';
import {
  GICS_FOR,
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

  /* Universe. */
  let universe = [];
  let universeLabel = '';
  let gics = null;
  if (Array.isArray(p.tickers) && p.tickers.length) {
    universe = p.tickers.slice(0, 60).map((t) => ({ ticker: String(t).toUpperCase() }));
    universeLabel = `${universe.length} named companies`;
  } else if (p.sector && GICS_FOR[p.sector]) {
    gics = GICS_FOR[p.sector];
    const rows = await pageAll(() =>
      admin
        .from('ticker_sectors')
        .select('ticker')
        .eq('sector', gics.sector)
        .order('ticker', { ascending: true }),
    );
    universe = rows.map((r) => ({ ticker: r.ticker }));
    universeLabel = `GICS sector ${gics.sector}`;
  } else {
    throw new Error('The screen has no universe: name a sector or companies.');
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
  const columns = [
    { key: 'rank', label: '#' },
    { key: 'ticker', label: 'Ticker' },
    ...shown.map((m) => ({
      key: SCREEN_MEASURES[m].key,
      label: SCREEN_MEASURES[m].label,
      unit: SCREEN_MEASURES[m].unit,
    })),
  ];
  const table = final.rows.map((r) => ({
    rank: r.rank,
    ticker: r.ticker,
    ...Object.fromEntries(
      shown.map((m) => [SCREEN_MEASURES[m].key, r.values[SCREEN_MEASURES[m].key] ?? null]),
    ),
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
  const limitations = [
    gics && !gics.exact
      ? `Ezana classifies companies at the GICS sector level only, so "${p.sector.replace(/_/g, ' ')}" was screened as the whole ${gics.sector} sector; companies outside that industry are included.`
      : null,
    'Filed figures are the latest fiscal year each company reported; fiscal years end on different dates.',
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
  const lines = [
    `Financial screen (${SCREEN_VERSION}, calculated): ${universeLabel}.`,
    `Funnel: ${funnel.map((f) => `${f.label} ${f.count}${f.noData ? ` (${f.noData} without the data)` : ''}`).join(' -> ')}.`,
    rankM
      ? `Ranked by ${rankM.label}, ${direction === 'ascending' ? 'lowest' : 'highest'} first.`
      : 'No ranking measure: listed alphabetically.',
    '',
    `| ${columns.map((c) => c.label).join(' | ')} |`,
    `|${columns.map(() => '---').join('|')}|`,
    ...table.map(
      (r) => `| ${columns.map((c) => (c.unit ? fmt(c.unit, r[c.key]) : r[c.key])).join(' | ')} |`,
    ),
  ];
  return {
    output: 'calculated',
    title: 'Financial Screen',
    version: SCREEN_VERSION,
    coverage: { selected: fullUniverse, withData: withFilings.length, complete: table.length },
    funnel,
    columns,
    table,
    rankBy,
    direction,
    limitations,
    text: [...lines, '', ...limitations.map((l) => `Limitation: ${l}`)].join('\n'),
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
};

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
  const figs = await filedFiguresPaged(admin, tickers, now);
  const names = att.params?.names || {};
  const rows = tickers.map((t) => ({
    ticker: t,
    name: names[t] || t,
    ratios: companyRatios(figs[t]),
  }));
  const cmp = compareCompanies(rows, metrics);
  const columns = [
    { key: 'ticker', label: 'Ticker' },
    { key: 'fiscalYearEnd', label: 'Fiscal year end' },
    ...metrics.map((m) => ({
      key: m,
      label: COMPARE_LABEL[m],
      unit: m === 'debt_to_equity' ? 'x' : 'pct',
    })),
  ];
  const table = rows.map((r) => ({
    ticker: r.ticker,
    fiscalYearEnd: r.ratios?.fiscalYearEnd || null,
    ...Object.fromEntries(metrics.map((m) => [m, r.ratios?.[m] ?? null])),
  }));
  const limitations = [
    cmp.aligned
      ? null
      : `The latest fiscal years end on different dates (${cmp.fiscalYearEnds.join(', ')}), so the periods overlap only in part or not at all.`,
    cmp.missing.length
      ? `Missing filed figures for some metrics: ${cmp.missing.join(', ')}.`
      : null,
    'Margin and leverage ratios are not comparable for banks and insurers.',
    att.params?.unresolved?.length
      ? `Not matched to a company with SEC filings, so left out: ${att.params.unresolved.join(', ')}.`
      : null,
  ].filter(Boolean);
  const lines = [
    `Company comparison (calculated from filed SEC annual figures): ${tickers.join(', ')}.`,
    ...Object.entries(cmp.leaders).map(
      ([m, t]) =>
        `Leader on ${COMPARE_LABEL[m]}: ${t}${m === 'debt_to_equity' ? ' (lowest)' : ''}.`,
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
