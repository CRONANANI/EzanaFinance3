import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import {
  getTickerMap,
  getSubmissions,
  buildCikTickerIndex,
  secRequestCount,
} from '@/lib/sec-edgar';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * GET /api/cron/sync-company-industry (Sonar 6.4, Nov 28 2026)
 *
 * Fills public.company_industry with each listed registrant's SEC SIC code from EDGAR
 * submissions, for the tickers Ezana holds filed figures for (ticker_sectors). Resumable:
 * tickers with no row, then rows older than 90 days, up to the time budget. One request
 * per company through the shared SEC throttle (sec-edgar.js, 6 a second).
 *
 *   ?max=600     companies per run (default 600)
 *   ?dry=1       report what would be read, write nothing
 *
 * CRON_SECRET bearer only (cronRoute).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const BUDGET_MS = 260_000;
const STALE_DAYS = 90;

async function run(request) {
  const started = Date.now();
  const sp = new URL(request.url).searchParams;
  const max = Math.min(2000, Math.max(1, Number(sp.get('max')) || 600));
  const dry = sp.get('dry') === '1';
  const admin = getAdminClient();

  /* The tickers Ezana screens (ticker_sectors) and what is already classified. */
  const tickers = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('ticker_sectors')
      .select('ticker')
      .order('ticker')
      .range(from, from + 999);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    tickers.push(...(data || []).map((r) => String(r.ticker).toUpperCase()));
    if (!data || data.length < 1000) break;
  }
  const have = new Map();
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('company_industry')
      .select('ticker, verified_at')
      .order('ticker')
      .range(from, from + 999);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    for (const r of data || []) have.set(r.ticker, Date.parse(r.verified_at) || 0);
    if (!data || data.length < 1000) break;
  }
  const staleBefore = Date.now() - STALE_DAYS * 86400000;
  const queue = [
    ...tickers.filter((t) => !have.has(t)),
    ...tickers
      .filter((t) => have.has(t) && have.get(t) < staleBefore)
      .sort((a, b) => have.get(a) - have.get(b)),
  ].slice(0, max);

  /* Ticker to CIK from the SEC's own list. */
  const map = await getTickerMap();
  const cikOf = new Map();
  for (const [cik, ticker] of buildCikTickerIndex(map))
    cikOf.set(String(ticker).toUpperCase(), cik);
  for (const k of Object.keys(map || {})) {
    const row = map[k];
    const t = String(row?.ticker || '').toUpperCase();
    if (t && row?.cik_str != null && !cikOf.has(t)) cikOf.set(t, String(row.cik_str));
  }
  if (dry)
    return NextResponse.json({
      ok: true,
      dry: true,
      queued: queue.length,
      withCik: queue.filter((t) => cikOf.has(t)).length,
      sample: queue.slice(0, 10),
    });

  const rows = [];
  const skipped = { no_cik: 0, no_sic: 0, failed: 0 };
  for (const t of queue) {
    if (Date.now() - started > BUDGET_MS) break;
    const cik = cikOf.get(t);
    if (!cik) {
      skipped.no_cik += 1;
      continue;
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const sub = await getSubmissions(cik);
      const sic = sub?.sic ? String(sub.sic).trim() : null;
      if (!sic) {
        skipped.no_sic += 1;
        continue;
      }
      rows.push({
        ticker: t,
        cik: String(cik).padStart(10, '0'),
        sic,
        sic_description: sub.sicDescription || null,
        entity_name: sub.name || null,
        source: 'sec_submissions',
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch {
      skipped.failed += 1;
    }
  }
  let written = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i += 500) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin
      .from('company_industry')
      .upsert(rows.slice(i, i + 500), { onConflict: 'ticker' });
    if (error) errors.push(error.message);
    else written += Math.min(500, rows.length - i);
  }
  return NextResponse.json({
    ok: errors.length === 0,
    queued: queue.length,
    written,
    skipped,
    remaining: Math.max(
      0,
      queue.length - written - skipped.no_cik - skipped.no_sic - skipped.failed,
    ),
    secRequests: secRequestCount(),
    ms: Date.now() - started,
    errors,
  });
}

export const GET = cronRoute('sync-company-industry', run, { ttlSeconds: 330 });
