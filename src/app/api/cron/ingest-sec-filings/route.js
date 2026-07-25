import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import {
  searchFilings,
  getTickerMap,
  buildCikTickerIndex,
  edgarUrls,
  cleanFilerName,
  secRequestCount,
} from '@/lib/sec-edgar';

/**
 * Rolling ingest of the newest SEC EDGAR filings into Supabase (Phase 1:
 * metadata). Mirrors the other ingest crons: CRON_SECRET guard, admin client,
 * idempotent chunked upsert on accession_no. Pulls a bounded recent window per
 * form family; the page reads Supabase, never EDGAR directly.
 *
 * EDGAR access rules live in @/lib/sec-edgar (mandatory User-Agent, <=6 req/s
 * throttle). Families are fetched SEQUENTIALLY so the throttle holds.
 *
 * Auth: CRON_SECRET bearer (or ?key=).
 *   GET /api/cron/ingest-sec-filings?days=7&size=100
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const UPSERT_CHUNK = 500;

const FORM_FAMILIES = [
  { family: 'insider', forms: '4' },
  { family: 'institutional', forms: '13F-HR' },
  { family: 'activist', forms: 'SC 13D,SC 13G' },
];

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

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

async function upsertChunked(admin, table, rows, onConflict) {
  let count = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin.from(table).upsert(chunk, { onConflict });
    if (error) errors.push(`${table}@${i}: ${error.message}`);
    else count += chunk.length;
  }
  return { count, errors };
}

/** One efts hit → sec_filings row, or null when it can't be mapped safely. */
function mapHit(hit, family, cikTicker) {
  const src = hit?._source || {};
  const id = String(hit?._id || '');
  const [accessionNo, primaryDoc] = id.split(':');
  if (!accessionNo) return null;

  const ciks = Array.isArray(src.ciks) ? src.ciks.map((c) => String(c)) : [];
  const cik = ciks[0] || (src.cik ? String(src.cik) : '');
  if (!cik) return null;

  const names = Array.isArray(src.display_names) ? src.display_names : [];
  const filerName = cleanFilerName(names[0]) || 'Unknown filer';

  // Subject ticker where a filing CIK maps to a public company (best-effort).
  let ticker = null;
  for (const c of ciks) {
    const hitTicker = cikTicker.get(String(parseInt(c, 10)));
    if (hitTicker) {
      ticker = hitTicker;
      break;
    }
  }

  const formType = String(
    src.file_type || (Array.isArray(src.root_forms) ? src.root_forms[0] : '') || '',
  );
  const filedAt = src.file_date || src.filed_at || null;
  if (!filedAt) return null;

  const { indexUrl, primaryDocUrl } = edgarUrls({ accessionNo, cik, primaryDoc });

  return {
    accession_no: accessionNo,
    form_type: formType || FORM_FAMILIES.find((f) => f.family === family)?.forms || '',
    form_family: family,
    cik: String(cik).padStart(10, '0'),
    filer_name: filerName,
    ticker,
    filed_at: filedAt,
    period_of_report: src.period_ending || null,
    primary_doc_url: primaryDocUrl,
    index_url: indexUrl,
  };
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(Number(searchParams.get('days')) || 7, 1), 90);

  const now = new Date();
  const enddt = isoDate(now);
  const startdt = isoDate(new Date(now.getTime() - days * 24 * 60 * 60 * 1000));

  const admin = getAdminClient();
  const errors = [];
  const perFamily = {};

  // Ticker map once (large but rarely changes); tolerate failure — ticker
  // resolution is best-effort and the feed works without it.
  let cikTicker = new Map();
  try {
    cikTicker = buildCikTickerIndex(await getTickerMap());
  } catch (e) {
    errors.push(`ticker map: ${e?.message || e}`);
  }

  // Sequential per family so the throttle in secFetch holds.
  for (const { family, forms } of FORM_FAMILIES) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const json = await searchFilings({ forms, startdt, enddt });
      const hits = json?.hits?.hits || [];
      const rows = hits.map((h) => mapHit(h, family, cikTicker)).filter(Boolean);
      // De-dupe within the batch (an accession can surface under >1 doc).
      const byAcc = new Map();
      for (const r of rows) byAcc.set(r.accession_no, r);
      const deduped = [...byAcc.values()];
      // eslint-disable-next-line no-await-in-loop
      const res = await upsertChunked(admin, 'sec_filings', deduped, 'accession_no');
      perFamily[family] = res.count;
      errors.push(...res.errors);
    } catch (e) {
      errors.push(`${family}: ${e?.message || e}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    window: { startdt, enddt, days },
    filings_upserted: perFamily,
    sec_requests: secRequestCount(),
    errors: errors.slice(0, 20),
  });
}
