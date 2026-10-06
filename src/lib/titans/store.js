/**
 * Titans Shadow read layer: SERVER ONLY (admin client), cached for 15 minutes
 * under the `titans` tag, which the SEC crons revalidate after writing.
 *
 *   getInstitutionalOverview(): the latest complete 13F quarter, from the
 *     snapshot refresh_titans_institutional() stores each hour (filers ranked
 *     by reported value, most widely held securities, largest new positions).
 *   getActivistStakes({ limit }): newest Schedule 13D/13G stakes.
 *   getFundHoldings(cik): one filer's latest 13F holdings with the change
 *     versus its prior quarter.
 *
 * Tickers come from CUSIP via OpenFIGI; an unmapped security carries its
 * issuer name and a null ticker, never an invented one. Every function returns
 * an empty shape when the data is not there yet.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { classifyChange } from '@/lib/whale-score';
import { schedule13Kind } from '@/lib/sec-13f-parse';
import {
  latestCompleteQuarter,
  priorQuarterEnd,
  recentPeriods,
  quarterLabelLong,
} from '@/lib/sec/quarters';

const CACHE = { revalidate: 900, tags: ['titans'] };
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

function supaConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const secFilerUrl = (cik) =>
  cik
    ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(String(cik))}`
    : null;

/* ── Institutional overview ─────────────────────────────────────────── */

async function loadOverview() {
  if (!supaConfigured()) return null;
  const admin = getAdminClient();
  const wanted = `institutional:${latestCompleteQuarter(new Date())}`;
  let { data, error } = await admin
    .from('titans_snapshots')
    .select('key, payload, computed_at')
    .eq('key', wanted)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    // Fall back to the newest snapshot on file (e.g. right after a quarter
    // completes, before the first refresh of the new one).
    const res = await admin
      .from('titans_snapshots')
      .select('key, payload, computed_at')
      .like('key', 'institutional:%')
      .order('key', { ascending: false })
      .limit(1);
    if (res.error) throw new Error(res.error.message);
    data = res.data?.[0] || null;
  }
  if (!data?.payload) return null;
  const p = data.payload;
  const quarter = p.period || data.key.split(':')[1];
  const row = (r) => ({
    cik: r.cik || null,
    filer: r.filer_name || null,
    ticker: r.ticker || null,
    issuer: r.issuer || null,
    cusip: r.cusip || null,
    valueUsd: num(r.value_usd ?? r.total_value_usd),
    shares: num(r.shares),
    quarter,
  });
  return {
    quarter,
    quarterLabel: quarterLabelLong(quarter),
    priorQuarter: p.prior_period || priorQuarterEnd(quarter),
    computedAt: data.computed_at,
    filers: num(p.filers) || 0,
    filersWithPrior: num(p.filers_with_prior) || 0,
    holdings: num(p.holdings) || 0,
    totalValueUsd: num(p.total_value_usd) || 0,
    topFilers: (p.top_filers || []).map((r) => ({
      ...row(r),
      positions: num(r.positions),
      href: secFilerUrl(r.cik),
    })),
    widelyHeld: (p.widely_held || []).map((r) => ({ ...row(r), holders: num(r.holders) })),
    newPositions: (p.new_positions || []).map(row),
  };
}

export const getInstitutionalOverview = unstable_cache(
  loadOverview,
  ['titans-institutional-v1'],
  CACHE,
);

/* ── Activist stakes ────────────────────────────────────────────────── */

async function loadActivist(limit) {
  if (!supaConfigured()) return [];
  const admin = getAdminClient();
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 300);
  const { data: filings, error } = await admin
    .from('sec_filings')
    .select('accession_no, cik, filer_name, form_type, filed_at, index_url, primary_doc_url')
    .eq('form_family', 'activist')
    .order('filed_at', { ascending: false })
    .limit(lim * 3);
  if (error) throw new Error(error.message);
  const list = filings || [];
  if (!list.length) return [];
  const byAcc = new Map();
  for (let i = 0; i < list.length; i += 200) {
    // eslint-disable-next-line no-await-in-loop
    const { data: rows, error: pErr } = await admin
      .from('sec_activist_positions')
      .select(
        'accession_no, subject_name, subject_cik, subject_cusip, subject_ticker, percent_of_class, shares, form_type, event_date, reporting_persons, is_amendment',
      )
      .in(
        'accession_no',
        list.slice(i, i + 200).map((f) => f.accession_no),
      );
    if (pErr) throw new Error(pErr.message);
    for (const r of rows || []) byAcc.set(r.accession_no, r);
  }
  const out = [];
  for (const f of list) {
    const p = byAcc.get(f.accession_no);
    if (!p || (p.percent_of_class == null && p.shares == null)) continue;
    const persons = Array.isArray(p.reporting_persons) ? p.reporting_persons : [];
    const form = p.form_type || f.form_type;
    out.push({
      accessionNo: f.accession_no,
      filer: persons[0]?.name || f.filer_name || null,
      reportingPersons: persons.length,
      subject: p.subject_name || null,
      ticker: p.subject_ticker || null,
      percentOfClass: num(p.percent_of_class),
      shares: num(p.shares),
      form: schedule13Kind(form),
      isAmendment: !!p.is_amendment,
      eventDate: p.event_date || null,
      filedAt: f.filed_at,
      href: f.index_url || f.primary_doc_url || null,
    });
    if (out.length >= lim) break;
  }
  return out;
}

const cachedActivist = unstable_cache(loadActivist, ['titans-activist-v1'], CACHE);
export function getActivistStakes({ limit = 100 } = {}) {
  return cachedActivist(limit);
}

/* ── One fund's holdings ────────────────────────────────────────────── */

async function holdingsOf(admin, accessionNo) {
  const out = [];
  for (let from = 0; from < 20000; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_13f_holdings')
      .select('name_of_issuer, cusip, ticker, value_usd, shares, put_call')
      .eq('accession_no', accessionNo)
      .order('id')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function latestParsedFiling(admin, cik, periods) {
  const { data } = await admin
    .from('sec_filings')
    .select('accession_no, filer_name, period_of_report, filed_at, index_url')
    .eq('form_family', 'institutional')
    .eq('cik', cik)
    .in('period_of_report', periods)
    .order('period_of_report', { ascending: false })
    .order('filed_at', { ascending: false })
    .limit(6);
  for (const f of data || []) {
    // eslint-disable-next-line no-await-in-loop
    const { data: probe } = await admin
      .from('sec_13f_holdings')
      .select('id')
      .eq('accession_no', f.accession_no)
      .limit(1);
    if ((probe || []).length) return f;
  }
  return null;
}

async function loadFund(cik) {
  if (!supaConfigured() || !cik) return null;
  const admin = getAdminClient();
  const padded = String(cik).replace(/\D/g, '').padStart(10, '0');
  const cur = await latestParsedFiling(admin, padded, recentPeriods(new Date()));
  if (!cur) return null;
  const prior = await latestParsedFiling(admin, padded, [priorQuarterEnd(cur.period_of_report)]);
  const [now, before] = await Promise.all([
    holdingsOf(admin, cur.accession_no),
    prior ? holdingsOf(admin, prior.accession_no) : Promise.resolve([]),
  ]);
  const key = (h) =>
    (h.cusip || h.name_of_issuer || '').toUpperCase() + (h.put_call ? `|${h.put_call}` : '');
  const priorMap = new Map(before.map((h) => [key(h), h]));
  const total = now.reduce((s, h) => s + (Number(h.value_usd) || 0), 0);
  const rows = now
    .map((h) => {
      const p = priorMap.get(key(h));
      return {
        issuer: h.name_of_issuer,
        ticker: h.ticker || null,
        cusip: h.cusip || null,
        putCall: h.put_call || null,
        valueUsd: num(h.value_usd),
        shares: num(h.shares),
        weightPct: total ? ((Number(h.value_usd) || 0) / total) * 100 : null,
        priorShares: p ? num(p.shares) : null,
        change: prior ? classifyChange(Number(h.shares) || 0, p ? Number(p.shares) || 0 : 0) : null,
      };
    })
    .sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));
  return {
    cik: padded,
    filer: cur.filer_name,
    quarter: cur.period_of_report,
    quarterLabel: quarterLabelLong(cur.period_of_report),
    priorQuarter: prior ? prior.period_of_report : null,
    totalValueUsd: total,
    positions: rows.length,
    href: cur.index_url || null,
    holdings: rows,
  };
}

const cachedFund = unstable_cache(loadFund, ['titans-fund-v1'], CACHE);
export function getFundHoldings(cik) {
  return cachedFund(String(cik || ''));
}

/* ── Titans Shadow steps 2 to 4 (each in its own module) ───────────── */
export { getInsiderOverview, searchInsider } from './insider-store';
export { getFundamentalsTable, getFundamentalsHistory } from './fundamentals-store';
export { getExecCompTable, getExecCompHistory } from './exec-comp-store';
export { getEtfFunds, getEtfFund, getEtfHolders, getEtfOverlap } from './etf-store';
