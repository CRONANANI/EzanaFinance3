import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { secFetchText, getFilingIndexJson, edgarUrls, secRequestCount } from '@/lib/sec-edgar';
import { parseForm4Xml, form4ToRows, rawForm4Url } from '@/lib/sec/form4';

/**
 * Parse Form 4 filings already indexed in sec_filings (form_family 'insider')
 * into sec_insider_transactions, newest first, up to ?max= (default 150, cap
 * 300) per run.
 *
 * A Form 4 that reports only holdings parses to zero transaction rows and
 * writes nothing, so it would look unparsed forever. To stop such filings
 * being refetched every run, the queue only looks at filings from the last 7
 * days; older history comes from the SEC insider data sets
 * (scripts/backfill-insider-datasets.mjs).
 *
 * One or two SEC requests per filing (raw XML, plus the filing index when the
 * indexed document is not the XML), through the shared throttle in
 * @/lib/sec-edgar. Auth: CRON_SECRET bearer (or ?key=).
 *   GET /api/cron/ingest-insider?max=150
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const RUN_BUDGET_MS = 230_000;
const WINDOW_DAYS = 7;
const IN_CHUNK = 100;

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

async function unparsed(admin, cap) {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
  const list = [];
  for (let from = 0; from < 5000; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_filings')
      .select('accession_no, cik, form_type, filed_at, primary_doc_url')
      .eq('form_family', 'insider')
      .gte('filed_at', since)
      .order('filed_at', { ascending: false })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    list.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const out = [];
  for (let i = 0; i < list.length && out.length < cap; i += IN_CHUNK) {
    const chunk = list.slice(i, i + IN_CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const { data: done, error } = await admin
      .from('sec_insider_transactions')
      .select('accession_no')
      .in(
        'accession_no',
        chunk.map((f) => f.accession_no),
      )
      .limit(1000);
    if (error) throw new Error(error.message);
    const seen = new Set((done || []).map((r) => r.accession_no));
    for (const f of chunk) if (!seen.has(f.accession_no)) out.push(f);
  }
  return out.slice(0, cap);
}

async function form4Xml(f) {
  let url = f.primary_doc_url ? rawForm4Url(f.primary_doc_url) : null;
  if (!url || !/\.xml$/i.test(url)) {
    const index = await getFilingIndexJson({ cik: f.cik, accessionNo: f.accession_no });
    const xml = (index?.directory?.item || []).find((it) => /\.xml$/i.test(it?.name || ''));
    if (!xml) return null;
    url = `${edgarUrls({ accessionNo: f.accession_no, cik: f.cik }).base}/${xml.name}`;
  }
  return secFetchText(url);
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const started = Date.now();
  const { searchParams } = new URL(request.url);
  const max = Math.min(Math.max(Number(searchParams.get('max')) || 150, 1), 300);

  const admin = getAdminClient();
  const errors = [];
  let filings = 0;
  let rows = 0;
  let holdingsOnly = 0;

  let queue = [];
  try {
    queue = await unparsed(admin, max);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }

  for (const f of queue) {
    if (Date.now() - started > RUN_BUDGET_MS) break;
    try {
      // eslint-disable-next-line no-await-in-loop
      const xml = await form4Xml(f);
      const parsed = parseForm4Xml(xml);
      if (!parsed) {
        errors.push(`${f.accession_no}: not a Form 4 XML document`);
        continue;
      }
      const out = form4ToRows(parsed, { accessionNo: f.accession_no, filedAt: f.filed_at });
      if (!out.length) {
        holdingsOnly += 1;
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin
        .from('sec_insider_transactions')
        .upsert(out, { onConflict: 'accession_no,table_kind,line_no' });
      if (error) errors.push(`${f.accession_no}: ${error.message}`);
      else {
        filings += 1;
        rows += out.length;
      }
    } catch (e) {
      errors.push(`${f.accession_no}: ${e?.message || e}`);
    }
  }

  if (rows) {
    revalidateTag('titans');
    revalidateTag('hubs');
  }

  return NextResponse.json({
    ok: errors.length === 0,
    queued: queue.length,
    filings,
    rows,
    holdings_only: holdingsOnly,
    sec_requests: secRequestCount(),
    errors: errors.slice(0, 20),
  });
}
