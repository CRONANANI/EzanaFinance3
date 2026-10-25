import { NextResponse } from 'next/server';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { pickTickerPairs } from '@/lib/lobbying/feed';
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * One-off: harvest Quiver's client-to-ticker pairs into lobbying_client_tickers
 * before the Quiver lobbying feed is retired, so ticker lookups (the Sonar
 * dossier, ?onlyPublic=1, the feed's Ticker column) keep their coverage.
 *
 * Not scheduled. Run by hand after the migration, as many times as you like:
 *   curl ".../api/cron/harvest-lobbying-tickers?maxPages=40" -H "Authorization: Bearer <cron secret>"
 *
 * Rows are inserted with source = 'quiver' and verified = false. Existing rows
 * (the curated ones included) are never overwritten, and a client Quiver maps
 * to more than one ticker is skipped rather than guessed. The response reports
 * how many of our lobbying_filings rows the harvested pairs now map.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const BASE = 'https://api.quiverquant.com/beta/live/lobbying';
const PAGE_SIZE = 500;
const MAX_PAGES_CAP = 200;
const DEADLINE_MS = 240_000;

async function fetchPage(key, page) {
  const qs = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
  try {
    const res = await fetchWithTimeout(
      `${BASE}?${qs}`,
      {
        headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
        cache: 'no-store',
      },
      8000,
    );
    if (res.status === 404) return { rows: [] };
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    return { rows: Array.isArray(data) ? data : [] };
  } catch (e) {
    return { error: e?.message || 'fetch failed' };
  }
}

async function run(request) {
  const key = process.env.QUIVER_API_KEY;
  if (!key)
    return NextResponse.json({ ok: false, error: 'QUIVER_API_KEY not set' }, { status: 503 });
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const started = Date.now();
  const sp = new URL(request.url).searchParams;
  const maxPages = Math.min(Math.max(Number(sp.get('maxPages')) || 40, 1), MAX_PAGES_CAP);

  const rows = [];
  let pages = 0;
  let fetchError = null;
  for (let page = 0; page < maxPages; page += 1) {
    if (Date.now() - started > DEADLINE_MS) break;
    const out = await fetchPage(key, page);
    if (out.error) {
      fetchError = `page ${page}: ${out.error}`;
      break;
    }
    pages += 1;
    rows.push(...out.rows);
    if (out.rows.length < PAGE_SIZE) break;
  }

  const { pairs, ambiguous, skipped } = pickTickerPairs(rows);
  const admin = getAdminClient();

  const existing = new Set();
  for (let i = 0; i < pairs.length; i += 200) {
    const names = pairs.slice(i, i + 200).map((p) => p.client_name);
    const { data, error } = await admin
      .from('lobbying_client_tickers')
      .select('client_name')
      .in('client_name', names);
    if (error) {
      console.error('[harvest-lobbying-tickers] lookup:', error.message);
      return NextResponse.json({ ok: false, error: 'Lookup failed' }, { status: 500 });
    }
    for (const r of data || []) existing.add(r.client_name);
  }

  const fresh = pairs
    .filter((p) => !existing.has(p.client_name))
    .map((p) => ({ ...p, source: 'quiver', verified: false }));
  let inserted = 0;
  for (let i = 0; i < fresh.length; i += 500) {
    const chunk = fresh.slice(i, i + 500);
    const { error } = await admin
      .from('lobbying_client_tickers')
      .upsert(chunk, { onConflict: 'client_name', ignoreDuplicates: true });
    if (error) {
      console.error('[harvest-lobbying-tickers] insert:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Insert failed (is the 20261020120000 migration applied?)', inserted },
        { status: 500 },
      );
    }
    inserted += chunk.length;
  }

  // Filings the inserted pairs now map (exact counts, chunked).
  let filingsNowMapped = 0;
  for (let i = 0; i < fresh.length; i += 200) {
    const names = fresh.slice(i, i + 200).map((p) => p.client_name);
    const { count, error } = await admin
      .from('lobbying_filings')
      .select('uuid', { count: 'exact', head: true })
      .in('client_name', names);
    if (!error) filingsNowMapped += count || 0;
  }

  return NextResponse.json({
    ok: !fetchError,
    pages,
    quiverRows: rows.length,
    pairs: pairs.length,
    alreadyMapped: pairs.length - fresh.length,
    inserted,
    filingsNowMapped,
    ambiguous: ambiguous.slice(0, 50),
    ambiguousCount: ambiguous.length,
    skippedRows: skipped,
    fetchError,
    ms: Date.now() - started,
  });
}

export const GET = cronRoute('harvest-lobbying-tickers', run, { ttlSeconds: 360 });
