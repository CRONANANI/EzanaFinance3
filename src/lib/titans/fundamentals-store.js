/**
 * Fundamentals (SEC XBRL frames) reads: SERVER ONLY, cached 15 minutes under
 * the `titans` tag. Re-exported from @/lib/titans/store. Growth is computed
 * here from reported values only, and only when both years are reported.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { growthPct } from './pure';

const CACHE = { revalidate: 900, tags: ['titans'] };
const supa = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const n = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));

const ANNUAL = ['revenue', 'net_income', 'eps_diluted', 'operating_cash_flow'];
const INSTANT = ['assets', 'equity', 'cash'];

async function pageAll(build, max = 60) {
  const out = [];
  for (let p = 0; p < max; p += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await build().range(p * 1000, p * 1000 + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/**
 * The latest calendar-year frame with broad coverage (filers report annual
 * figures for months after year end, so the newest frame fills in slowly).
 */
async function latestYear(admin) {
  const y = new Date().getUTCFullYear();
  let best = null;
  for (const year of [y - 1, y - 2, y - 3]) {
    // eslint-disable-next-line no-await-in-loop
    const { count } = await admin
      .from('sec_fundamentals')
      .select('cik', { count: 'exact', head: true })
      .eq('concept', 'revenue')
      .eq('frame', `CY${year}`);
    if ((count || 0) >= 500) return year;
    if ((count || 0) > (best?.count || 0)) best = { year, count };
  }
  // Early in a load nothing has broad coverage yet: use the best-covered year.
  return best?.year || null;
}

async function loadTable(limit) {
  if (!supa()) return null;
  const admin = getAdminClient();
  const year = await latestYear(admin);
  if (!year) return { year: null, rows: [] };
  const frames = [`CY${year}`, `CY${year - 1}`, `CY${year}Q4I`];
  const facts = await pageAll(() =>
    admin
      .from('sec_fundamentals')
      .select('cik, ticker, entity_name, concept, frame, value, period_end')
      .in('frame', frames)
      .in('concept', [...ANNUAL, ...INSTANT])
      .order('cik')
      .order('concept')
      .order('frame'),
  );
  const by = new Map();
  for (const f of facts) {
    if (!by.has(f.cik)) by.set(f.cik, { cik: f.cik, ticker: f.ticker, company: f.entity_name });
    const r = by.get(f.cik);
    if (f.frame === `CY${year}`) r[f.concept] = n(f.value);
    else if (f.frame === `CY${year - 1}` && f.concept === 'revenue') r.revenue_prior = n(f.value);
    else if (f.frame === `CY${year}Q4I`) r[f.concept] = n(f.value);
    if (f.frame === `CY${year}` && f.concept === 'revenue') r.period_end = f.period_end;
  }
  const rows = [...by.values()]
    .filter((r) => r.revenue != null || r.net_income != null)
    .map((r) => ({ ...r, revenue_growth: growthPct(r.revenue, r.revenue_prior) }))
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, limit);
  return { year, companies: by.size, rows };
}
const cachedTable = unstable_cache(loadTable, ['titans-fundamentals-v1'], CACHE);
export function getFundamentalsTable({ limit = 500 } = {}) {
  return cachedTable(limit);
}

async function loadHistory(ticker) {
  if (!supa() || !ticker) return null;
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('sec_fundamentals')
    .select(
      'cik, ticker, entity_name, concept, frame, period_type, period_end, value, unit, taxonomy_concept, accession_no',
    )
    .eq('ticker', String(ticker).toUpperCase())
    .order('period_end', { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  if (!data?.length) return null;
  const periods = new Map();
  for (const f of data) {
    if (!periods.has(f.frame))
      periods.set(f.frame, { frame: f.frame, type: f.period_type, end: f.period_end, values: {} });
    periods.get(f.frame).values[f.concept] = {
      value: n(f.value),
      unit: f.unit,
      concept: f.taxonomy_concept,
    };
  }
  return {
    ticker: data[0].ticker,
    company: data[0].entity_name,
    cik: data[0].cik,
    periods: [...periods.values()].sort((a, b) => String(b.end).localeCompare(String(a.end))),
  };
}
const cachedHistory = unstable_cache(loadHistory, ['titans-fundamentals-history-v1'], CACHE);
export function getFundamentalsHistory(ticker) {
  return cachedHistory(String(ticker || '').toUpperCase());
}
