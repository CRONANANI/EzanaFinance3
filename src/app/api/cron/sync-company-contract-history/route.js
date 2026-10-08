import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { isBigQueryConfigured } from '@/lib/bigquery-client';
import { companyTopAwards, companyYearTotals } from '@/lib/bigquery-company-contracts';

/**
 * GET /api/cron/sync-company-contract-history
 *
 * Ten fiscal years of federal contracts for every ticker in contractor_tickers,
 * from BigQuery into company_contract_history (ticker x FY x agency) and
 * company_contract_top_awards (15 largest per ticker), for the Capitol Watch
 * company card. Weekly; idempotent (upserts, then rows from earlier runs are
 * removed only after a complete run).
 *
 *   ?dry=1      report the bytes each query would scan, write nothing
 *   ?fyTo=2026  last fiscal year (default: the latest in gov_contract_coverage)
 *
 * CRON_SECRET bearer (or ?key=).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const YEARS = 10;
const CHUNK = 500;

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

/* BigQuery numeric and date cells come back as number | string | { value }. */
const val = (v) => (v != null && typeof v === 'object' && 'value' in v ? v.value : v);
const num = (v) => Number(val(v)) || 0;

async function upsert(admin, table, rows, onConflict, errors) {
  let n = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) errors.push(`${table}@${i}: ${error.message}`);
    else n += Math.min(CHUNK, rows.length - i);
  }
  return n;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isBigQueryConfigured()) {
    return NextResponse.json({ ok: false, error: 'BigQuery not configured' }, { status: 503 });
  }
  const started = Date.now();
  const sp = new URL(request.url).searchParams;
  const dryRun = sp.get('dry') === '1';
  const admin = getAdminClient();
  const errors = [];

  /* Name keys -> tickers (a ticker can have several recipient names). */
  const keyRows = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('contractor_tickers')
      .select('name_key, ticker')
      .not('ticker', 'is', null)
      .order('name_key')
      .range(from, from + 999);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    keyRows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const tickerOf = new Map(
    keyRows.filter((r) => r.name_key).map((r) => [r.name_key, String(r.ticker).toUpperCase()]),
  );
  const keys = [...tickerOf.keys()];
  if (!keys.length) return NextResponse.json({ ok: false, error: 'no name keys' }, { status: 500 });

  let fyTo = Number(sp.get('fyTo')) || null;
  if (!fyTo) {
    const { data } = await admin
      .from('gov_contract_coverage')
      .select('fiscal_year')
      .order('fiscal_year', { ascending: false })
      .limit(1);
    fyTo = data?.[0]?.fiscal_year || new Date().getUTCFullYear();
  }
  const fyFrom = fyTo - YEARS + 1;

  if (dryRun) {
    const [a, b] = await Promise.all([
      companyYearTotals({ keys, fyFrom, fyTo, dryRun: true }),
      companyTopAwards({ keys, fyFrom, fyTo, dryRun: true }),
    ]);
    return NextResponse.json({
      ok: !a.error && !b.error,
      dryRun: true,
      keys: keys.length,
      fyFrom,
      fyTo,
      bytes: { yearTotals: a.bytes, topAwards: b.bytes },
      gb: { yearTotals: a.bytes / 1e9, topAwards: b.bytes / 1e9 },
      errors: [a.error, b.error].filter(Boolean),
    });
  }

  const [years, tops] = await Promise.all([
    companyYearTotals({ keys, fyFrom, fyTo }),
    companyTopAwards({ keys, fyFrom, fyTo }),
  ]);
  if (years.error || tops.error) {
    return NextResponse.json(
      { ok: false, errors: [years.error, tops.error].filter(Boolean) },
      { status: 502 },
    );
  }

  const syncedAt = new Date().toISOString();

  /* ticker x FY x agency (several name keys of one ticker add up). */
  const agg = new Map();
  for (const r of years.rows) {
    const ticker = tickerOf.get(val(r.name_key));
    if (!ticker) continue;
    const fy = num(r.fiscal_year);
    const agency = val(r.awarding_agency) || 'Other';
    const k = `${ticker}|${fy}|${agency}`;
    const cur = agg.get(k) || {
      ticker,
      fiscal_year: fy,
      awarding_agency: agency,
      award_count: 0,
      total_amount: 0,
      synced_at: syncedAt,
    };
    cur.award_count += num(r.awards);
    cur.total_amount += num(r.total);
    agg.set(k, cur);
  }
  const historyRows = [...agg.values()].map((r) => ({
    ...r,
    total_amount: Math.round(r.total_amount * 100) / 100,
  }));

  /* 15 largest per ticker across its name keys. */
  const byTicker = new Map();
  for (const r of tops.rows) {
    const ticker = tickerOf.get(val(r.name_key));
    const id = val(r.generated_award_id);
    if (!ticker || !id) continue;
    if (!byTicker.has(ticker)) byTicker.set(ticker, []);
    byTicker.get(ticker).push({
      ticker,
      generated_award_id: String(id),
      recipient_name: val(r.recipient_name) || null,
      awarding_agency: val(r.awarding_agency) || null,
      award_amount: num(r.award_amount),
      action_date: val(r.action_date) ? String(val(r.action_date)).slice(0, 10) : null,
      fiscal_year: num(r.fiscal_year) || null,
      synced_at: syncedAt,
    });
  }
  const topRows = [];
  for (const list of byTicker.values()) {
    const seen = new Set();
    list
      .sort((a, b) => b.award_amount - a.award_amount)
      .filter((a) => !seen.has(a.generated_award_id) && seen.add(a.generated_award_id))
      .slice(0, 15)
      .forEach((a) => topRows.push(a));
  }

  const wroteHistory = await upsert(
    admin,
    'company_contract_history',
    historyRows,
    'ticker,fiscal_year,awarding_agency',
    errors,
  );
  const wroteTop = await upsert(
    admin,
    'company_contract_top_awards',
    topRows,
    'ticker,generated_award_id',
    errors,
  );

  /* Only a complete run clears what earlier runs wrote and this one did not. */
  if (!errors.length) {
    const a = await admin.from('company_contract_history').delete().lt('synced_at', syncedAt);
    const b = await admin.from('company_contract_top_awards').delete().lt('synced_at', syncedAt);
    if (a.error) errors.push(`prune history: ${a.error.message}`);
    if (b.error) errors.push(`prune top: ${b.error.message}`);
  }
  revalidateTag('hubs');

  return NextResponse.json({
    ok: errors.length === 0,
    keys: keys.length,
    fyFrom,
    fyTo,
    tickers: new Set(historyRows.map((r) => r.ticker)).size,
    historyRows: wroteHistory,
    topRows: wroteTop,
    gbBilled: ((years.bytes || 0) + (tops.bytes || 0)) / 1e9,
    ms: Date.now() - started,
    errors: errors.slice(0, 10),
  });
}
