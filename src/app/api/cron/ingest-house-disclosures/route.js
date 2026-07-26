import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { downloadGcsText, isGcsConfigured } from '@/lib/house-disclosures/gcs';
import { parseHouseIndexTxt } from '@/lib/house-disclosures/parse-index';

/**
 * Ingest the U.S. House Clerk's yearly financial-disclosure INDEX into
 * public.house_disclosure_filings. One row per filing; NO trades (those are in
 * per-filing PDFs — Phase 2 / parse-house-ptrs).
 *
 * Source: the 19 yearly <YEAR>FD.txt files staged in gs://ezana-house-disclosures/
 * (2008–2026), read with the existing GCP service-account credentials (see
 * lib/house-disclosures/gcs.js — reuses google-auth-library rather than adding the
 * @google-cloud/storage SDK). Each file is parsed and chunk-upserted on doc_id, so
 * re-running never duplicates. Each year is wrapped in try/catch so one missing or
 * failed file doesn't abort the rest.
 *
 * Auth: CRON_SECRET bearer (or ?key=). Query:
 *   ?year=2026        — load a single year (use this to verify against known truth)
 *   ?years=2026,2025  — load a specific set
 *   (none)            — load all 19 years, 2008–2026
 *   GET /api/cron/ingest-house-disclosures?year=2026
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const BUCKET = 'ezana-house-disclosures';
const ALL_YEARS = Array.from({ length: 2026 - 2008 + 1 }, (_, i) => 2008 + i);
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

function resolveYears(searchParams) {
  const one = searchParams.get('year');
  if (one) {
    const y = Number(one);
    return Number.isFinite(y) ? [y] : [];
  }
  const many = searchParams.get('years');
  if (many) {
    return [
      ...new Set(
        many
          .split(',')
          .map((y) => Number(y.trim()))
          .filter((y) => y >= 2000 && y <= 2100),
      ),
    ];
  }
  return ALL_YEARS;
}

async function ingestYear(admin, year, errors) {
  const text = await downloadGcsText(BUCKET, `${year}FD.txt`);
  const rows = parseHouseIndexTxt(text);
  if (!rows.length) {
    errors.push(`${year}: parsed 0 rows`);
    return 0;
  }
  // Chunked upsert on doc_id (idempotent). trades_parsed/needs_ocr are owned by
  // Phase 2 — don't send them here so the DB keeps any prior value.
  let written = 0;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const chunk = rows
      .slice(i, i + UPSERT_BATCH)
      .map((r) => ({ ...r, synced_at: new Date().toISOString() }));
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
  if (!isGcsConfigured()) {
    return NextResponse.json({ ok: false, error: 'GCP credentials not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const years = resolveYears(searchParams);
  const admin = getAdminClient();
  const errors = [];
  const perYear = {};
  let total = 0;

  for (const year of years) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const n = await ingestYear(admin, year, errors);
      perYear[year] = n;
      total += n;
    } catch (e) {
      errors.push(`${year}: ${e?.message || e}`);
      perYear[year] = 0;
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    years_processed: years.length,
    total_rows: total,
    per_year: perYear,
    errors: errors.slice(0, 20),
  });
}
