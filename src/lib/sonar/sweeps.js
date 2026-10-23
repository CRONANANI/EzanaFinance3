/**
 * Sonar v2 dataset sweeps (sonar-templates-spec.md §1-2). One function per
 * dataset, every one returning the same honest shape:
 *
 *   { id, status: 'ok' | 'empty' | 'timeout' | 'error' | 'unwired', rows }
 *
 * Templates declare which sweeps to run; runSweeps() executes them in
 * parallel, each behind its own timeout, so one slow upstream degrades one
 * block and never the briefing. An empty or failed dataset returns rows: []
 * and is NEVER fabricated downstream: the composer only sees real rows.
 */
import { getAdminClient } from '@/lib/supabase';
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { getContractorExposure } from '@/lib/usaspending-store';
import { tickerForRecipient, currentFederalFiscalYear } from '@/lib/usaspending';
import { getSecurityHolders, getActivistStakes } from '@/lib/titans/store';
import { findMatchingMarkets } from '@/lib/polymarket/match';
import { fetchIndustryNews, industryProfile } from '@/lib/sonar/industry-news';

const SWEEP_TIMEOUT_MS = 2500;
const FMP_STABLE = 'https://financialmodelingprep.com/stable';

/** A curated basket per (industry, country) the screener cannot be trusted
 *  for; validated tickers only, never guessed (spec §1). */
export const CURATED_BASKETS = {
  'steel|CAN': ['STLC.TO', 'RUS.TO', 'MRE.TO', 'CFP.TO'],
  'steel|USA': ['NUE', 'STLD', 'CLF', 'X', 'CMC', 'RS'],
  'semiconductors|TWN': ['TSM', 'UMC', 'ASX', 'HIMX'],
  'defense|USA': ['LMT', 'RTX', 'NOC', 'GD', 'LHX', 'HII', 'BAH', 'LDOS'],
  'autos|DEU': ['VWAGY', 'MBGYY', 'BMWYY', 'POAHY'],
};

const withTimeout = (p, ms = SWEEP_TIMEOUT_MS) =>
  Promise.race([
    p,
    new Promise((resolve) => {
      setTimeout(() => resolve({ __timeout: true }), ms);
    }),
  ]);

async function run(id, fn, { timeoutMs } = {}) {
  try {
    const out = await withTimeout(fn(), timeoutMs);
    if (out?.__timeout) return { id, status: 'timeout', rows: [] };
    const rows = Array.isArray(out) ? out : out?.rows || [];
    return { id, status: rows.length ? 'ok' : 'empty', rows, meta: out?.meta || null };
  } catch (e) {
    console.error(`[sonar:sweep] ${id}:`, e?.message || e);
    return { id, status: 'error', rows: [] };
  }
}

/* ── individual sweepers ─────────────────────────────────────────────── */

/** Basket tickers for the entities: curated map first, FMP screener second. */
export async function resolveBasket(entities) {
  const curated =
    CURATED_BASKETS[`${String(entities.industry || '').toLowerCase()}|${entities.country || ''}`];
  if (curated) return curated;
  if (entities.ticker) return [entities.ticker];
  if (Array.isArray(entities.tickers) && entities.tickers.length) return entities.tickers;
  const key = getFmpKey();
  if (!key || !entities.industry) return [];
  try {
    const p = new URLSearchParams({
      industry: entities.industry,
      limit: '12',
      apikey: key,
    });
    if (entities.country) p.set('country', entities.country.slice(0, 2));
    const res = await fetch(`${FMP_STABLE}/company-screener?${p}`, {
      signal: AbortSignal.timeout(2000),
    });
    const list = res.ok ? await res.json() : [];
    return (Array.isArray(list) ? list : [])
      .map((r) => String(r.symbol || '').toUpperCase())
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return [];
  }
}

async function sweepMarket({ tickers }) {
  const key = getFmpKey();
  if (!key || !tickers?.length) return [];
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/quote/${tickers.slice(0, 12).join(',')}?apikey=${key}`,
    { signal: AbortSignal.timeout(2200) },
  );
  if (!res.ok) return [];
  const list = await res.json();
  return (Array.isArray(list) ? list : []).map((r) => ({
    ticker: r.symbol,
    name: r.name,
    price: r.price ?? null,
    changePctYtd: null,
    changePct: r.changesPercentage ?? null,
    marketCap: r.marketCap ?? null,
    pe: r.pe ?? null,
    exchange: r.exchange || null,
  }));
}

async function sweepContracts({ tickers, terms }) {
  const fy = currentFederalFiscalYear().fyEndYear - 1;
  const recipients = await getContractorExposure({ fiscalYear: fy });
  if (!recipients?.length) return [];
  const tickerSet = new Set((tickers || []).map((t) => t.replace(/\..*$/, '').toUpperCase()));
  const needles = (terms || []).map((t) => t.toLowerCase()).filter((t) => t.length > 3);
  const rows = [];
  for (const r of recipients) {
    const mapped = tickerForRecipient(r.name);
    const byTicker = mapped !== '—' && tickerSet.has(mapped);
    const byName = needles.some((n) => r.name.toLowerCase().includes(n));
    if (!byTicker && !byName) continue;
    rows.push({
      recipient: r.name,
      ticker: mapped !== '—' ? mapped : null,
      totalUsd: r.total,
      awards: r.count,
      topAgency: r.topAgency,
      fiscalYear: fy,
    });
  }
  return rows.sort((a, b) => b.totalUsd - a.totalUsd).slice(0, 15);
}

async function sweep13f({ tickers }) {
  const rows = [];
  for (const t of (tickers || []).slice(0, 3)) {
    const key = t.replace(/\..*$/, '').toUpperCase();
    // eslint-disable-next-line no-await-in-loop
    const x = await getSecurityHolders(key).catch(() => null);
    if (!x) continue;
    rows.push({
      ticker: key,
      holdersNow: x.holdersNow ?? null,
      holdersPrior: x.holdersPrior ?? null,
      period: x.period || null,
      topHolders: (x.ladder || x.holders || []).slice(0, 5).map((h) => ({
        name: h.filer_name || h.name || null,
        valueUsd: h.value_usd ?? h.valueUsd ?? null,
        class: h.class || null,
      })),
    });
  }
  return rows;
}

async function sweepActivist({ tickers }) {
  const all = await getActivistStakes({ limit: 200 });
  const set = new Set((tickers || []).map((t) => t.replace(/\..*$/, '').toUpperCase()));
  const since = new Date(Date.now() - 2 * 365 * 86400000).toISOString().slice(0, 10);
  return (all || [])
    .filter(
      (r) => r.ticker && set.has(String(r.ticker).toUpperCase()) && String(r.filedAt) >= since,
    )
    .slice(0, 12)
    .map((r) => ({
      ticker: r.ticker,
      filer: r.filerConfirmed ? r.filer : null,
      form: r.form,
      percentOfClass: r.percentOfClass ?? null,
      filedAt: r.filedAt,
    }));
}

async function sweepCongress({ tickers }) {
  const admin = getAdminClient();
  const list = (tickers || []).map((t) => t.replace(/\..*$/, '').toUpperCase()).slice(0, 15);
  if (!list.length) return [];
  const { data } = await admin
    .from('congress_trades')
    .select('bioguide_id, chamber, ticker, type, transaction_date, amount_min, amount_max')
    .in('ticker', list)
    .order('transaction_date', { ascending: false })
    .limit(20);
  return (data || []).map((r) => ({
    bioguideId: r.bioguide_id,
    chamber: r.chamber,
    ticker: r.ticker,
    side: r.type,
    tradedAt: r.transaction_date,
    amountMin: r.amount_min ?? null,
    amountMax: r.amount_max ?? null,
  }));
}

async function sweepLobbying({ terms }) {
  const admin = getAdminClient();
  const needles = (terms || []).filter((t) => t && t.length > 3).slice(0, 3);
  if (!needles.length) return [];
  const { data } = await admin
    .from('lobbying_filings')
    .select('client_name, registrant_name, amount, filing_year, quarter, issues')
    .or(needles.map((t) => `issues.ilike.%${t}%`).join(','))
    .order('filing_year', { ascending: false })
    .limit(25);
  const byClient = new Map();
  for (const r of data || []) {
    const cur = byClient.get(r.client_name) || {
      client: r.client_name,
      totalUsd: 0,
      filings: 0,
      latestYear: r.filing_year,
    };
    cur.totalUsd += Number(r.amount) || 0;
    cur.filings += 1;
    byClient.set(r.client_name, cur);
  }
  return [...byClient.values()].sort((a, b) => b.totalUsd - a.totalUsd).slice(0, 10);
}

async function sweepPredMarkets({ query }) {
  const out = await findMatchingMarkets({ headline: query, title: query }, { limit: 5 });
  const markets = out?.markets || out || [];
  return (Array.isArray(markets) ? markets : []).slice(0, 5).map((m) => ({
    question: m.question || m.title || null,
    odds: m.probability ?? m.odds ?? m.yesPrice ?? null,
    url: m.url || m.eventUrl || null,
    volumeUsd: m.volume ?? null,
  }));
}

async function sweepEcho({ terms }) {
  const admin = getAdminClient();
  const needles = (terms || []).filter((t) => t && t.length > 2).slice(0, 3);
  if (!needles.length) return [];
  const { data } = await admin
    .from('echo_articles')
    .select('slug, title, excerpt, published_at')
    .eq('article_status', 'published')
    .or(needles.flatMap((t) => [`title.ilike.%${t}%`, `excerpt.ilike.%${t}%`]).join(','))
    .order('published_at', { ascending: false })
    .limit(5);
  return (data || []).map((r) => ({
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    publishedAt: r.published_at,
    url: `/ezana-echo/${r.slug}`,
  }));
}

async function sweepNews({ terms }) {
  const admin = getAdminClient();
  const profile = { terms: (terms || []).slice(0, 6) };
  const rows = await fetchIndustryNews(admin, profile, { days: 14, limit: 5 });
  return (rows || []).map((n) => ({
    title: n.title,
    url: n.url || n.article_url || null,
    publisher: n.publisher || n.publisher_name || null,
    publishedAt: n.publishedAt || n.published_utc || null,
  }));
}

const SWEEPERS = {
  market: sweepMarket,
  contracts: sweepContracts,
  f13: sweep13f,
  activist: sweepActivist,
  congress: sweepCongress,
  lobbying: sweepLobbying,
  pred_markets: sweepPredMarkets,
  echo: sweepEcho,
  news: sweepNews,
};

/** Datasets the registry may name that have no structured sweep yet. They
 *  return status 'unwired' so the UI can say so and the brief stays silent. */
export const UNWIRED = new Set(['campaign_finance', 'sec_filings', 'macro_series']);

export function termsFor(entities, query) {
  const t = [
    entities.industry,
    entities.countryName,
    entities.theme,
    entities.commodity,
    entities.policy,
    entities.topic,
    entities.company,
    entities.person,
    entities.fund,
    entities.agency,
    entities.region,
  ]
    .filter(Boolean)
    .flatMap((s) => String(s).split(/\s+/))
    .filter((w) => w.length > 3);
  return [
    ...new Set(
      t.length
        ? t
        : String(query || '')
            .split(/\s+/)
            .filter((w) => w.length > 3),
    ),
  ];
}

/**
 * Run the named sweeps in parallel. `params` is built once by the template
 * (tickers, terms, query) and shared; each sweep takes what it needs.
 */
export async function runSweeps(datasetIds, params) {
  const results = await Promise.all(
    datasetIds.map((id) => {
      if (UNWIRED.has(id)) return Promise.resolve({ id, status: 'unwired', rows: [] });
      const fn = SWEEPERS[id];
      if (!fn) return Promise.resolve({ id, status: 'unwired', rows: [] });
      return run(id, () => fn(params));
    }),
  );
  const byId = {};
  for (const r of results) byId[r.id] = r;
  return byId;
}

export { industryProfile };
