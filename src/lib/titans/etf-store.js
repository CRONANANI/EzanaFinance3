/**
 * ETF Holdings (Form N-PORT) reads: SERVER ONLY, cached 15 minutes under the
 * `titans` tag. Re-exported from @/lib/titans/store. Overlap is computed at
 * read time: per shared security, the smaller of the two weights.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { ETF_UNIVERSE } from '@/lib/etf/universe';
import { overlap } from './pure';

const CACHE = { revalidate: 900, tags: ['titans'] };
const supa = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const n = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));

const HOLD_COLS =
  'line_no, name, title, cusip, isin, ticker, value_usd, pct_value, asset_category, country';

/* Asset category codes (N-PORT) in plain words. */
export const ASSET_LABEL = {
  EC: 'Equity, common',
  EP: 'Equity, preferred',
  DBT: 'Debt',
  ABS: 'Asset-backed',
  'ABS-MBS': 'Mortgage-backed',
  'ABS-APCP': 'Asset-backed commercial paper',
  'ABS-CBDO': 'Collateralized bond or debt',
  'ABS-O': 'Other asset-backed',
  STIV: 'Short-term investment vehicle',
  RA: 'Repurchase agreement',
  DIR: 'Interest-rate derivative',
  DE: 'Equity derivative',
  DFE: 'Foreign-exchange derivative',
  DCR: 'Credit derivative',
  DCO: 'Commodity derivative',
  LON: 'Loan',
  RE: 'Real estate',
  COMM: 'Commodity',
  SN: 'Structured note',
  OTHER: 'Other',
};

async function holdingsOf(admin, seriesId, reportDate) {
  const out = [];
  for (let p = 0; p < 30; p += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_etf_holdings')
      .select(HOLD_COLS)
      .eq('series_id', seriesId)
      .eq('report_date', reportDate)
      .order('line_no')
      .range(p * 1000, p * 1000 + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out.map((h) => ({
    name: h.name,
    title: h.title,
    cusip: h.cusip,
    ticker: h.ticker,
    value: n(h.value_usd),
    pct: n(h.pct_value),
    asset: h.asset_category,
    country: h.country,
  }));
}

async function loadFunds() {
  if (!supa()) return { funds: [], notCovered: [] };
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('sec_etf_funds')
    .select(
      'series_id, ticker, fund_name, report_date, net_assets, holdings_count, status, status_detail',
    )
    .order('net_assets', { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  const funds = (data || []).map((f) => ({
    seriesId: f.series_id,
    ticker: f.ticker,
    name: f.fund_name,
    reportDate: f.report_date,
    netAssets: n(f.net_assets),
    holdings: f.holdings_count,
    status: f.status,
    detail: f.status_detail,
  }));
  const tracked = new Set(funds.map((f) => f.ticker));
  const notCovered = [
    ...funds
      .filter((f) => f.status === 'no_nport' || f.status === 'error')
      .map((f) => ({ ticker: f.ticker, reason: f.detail || 'No public N-PORT holdings' })),
    ...ETF_UNIVERSE.filter((t) => !tracked.has(t)).map((t) => ({
      ticker: t,
      reason: 'Not a registered fund series (no N-PORT filing)',
    })),
  ];
  return { funds: funds.filter((f) => f.status === 'ok'), notCovered };
}
export const getEtfFunds = unstable_cache(loadFunds, ['titans-etf-funds-v1'], CACHE);

async function loadFund(seriesId) {
  if (!supa() || !seriesId) return null;
  const admin = getAdminClient();
  const { data: f } = await admin
    .from('sec_etf_funds')
    .select('*')
    .eq('series_id', seriesId)
    .maybeSingle();
  if (!f?.report_date) return null;
  const rows = await holdingsOf(admin, seriesId, f.report_date);
  const group = (key, label = (x) => x) => {
    const m = new Map();
    for (const h of rows) {
      const k = h[key] || 'Not reported';
      m.set(k, (m.get(k) || 0) + (h.pct || 0));
    }
    return [...m.entries()]
      .map(([k, pct]) => ({ key: k, label: label(k), pct }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 12);
  };
  return {
    seriesId,
    ticker: f.ticker,
    name: f.fund_name,
    reportDate: f.report_date,
    netAssets: n(f.net_assets),
    holdingsCount: rows.length,
    accession: f.latest_accession,
    top: [...rows].sort((a, b) => (b.pct || 0) - (a.pct || 0)).slice(0, 25),
    byAsset: group('asset', (k) => ASSET_LABEL[k] || k),
    byCountry: group('country'),
  };
}
const cachedFund = unstable_cache(loadFund, ['titans-etf-fund-v1'], CACHE);
export function getEtfFund(seriesId) {
  return cachedFund(String(seriesId || ''));
}

async function loadHolders(ticker) {
  if (!supa() || !ticker) return [];
  const admin = getAdminClient();
  const [{ data: funds }, { data: rows, error }] = await Promise.all([
    admin
      .from('sec_etf_funds')
      .select('series_id, ticker, fund_name, report_date')
      .eq('status', 'ok'),
    admin
      .from('sec_etf_holdings')
      .select('series_id, report_date, name, value_usd, pct_value')
      .eq('ticker', String(ticker).toUpperCase())
      .limit(1000),
  ]);
  if (error) throw new Error(error.message);
  const fundBy = new Map((funds || []).map((f) => [f.series_id, f]));
  const out = new Map();
  for (const r of rows || []) {
    const f = fundBy.get(r.series_id);
    if (!f || r.report_date !== f.report_date) continue; // latest report only
    const cur = out.get(r.series_id) || {
      ticker: f.ticker,
      fund: f.fund_name,
      reportDate: f.report_date,
      pct: 0,
      value: 0,
    };
    cur.pct += n(r.pct_value) || 0;
    cur.value += n(r.value_usd) || 0;
    out.set(r.series_id, cur);
  }
  return [...out.values()].sort((a, b) => b.pct - a.pct);
}
const cachedHolders = unstable_cache(loadHolders, ['titans-etf-holders-v1'], CACHE);
export function getEtfHolders(ticker) {
  return cachedHolders(String(ticker || '').toUpperCase());
}

async function loadOverlap(a, b) {
  if (!supa() || !a || !b) return null;
  const admin = getAdminClient();
  const { data: funds } = await admin
    .from('sec_etf_funds')
    .select('series_id, ticker, report_date')
    .in('series_id', [a, b]);
  const fa = funds?.find((f) => f.series_id === a);
  const fb = funds?.find((f) => f.series_id === b);
  if (!fa?.report_date || !fb?.report_date) return null;
  const [ha, hb] = await Promise.all([
    holdingsOf(admin, a, fa.report_date),
    holdingsOf(admin, b, fb.report_date),
  ]);
  const res = overlap(ha, hb);
  return {
    a: fa.ticker,
    b: fb.ticker,
    overlapPct: res.overlapPct,
    sharedCount: res.shared.length,
    shared: res.shared.slice(0, 50),
  };
}
const cachedOverlap = unstable_cache(loadOverlap, ['titans-etf-overlap-v1'], CACHE);
export function getEtfOverlap(a, b) {
  const [x, y] = [String(a || ''), String(b || '')].sort();
  return cachedOverlap(x, y);
}
