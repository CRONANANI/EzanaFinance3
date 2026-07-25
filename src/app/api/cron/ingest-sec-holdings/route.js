import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import {
  secFetchText,
  getFilingIndexJson,
  find13FInfoTableUrl,
  secRequestCount,
} from '@/lib/sec-edgar';
import { parseInfoTable, normalize13FValue, parseActivistCover } from '@/lib/sec-13f-parse';

/**
 * Phase 2: parse holdings for filings already in sec_filings.
 *   - 13F  → INFORMATION TABLE XML → sec_13f_holdings (whole-USD normalized)
 *   - 13D/G → cover-page percent/shares → sec_activist_positions
 * Bounded per run (only filings not yet parsed, capped) so it stays within the
 * function timeout and the SEC throttle. Idempotent. Separate from the metadata
 * cron to keep each run short. Auth: CRON_SECRET bearer (or ?key=).
 *   GET /api/cron/ingest-sec-holdings?max13f=12&maxActivist=15
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

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

/** Recent filings of a family that have no parsed rows yet, newest first. */
async function unparsed(admin, family, childTable, childKey, lookback, cap) {
  const { data: filings } = await admin
    .from('sec_filings')
    .select('accession_no, cik, filed_at, period_of_report, primary_doc_url')
    .eq('form_family', family)
    .order('filed_at', { ascending: false })
    .limit(lookback);
  const list = filings || [];
  if (!list.length) return [];
  const accs = list.map((f) => f.accession_no);
  const { data: done } = await admin.from(childTable).select(childKey).in(childKey, accs);
  const doneSet = new Set((done || []).map((r) => r[childKey]));
  return list.filter((f) => !doneSet.has(f.accession_no)).slice(0, cap);
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const max13f = Math.min(Math.max(Number(searchParams.get('max13f')) || 12, 1), 40);
  const maxActivist = Math.min(Math.max(Number(searchParams.get('maxActivist')) || 15, 1), 60);

  const admin = getAdminClient();
  const errors = [];
  let holdingsRows = 0;
  let positions = 0;

  // ── 13F holdings ──────────────────────────────────────────────────────────
  const f13 = await unparsed(admin, 'institutional', 'sec_13f_holdings', 'accession_no', 60, max13f);
  for (const f of f13) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const index = await getFilingIndexJson({ cik: f.cik, accessionNo: f.accession_no });
      const url = find13FInfoTableUrl(index, { cik: f.cik, accessionNo: f.accession_no });
      if (!url) {
        errors.push(`13f ${f.accession_no}: no info table`);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const xml = await secFetchText(url);
      const parsed = parseInfoTable(xml);
      if (!parsed.length) continue;
      const rows = parsed.map((p) => ({
        accession_no: f.accession_no,
        name_of_issuer: p.name_of_issuer,
        cusip: p.cusip,
        ticker: null, // company_tickers.json is CIK-keyed, not CUSIP — leave honest null
        value_usd: normalize13FValue(p.value, {
          periodOfReport: f.period_of_report,
          filedAt: f.filed_at,
        }),
        shares: p.shares,
        share_type: p.share_type,
        put_call: p.put_call,
      }));
      // Replace this filing's holdings (idempotent on re-parse).
      // eslint-disable-next-line no-await-in-loop
      await admin.from('sec_13f_holdings').delete().eq('accession_no', f.accession_no);
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin.from('sec_13f_holdings').insert(rows);
      if (error) errors.push(`13f ${f.accession_no}: ${error.message}`);
      else holdingsRows += rows.length;
    } catch (e) {
      errors.push(`13f ${f.accession_no}: ${e?.message || e}`);
    }
  }

  // ── 13D/13G stakes ────────────────────────────────────────────────────────
  const act = await unparsed(admin, 'activist', 'sec_activist_positions', 'accession_no', 60, maxActivist);
  for (const f of act) {
    try {
      if (!f.primary_doc_url) continue;
      // eslint-disable-next-line no-await-in-loop
      const text = await secFetchText(f.primary_doc_url);
      const cover = parseActivistCover(text);
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin.from('sec_activist_positions').upsert(
        {
          accession_no: f.accession_no,
          subject_name: cover.subject_name,
          subject_cik: null,
          subject_ticker: null,
          percent_of_class: cover.percent_of_class,
          shares: cover.shares,
        },
        { onConflict: 'accession_no' },
      );
      if (error) errors.push(`activist ${f.accession_no}: ${error.message}`);
      else positions += 1;
    } catch (e) {
      errors.push(`activist ${f.accession_no}: ${e?.message || e}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    holdings_rows: holdingsRows,
    activist_positions: positions,
    sec_requests: secRequestCount(),
    errors: errors.slice(0, 20),
  });
}
