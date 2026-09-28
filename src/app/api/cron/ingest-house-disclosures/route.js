import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { downloadGcsText, isGcsConfigured } from '@/lib/house-disclosures/gcs';
import { parseHouseIndexTxt } from '@/lib/house-disclosures/parse-index';
import { dedupeByDocId } from '@/lib/house-disclosures/dedupe';
import { writeWithOptionalColumn } from '@/lib/db/optional-column';

/**
 * Ingest the U.S. House Clerk's yearly financial-disclosure INDEX into
 * public.house_disclosure_filings. One row per filing; NO trades (those are in
 * per-filing PDFs — Phase 2 / parse-house-ptrs).
 *
 * The index ships in two column layouts (9 columns for 2015–2026, 11 for
 * 2008–2014); parse-index.js resolves them by header name and fills
 * covered_year / disclosure_type on the years that carry them. Each year's
 * source row count is recorded in house_disclosure_coverage.
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

/* What the SOURCE file held for this year, recorded so a thin year reads as a
   thin year. The Clerk's 2014 bundle really does contain only 11 filings, in
   both the TXT and the XML; with no count on record that is indistinguishable
   from a download that half-failed, and the page has no way to tell the
   difference. Counted from the parsed rows rather than from what the upsert
   wrote, because the question this answers is what the Clerk published. */
async function recordCoverage(admin, year, rows, duplicates, errors) {
  const payload = {
    year,
    /* UNIQUE filings: rows is the de-duplicated list, which is what is
         stored and what the page serves. The Clerk's own line count for the
         year is this plus `duplicates`. */
    filings: rows.length,
    /* Repeat DocIDs the Clerk listed inside this one year, dropped before
         the upsert. Recorded so a year whose stored count is under the
         source's line count reads as de-duplicated rather than short. */
    duplicates,
    ptrs: rows.filter((r) => r.is_ptr).length,
    /* Which SIGNAL this year's PTRs came from: the 2008-2014 files mark them
         with DisclosureType = 'PTR', the 2015+ files with FilingType = 'P'.
         Split out so a year reporting zero PTRs can be investigated rather
         than assumed empty. */
    ptrs_legacy: rows.filter((r) => r.is_ptr && r.disclosure_type).length,
    /* Dates the source got wrong, not dates it omitted: filing_date_raw is
         set only where a date was present and rejected, so a withdrawal's
         legitimately blank date never counts here. */
    bad_dates: rows.filter((r) => r.filing_date_raw).length,
    loaded_at: new Date().toISOString(),
  };

  /* The duplicates column arrives in its own migration, applied by hand
     after this deploys. PostgREST rejects the whole row for one unknown
     column, so sending it unconditionally would turn every coverage write
     into an error until the migration lands — a worse failure than the one
     this change fixes. */
  const { error } = await writeWithOptionalColumn(
    payload,
    'duplicates',
    (row) => admin.from('house_disclosure_coverage').upsert(row, { onConflict: 'year' }),
    () =>
      console.warn(
        `[ingest-house-disclosures] ${year}: house_disclosure_coverage.duplicates is missing; ` +
          'apply 20260928130000_house_coverage_duplicates.sql to record it. Writing without it.',
      ),
  );

  if (error) {
    errors.push(`${year}: coverage ${error.message}`);
    return false;
  }
  return true;
}

async function ingestYear(admin, year, errors) {
  const text = await downloadGcsText(BUCKET, `${year}FD.txt`);
  const parsedRows = parseHouseIndexTxt(text);
  const parsed = parsedRows.length;
  if (!parsed) {
    errors.push(`${year}: parsed 0 rows`);
    /* Still recorded: zero from a file that parsed is a real answer about the
       source, and leaving the row stale would be the misleading option. */
    const coverage = await recordCoverage(admin, year, parsedRows, 0, errors);
    return { parsed: 0, written: 0, duplicates: 0, complete: coverage };
  }

  /* Before chunking, not after: a repeated doc_id anywhere inside a chunk
     makes Postgres reject the whole chunk, so de-duplicating per chunk would
     still lose rows across a repeat that straddles a boundary. */
  const { rows, duplicates, duplicateIds } = dedupeByDocId(parsedRows);
  if (duplicates) {
    console.warn(
      `[ingest-house-disclosures] ${year}: dropped ${duplicates} duplicate doc_id row(s); ` +
        `first ${Math.min(10, duplicateIds.length)}: ${duplicateIds.slice(0, 10).join(', ')}`,
    );
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
  const coverage = await recordCoverage(admin, year, rows, duplicates, errors);
  /* Complete means every UNIQUE row landed and the coverage row landed with
     it. Anything less and `ok` must not claim the year. */
  return { parsed, written, duplicates, complete: written === rows.length && coverage };
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isGcsConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'GCP credentials not configured' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const years = resolveYears(searchParams);
  const admin = getAdminClient();
  const errors = [];
  /* per_year keeps its original shape — year -> rows written — because the
     ingest runbook and the check script both read it as a number. The new
     detail rides alongside in per_year_detail and duplicates. */
  const perYear = {};
  const perYearDetail = {};
  const duplicatesByYear = {};
  let total = 0;
  let allComplete = true;

  for (const year of years) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const r = await ingestYear(admin, year, errors);
      perYear[year] = r.written;
      perYearDetail[year] = { parsed: r.parsed, written: r.written, duplicates: r.duplicates };
      duplicatesByYear[year] = r.duplicates;
      total += r.written;
      if (!r.complete) allComplete = false;
    } catch (e) {
      errors.push(`${year}: ${e?.message || e}`);
      perYear[year] = 0;
      perYearDetail[year] = { parsed: 0, written: 0, duplicates: 0 };
      duplicatesByYear[year] = 0;
      allComplete = false;
    }
  }

  return NextResponse.json({
    /* Both conditions: a year can log an error yet still be counted complete
       by a later retry, and a year can write every row but fail its coverage
       upsert. `ok` claims the run only when neither happened. */
    ok: errors.length === 0 && allComplete,
    years_processed: years.length,
    total_rows: total,
    total_duplicates: Object.values(duplicatesByYear).reduce((a, b) => a + b, 0),
    per_year: perYear,
    per_year_detail: perYearDetail,
    duplicates: duplicatesByYear,
    errors: errors.slice(0, 20),
  });
}
