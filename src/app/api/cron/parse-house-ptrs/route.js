import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { extractPdfText, parsePtrText, looksScanned } from '@/lib/house-disclosures/parse-ptr-pdf';

/**
 * Phase 2: parse ELECTRONIC House PTR PDFs into public.house_trades.
 *
 * Iterates filings that are is_ptr AND is_electronic AND NOT trades_parsed AND NOT
 * needs_ocr, bounded per run to stay within the function timeout and be polite to
 * the Clerk's server. For each: fetch the PDF (descriptive User-Agent, throttled),
 * extract text, and —
 *   - little/no text  → mark needs_ocr = true, skip (scanned filing; OCR later).
 *   - real text       → parse the transaction table, replace the filing's trades
 *                       (idempotent), and set trades_parsed = true.
 *
 * Amounts are stored as brackets (low/high/midpoint/label); the midpoint is a
 * labeled estimate only. Tickers come solely from a parenthesized symbol — a
 * non-security asset stays ticker=null. Auth: CRON_SECRET bearer (or ?key=).
 *   GET /api/cron/parse-house-ptrs?max=15
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const UA = 'EzanaFinance/1.0 (+https://ezana.world; datasets@ezana.world)';
const THROTTLE_MS = 400; // a few requests/sec to a gov server
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const max = Math.min(Math.max(Number(searchParams.get('max')) || 15, 1), 40);
  const admin = getAdminClient();

  const { data: filings, error } = await admin
    .from('house_disclosure_filings')
    .select('doc_id, last_name, first_name, state_dst, pdf_url, filing_date')
    .eq('is_ptr', true)
    .eq('is_electronic', true)
    .eq('trades_parsed', false)
    .eq('needs_ocr', false)
    .order('filing_date', { ascending: false })
    .limit(max);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const errors = [];
  let parsed = 0;
  let scanned = 0;
  let tradeRows = 0;

  for (const f of filings || []) {
    try {
      if (!f.pdf_url) continue;
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(f.pdf_url, { headers: { 'User-Agent': UA }, cache: 'no-store' });
      if (!res.ok) {
        errors.push(`${f.doc_id}: fetch ${res.status}`);
        // eslint-disable-next-line no-await-in-loop
        await sleep(THROTTLE_MS);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const buf = Buffer.from(await res.arrayBuffer());
      // eslint-disable-next-line no-await-in-loop
      const text = await extractPdfText(buf);

      if (looksScanned(text)) {
        // eslint-disable-next-line no-await-in-loop
        await admin.from('house_disclosure_filings').update({ needs_ocr: true }).eq('doc_id', f.doc_id);
        scanned += 1;
        // eslint-disable-next-line no-await-in-loop
        await sleep(THROTTLE_MS);
        continue;
      }

      const { trades } = parsePtrText(text);
      const rows = trades.map((t) => ({
        doc_id: f.doc_id,
        last_name: f.last_name,
        first_name: f.first_name,
        state_dst: f.state_dst,
        ...t,
      }));

      // Replace this filing's trades (idempotent on re-parse), then flag done.
      // eslint-disable-next-line no-await-in-loop
      await admin.from('house_trades').delete().eq('doc_id', f.doc_id);
      if (rows.length) {
        // eslint-disable-next-line no-await-in-loop
        const { error: insErr } = await admin.from('house_trades').insert(rows);
        if (insErr) {
          errors.push(`${f.doc_id}: insert ${insErr.message}`);
        } else {
          tradeRows += rows.length;
        }
      }
      // eslint-disable-next-line no-await-in-loop
      await admin.from('house_disclosure_filings').update({ trades_parsed: true }).eq('doc_id', f.doc_id);
      parsed += 1;

      // eslint-disable-next-line no-await-in-loop
      await sleep(THROTTLE_MS);
    } catch (e) {
      errors.push(`${f.doc_id}: ${e?.message || e}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    filings_parsed: parsed,
    flagged_needs_ocr: scanned,
    trade_rows: tradeRows,
    errors: errors.slice(0, 20),
  });
}
