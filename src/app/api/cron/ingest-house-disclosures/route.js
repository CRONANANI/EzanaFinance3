import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { unzipEntries } from '@/lib/house-disclosures/unzip';
import { parseHouseIndexTxt } from '@/lib/house-disclosures/parse-index';

/**
 * Ingest the U.S. House Clerk's yearly financial-disclosure INDEX into
 * public.house_disclosure_filings. One row per filing; NO trades (those are in
 * per-filing PDFs — Phase 2 / parse-house-ptrs).
 *
 * The files are tiny (~70KB/year), so rather than staging through GCS (the
 * USAspending pattern) this fetches the Clerk zip directly, unzips <YEAR>FD.txt in
 * memory, parses it, and chunk-upserts on doc_id (idempotent — re-running never
 * duplicates). This is the "simpler alternative" the design note endorsed given
 * the size; no GCS bucket or manual upload to maintain.
 *
 * Auth: CRON_SECRET bearer (or ?key=). The Clerk is a free gov server (no key);
 * we send a descriptive User-Agent and fetch only a couple of small files.
 *   GET /api/cron/ingest-house-disclosures?years=2026,2025
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const UA = 'EzanaFinance/1.0 (+https://ezana.world; datasets@ezana.world)';
const ZIP_BASE = 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs';
const UPSERT_BATCH = 200;

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

/** Current + prior calendar year, unless ?years= overrides. */
function resolveYears(searchParams) {
  const raw = searchParams.get('years');
  if (raw) {
    return [...new Set(raw.split(',').map((y) => Number(y.trim())).filter((y) => y >= 2000 && y <= 2100))];
  }
  // No Date.now() dependence beyond "this year" — a static default is fine; the
  // schedule keeps it current and ?years= backfills history explicitly.
  const thisYear = new Date().getUTCFullYear();
  return [thisYear, thisYear - 1];
}

async function ingestYear(admin, year, errors) {
  const url = `${ZIP_BASE}/${year}FD.zip`;
  const res = await fetch(url, { headers: { 'User-Agent': UA }, cache: 'no-store' });
  if (!res.ok) {
    errors.push(`${year}: fetch ${res.status}`);
    return 0;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const entries = unzipEntries(buf);
  const txt = entries.get(`${year}FD.txt`);
  if (!txt) {
    errors.push(`${year}: no ${year}FD.txt in zip`);
    return 0;
  }
  const rows = parseHouseIndexTxt(txt.toString('utf8'));
  if (!rows.length) {
    errors.push(`${year}: parsed 0 rows`);
    return 0;
  }

  // Chunked upsert on doc_id (idempotent). trades_parsed/needs_ocr are managed by
  // Phase 2, so DON'T send them here — let the DB keep any prior value.
  let written = 0;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const chunk = rows.slice(i, i + UPSERT_BATCH).map((r) => ({ ...r, synced_at: new Date().toISOString() }));
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin
      .from('house_disclosure_filings')
      .upsert(chunk, { onConflict: 'doc_id', ignoreDuplicates: false });
    if (error) errors.push(`${year}: upsert ${error.message}`);
    else written += chunk.length;
  }
  return written;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const years = resolveYears(searchParams);
  const admin = getAdminClient();
  const errors = [];
  const perYear = {};

  for (const year of years) {
    try {
      // eslint-disable-next-line no-await-in-loop
      perYear[year] = await ingestYear(admin, year, errors);
    } catch (e) {
      errors.push(`${year}: ${e?.message || e}`);
      perYear[year] = 0;
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    years,
    filings_upserted: perYear,
    errors: errors.slice(0, 20),
  });
}
