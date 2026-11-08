import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { secFetchText, getTickerMap, buildCikTickerIndex, secRequestCount } from '@/lib/sec-edgar';
import {
  dailyIndexUrl,
  businessDays,
  parseFormIndex,
  toInsiderFilingRows,
} from '@/lib/sec/daily-form-index';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * Index every Form 4 and 4/A the SEC accepted on the last ?days= business
 * days (default 2, cap 10) into sec_filings, from EDGAR's daily form index
 * (one request per day). ingest-insider then parses them into
 * sec_insider_transactions.
 *
 * Replaces the hourly `ingest-sec-filings?families=insider` run, whose efts
 * browse indexed about 10 Form 4s a day. Existing rows are left untouched
 * (ignoreDuplicates), so efts-indexed rows keep their primary document URL.
 * Today's index only exists once the SEC publishes it (late evening ET); a
 * missing day (weekend, holiday, not yet published) is skipped, not an error.
 *
 * Auth: Bearer cron secret (cronRoute).
 *   GET /api/cron/index-insider-daily?days=2
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const UPSERT_CHUNK = 500;

function isoDaysAgo(n, now = new Date()) {
  return new Date(now.getTime() - n * 86_400_000).toISOString().slice(0, 10);
}

async function run(request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(Number(searchParams.get('days')) || 2, 1), 10);
  /* Calendar span wide enough to hold `days` business days. */
  const dates = businessDays(isoDaysAgo(days + 4), isoDaysAgo(0)).slice(-days - 1);

  const admin = getAdminClient();
  const errors = [];
  const perDay = {};

  let cikTicker = new Map();
  try {
    cikTicker = buildCikTickerIndex(await getTickerMap());
  } catch (e) {
    errors.push(`ticker map: ${e?.message || e}`);
  }

  for (const day of dates) {
    let text = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      text = await secFetchText(dailyIndexUrl(day));
    } catch (e) {
      const msg = String(e?.message || e);
      if (/\b(403|404)\b/.test(msg)) {
        perDay[day] = 'not published';
        continue;
      }
      errors.push(`${day}: ${msg}`);
      continue;
    }
    const rows = toInsiderFilingRows(parseFormIndex(text), cikTicker);
    let indexed = 0;
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin.from('sec_filings').upsert(rows.slice(i, i + UPSERT_CHUNK), {
        onConflict: 'accession_no',
        ignoreDuplicates: true,
      });
      if (error) errors.push(`${day}@${i}: ${error.message}`);
      else indexed += Math.min(UPSERT_CHUNK, rows.length - i);
    }
    perDay[day] = { form4s: rows.length, upserted: indexed };
  }

  return NextResponse.json({
    ok: errors.length === 0,
    days: perDay,
    sec_requests: secRequestCount(),
    errors: errors.slice(0, 20),
  });
}

export const GET = cronRoute('index-insider-daily', run, { ttlSeconds: 300 });
