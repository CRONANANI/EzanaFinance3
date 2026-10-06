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
 *   GET /api/cron/ingest-sec-filings?days=3[&pages=5]
 *
 * Schedule 13D/13G: since the SEC's structured-data rules (Dec 2024) these are
 * filed as SCHEDULE 13D / SCHEDULE 13G (+ /A); older filings used SC 13D /
 * SC 13G. Both spellings are requested.
 *
 * Backfill mode (run by hand, not scheduled):
 *   GET /api/cron/ingest-sec-filings?from=2026-04-01&to=2026-05-20&forms=13F-HR&pages=40
 * pages efts 100 hits at a time and inserts ONLY filings whose CIK already has a
 * 13F in sec_filings (the filers we track), so a prior quarter can be loaded
 * for comparison without pulling every filer in the market.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const UPSERT_CHUNK = 500;
const PAGE_SIZE = 100; // efts returns 100 hits per page
const MAX_PAGES = 60; // 60 requests at the 6/s throttle is about 10 s per family

const ACTIVIST_FORMS = [
  'SCHEDULE 13D',
  'SCHEDULE 13D/A',
  'SCHEDULE 13G',
  'SCHEDULE 13G/A',
  'SC 13D',
  'SC 13D/A',
  'SC 13G',
  'SC 13G/A',
].join(',');

const FORM_FAMILIES = [
  { family: 'insider', forms: '4' },
  { family: 'institutional', forms: '13F-HR,13F-HR/A' },
  { family: 'activist', forms: ACTIVIST_FORMS },
];

const FAMILY_FOR_FORM = (form) => {
  const f = String(form || '').toUpperCase();
  if (/^13F/.test(f)) return 'institutional';
  if (/13[DG]/.test(f)) return 'activist';
  if (/^4(\/A)?$/.test(f)) return 'insider';
  return null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

/** Page through efts for one form list; returns mapped rows (deduped). */
async function fetchFamily({ family, forms, startdt, enddt, pages, cikTicker, errors }) {
  const byAcc = new Map();
  for (let page = 0; page < pages; page += 1) {
    let json;
    try {
      // eslint-disable-next-line no-await-in-loop
      json = await searchFilings({ forms, startdt, enddt, from: page * PAGE_SIZE });
    } catch (e) {
      errors.push(`${family} page ${page}: ${e?.message || e}`);
      break;
    }
    const hits = json?.hits?.hits || [];
    for (const h of hits) {
      const r = mapHit(h, family, cikTicker);
      // An accession can surface under more than one document.
      if (r) byAcc.set(r.accession_no, r);
    }
    const total = Number(json?.hits?.total?.value ?? json?.hits?.total ?? 0);
    if (hits.length < PAGE_SIZE || (total && (page + 1) * PAGE_SIZE >= total)) break;
  }
  return [...byAcc.values()];
}

/** CIKs that already have a 13F in sec_filings (the filers we track). */
async function trackedInstitutionalCiks(admin) {
  const ciks = new Set();
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_filings')
      .select('cik')
      .eq('form_family', 'institutional')
      .order('accession_no')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data || []) ciks.add(r.cik);
    if (!data || data.length < 1000) break;
  }
  return ciks;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const backfill = DATE_RE.test(fromParam || '') && DATE_RE.test(toParam || '');
  const days = Math.min(Math.max(Number(searchParams.get('days')) || 7, 1), 90);
  const pages = Math.min(
    Math.max(Number(searchParams.get('pages')) || (backfill ? 10 : 5), 1),
    MAX_PAGES,
  );

  const now = new Date();
  const enddt = backfill ? toParam : isoDate(now);
  const startdt = backfill
    ? fromParam
    : isoDate(new Date(now.getTime() - days * 24 * 60 * 60 * 1000));

  const admin = getAdminClient();
  const errors = [];
  const perFamily = {};

  // Ticker map once (large but rarely changes); tolerate failure, ticker
  // resolution is best-effort and the feed works without it.
  let cikTicker = new Map();
  try {
    cikTicker = buildCikTickerIndex(await getTickerMap());
  } catch (e) {
    errors.push(`ticker map: ${e?.message || e}`);
  }

  if (backfill) {
    const forms = searchParams.get('forms') || '13F-HR';
    const family = FAMILY_FOR_FORM(forms.split(',')[0]);
    if (family !== 'institutional') {
      return NextResponse.json(
        { ok: false, error: 'backfill supports 13F forms only' },
        { status: 400 },
      );
    }
    let tracked;
    try {
      tracked = await trackedInstitutionalCiks(admin);
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: `tracked ciks: ${e?.message || e}` },
        { status: 500 },
      );
    }
    const rows = await fetchFamily({ family, forms, startdt, enddt, pages, cikTicker, errors });
    const keep = rows.filter((r) => tracked.has(r.cik));
    const res = await upsertChunked(admin, 'sec_filings', keep, 'accession_no');
    errors.push(...res.errors);
    return NextResponse.json({
      ok: errors.length === 0,
      mode: 'backfill',
      window: { startdt, enddt, pages },
      seen: rows.length,
      tracked_filers: tracked.size,
      indexed: res.count,
      periods: keep.reduce((acc, r) => {
        const k = r.period_of_report || 'unknown';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {}),
      sec_requests: secRequestCount(),
      errors: errors.slice(0, 20),
    });
  }

  // Sequential per family so the throttle in secFetch holds.
  for (const { family, forms } of FORM_FAMILIES) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await fetchFamily({ family, forms, startdt, enddt, pages, cikTicker, errors });
    // eslint-disable-next-line no-await-in-loop
    const res = await upsertChunked(admin, 'sec_filings', rows, 'accession_no');
    perFamily[family] = res.count;
    errors.push(...res.errors);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    window: { startdt, enddt, days, pages },
    filings_upserted: perFamily,
    sec_requests: secRequestCount(),
    errors: errors.slice(0, 20),
  });
}
