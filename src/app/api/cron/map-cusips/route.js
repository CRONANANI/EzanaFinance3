import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { createFigiClient, CUSIP_RE } from '@/lib/openfigi';

/**
 * Hourly CUSIP to ticker mapping via OpenFIGI into sec_cusip_map, then
 * apply_cusip_tickers() and apply_cusip_tickers_etf() fill tickers on 13F
 * holdings, ETF holdings (Form N-PORT), whale moves and
 * Schedule 13D/13G stakes.
 *
 * Needs a lookup: CUSIPs on 13F rows without a ticker and on activist stakes,
 * that are not in sec_cusip_map yet, or are there with status 'error', or
 * 'unmapped' and checked more than 30 days ago. Runs for about 240 seconds and
 * upserts as it goes, so a timeout never loses finished work.
 *
 * Auth: CRON_SECRET bearer (or ?key=).
 *   curl https://ezana.world/api/cron/map-cusips -H "Authorization: Bearer $CRON_SECRET"
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const RUN_BUDGET_MS = 240_000;
const PAGE = 1000;
const IN_CHUNK = 300;
const RECHECK_UNMAPPED_DAYS = 30;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

const norm = (c) =>
  String(c || '')
    .trim()
    .toUpperCase();

/** Distinct valid CUSIPs from 13F rows without a ticker and from activist stakes. */
async function candidateCusips(admin) {
  const set = new Set();
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_13f_holdings')
      .select('cusip')
      .is('ticker', null)
      .not('cusip', 'is', null)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`holdings: ${error.message}`);
    for (const r of data || []) {
      const c = norm(r.cusip);
      if (CUSIP_RE.test(c)) set.add(c);
    }
    if (!data || data.length < PAGE) break;
  }
  const { data: act, error: aErr } = await admin
    .from('sec_activist_positions')
    .select('subject_cusip')
    .not('subject_cusip', 'is', null)
    .limit(5000);
  if (aErr) throw new Error(`activist: ${aErr.message}`);
  for (const r of act || []) {
    const c = norm(r.subject_cusip);
    if (CUSIP_RE.test(c)) set.add(c);
  }
  // ETF holdings (Form N-PORT) without a ticker.
  for (let from = 0; from < 200000; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_etf_holdings')
      .select('cusip')
      .is('ticker', null)
      .not('cusip', 'is', null)
      .order('series_id')
      .order('report_date')
      .order('line_no')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`etf holdings: ${error.message}`);
    for (const r of data || []) {
      const c = norm(r.cusip);
      if (CUSIP_RE.test(c)) set.add(c);
    }
    if (!data || data.length < PAGE) break;
  }
  return [...set];
}

/** Drop CUSIPs already settled in sec_cusip_map. */
async function needingLookup(admin, cusips) {
  const cutoff = new Date(Date.now() - RECHECK_UNMAPPED_DAYS * 86400000).toISOString();
  const settled = new Set();
  for (let i = 0; i < cusips.length; i += IN_CHUNK) {
    const chunk = cusips.slice(i, i + IN_CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_cusip_map')
      .select('cusip, status, checked_at')
      .in('cusip', chunk);
    if (error) throw new Error(`map read: ${error.message}`);
    for (const r of data || []) {
      if (r.status === 'mapped') settled.add(r.cusip);
      else if (r.status === 'unmapped' && r.checked_at > cutoff) settled.add(r.cusip);
    }
  }
  return cusips.filter((c) => !settled.has(c));
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const started = Date.now();
  const admin = getAdminClient();
  const errors = [];
  let lookedUp = 0;
  let mapped = 0;
  let unmapped = 0;
  let jobErrors = 0;

  let queue = [];
  try {
    queue = await needingLookup(admin, await candidateCusips(admin));
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }

  const figi = createFigiClient();
  let i = 0;
  while (i < queue.length && Date.now() - started < RUN_BUDGET_MS) {
    const batch = queue.slice(i, i + figi.jobsPerRequest);
    i += batch.length;
    let rows;
    try {
      // eslint-disable-next-line no-await-in-loop
      rows = await figi.map(batch);
    } catch (e) {
      errors.push(e?.message || String(e));
      if (errors.length >= 3) break; // the service is refusing us; try next hour
      continue;
    }
    const now = new Date().toISOString();
    const stamped = rows.map((r) => ({ ...r, checked_at: now }));
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin.from('sec_cusip_map').upsert(stamped, { onConflict: 'cusip' });
    if (error) {
      errors.push(`map write: ${error.message}`);
      continue;
    }
    lookedUp += rows.length;
    for (const r of rows) {
      if (r.status === 'mapped') mapped += 1;
      else if (r.status === 'unmapped') unmapped += 1;
      else jobErrors += 1;
    }
  }

  let applied = null;
  const { data: applyData, error: applyErr } = await admin.rpc('apply_cusip_tickers');
  if (applyErr) errors.push(`apply_cusip_tickers: ${applyErr.message}`);
  else applied = applyData;
  const { data: etfApplied, error: etfErr } = await admin.rpc('apply_cusip_tickers_etf');
  if (etfErr) errors.push(`apply_cusip_tickers_etf: ${etfErr.message}`);
  else if (applied) applied = { ...applied, etf_holdings: etfApplied };

  const wrote = mapped > 0 || (applied && Object.values(applied).some((n) => Number(n) > 0));
  if (wrote) revalidateTag('titans');

  return NextResponse.json({
    ok: errors.length === 0,
    looked_up: lookedUp,
    mapped,
    unmapped,
    errors: jobErrors,
    remaining: Math.max(0, queue.length - i),
    applied,
    problems: errors.slice(0, 10),
  });
}
