/**
 * Insider Trading (Form 4) reads: SERVER ONLY, cached 15 minutes under the
 * `titans` tag. Re-exported from @/lib/titans/store.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { clusterBuys } from './pure';

const CACHE = { revalidate: 900, tags: ['titans'] };
const DAY = 86400000;
const COLS =
  'accession_no, table_kind, line_no, form_type, issuer_cik, issuer_name, issuer_ticker, reporter_cik, reporter_name, reporter_title, is_director, is_officer, is_ten_pct_owner, security_title, transaction_date, transaction_code, acquired_disposed, shares, price, value_usd, shares_owned_after, direct_indirect';

const supa = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const day = (ms) => new Date(ms).toISOString().slice(0, 10);
const n = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));

/** EDGAR filing index for an accession (issuer CIK directory). */
export function filingHref(r) {
  const cik = String(r.issuer_cik || r.reporter_cik || '').replace(/\D/g, '');
  if (!cik || !r.accession_no) return null;
  return `https://www.sec.gov/Archives/edgar/data/${parseInt(cik, 10)}/${r.accession_no.replace(/-/g, '')}/${r.accession_no}-index.htm`;
}

function shape(r) {
  return {
    id: `${r.accession_no}-${r.table_kind}-${r.line_no}`,
    date: r.transaction_date,
    ticker: r.issuer_ticker,
    company: r.issuer_name,
    insider: r.reporter_name,
    title:
      r.reporter_title ||
      [r.is_director && 'Director', r.is_ten_pct_owner && '10% owner'].filter(Boolean).join(', ') ||
      null,
    code: r.transaction_code,
    derivative: r.table_kind === 'derivative',
    security: r.security_title,
    shares: n(r.shares),
    price: n(r.price),
    value: n(r.value_usd),
    ownedAfter: n(r.shares_owned_after),
    href: filingHref(r),
  };
}

async function pageAll(build, max = 30) {
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

async function loadOverview() {
  if (!supa()) return null;
  const admin = getAdminClient();
  const now = Date.now();
  const since90 = day(now - 90 * DAY);
  const since30 = day(now - 30 * DAY);
  const rows = (
    await pageAll(() =>
      admin
        .from('sec_insider_transactions')
        .select(COLS)
        .in('transaction_code', ['P', 'S'])
        .eq('table_kind', 'non_derivative')
        .gte('transaction_date', since90)
        .order('transaction_date', { ascending: false })
        .order('accession_no'),
    )
  ).map(shape);
  const last30 = rows.filter((r) => r.date >= since30);
  const buys = last30.filter((r) => r.code === 'P');
  const sells = last30.filter((r) => r.code === 'S');
  const sum = (list) => list.reduce((s, r) => s + (r.value || 0), 0);
  const byValue = (a, b) => (b.value || 0) - (a.value || 0);
  return {
    stats: {
      buys: buys.length,
      buyValue: sum(buys),
      sells: sells.length,
      sellValue: sum(sells),
    },
    topBuys: buys
      .filter((r) => r.value != null)
      .sort(byValue)
      .slice(0, 25),
    topSells: sells
      .filter((r) => r.value != null)
      .sort(byValue)
      .slice(0, 25),
    clusters: clusterBuys(rows).slice(0, 15),
    latest: rows.slice(0, 20),
    asOf: rows[0]?.date || null,
  };
}
export const getInsiderOverview = unstable_cache(loadOverview, ['titans-insider-v1'], CACHE);

async function loadSearch(kind, q) {
  if (!supa() || !q) return [];
  const admin = getAdminClient();
  const since = day(Date.now() - 365 * DAY);
  let query = admin
    .from('sec_insider_transactions')
    .select(COLS)
    .gte('transaction_date', since)
    .order('transaction_date', { ascending: false })
    .limit(500);
  query =
    kind === 'ticker'
      ? query.eq('issuer_ticker', q.toUpperCase())
      : query.ilike('reporter_name', `%${q.replace(/[%_,()]/g, ' ').trim()}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map(shape);
}
const cachedSearch = unstable_cache(loadSearch, ['titans-insider-search-v1'], CACHE);
export function searchInsider({ ticker, insider }) {
  return ticker ? cachedSearch('ticker', ticker) : cachedSearch('insider', insider || '');
}
