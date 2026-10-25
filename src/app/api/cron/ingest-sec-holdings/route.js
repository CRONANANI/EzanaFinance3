import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import {
  secFetchText,
  getFilingIndexJson,
  find13FInfoTableUrl,
  getTickerMap,
  buildCikTickerIndex,
  edgarUrls,
  secRequestCount,
} from '@/lib/sec-edgar';
import {
  parseInfoTable,
  normalize13FValue,
  parseActivistCover,
  parseSchedule13Xml,
} from '@/lib/sec-13f-parse';
import { recentPeriods } from '@/lib/sec/quarters';
import {
  SCHEDULE13_PARSER_VERSION,
  parseSecHeader,
  buildActivistRow,
} from '@/lib/sec/schedule13-meta';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * Phase 2: parse holdings for filings already in sec_filings.
 *   - 13F  -> INFORMATION TABLE XML -> sec_13f_holdings (whole-USD normalized).
 *            Only filings for recent quarters are parsed (the running quarter,
 *            the latest complete one and the one before it); late filings for
 *            old periods stay indexed in sec_filings but are not parsed.
 *            Tickers: a 13F names securities by CUSIP, so the ticker comes from
 *            sec_cusip_map (filled from OpenFIGI by /api/cron/map-cusips); a
 *            CUSIP not mapped yet stays null and apply_cusip_tickers() fills it
 *            later.
 *   - 13D/13G -> the structured XML cover (SCHEDULE 13D/13G, Dec 2024 on) or,
 *            for older text/HTML filings, the best-effort cover scrape ->
 *            sec_activist_positions. Parser v2 (Oct 2026) also stores the
 *            investor (from the cover, or for legacy filings from the SEC
 *            header's FILED BY block), Item 3 source of funds, Item 4 purpose
 *            and its keyword tags, reporting-person types, voting and
 *            dispositive power, the 13G filing rule, the group flag and the
 *            amendment number. Rows parsed by an older parser version are
 *            re-read from EDGAR, newest first, up to ?maxReparse per run.
 * Retention: holdings for quarters older than the parse window are deleted at
 * the end of each run (sec_filings rows are never deleted).
 *
 * Bounded per run so it stays within the function timeout and the SEC throttle
 * (each 13F costs two SEC requests, each 13D/13G one or two; at about 6 req/s
 * the default caps take well under a minute of SEC time). Idempotent.
 * Auth: CRON_SECRET bearer only (cronRoute).
 *   GET /api/cron/ingest-sec-holdings?max13f=40&maxActivist=40[&maxReparse=20]
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const RUN_BUDGET_MS = 230_000;
const PROBE_BATCH = 40;
const INSERT_CHUNK = 1000;
const IN_CHUNK = 300;

/** Recent-period 13F filings with no holdings yet: newest period first. */
async function unparsed13F(admin, periods, cap) {
  const list = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_filings')
      .select('accession_no, cik, filed_at, period_of_report')
      .eq('form_family', 'institutional')
      .in('period_of_report', periods)
      .order('period_of_report', { ascending: false })
      .order('filed_at', { ascending: false })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    list.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  /* A holdings row per filing is enough to know it is parsed. One tiny probe
     per filing (in parallel batches) instead of an in() that would return
     every holding row. */
  const out = [];
  for (let i = 0; i < list.length && out.length < cap; i += PROBE_BATCH) {
    const batch = list.slice(i, i + PROBE_BATCH);
    // eslint-disable-next-line no-await-in-loop
    const probes = await Promise.all(
      batch.map((f) =>
        admin.from('sec_13f_holdings').select('id').eq('accession_no', f.accession_no).limit(1),
      ),
    );
    batch.forEach((f, j) => {
      if (!probes[j].error && !(probes[j].data || []).length) out.push(f);
    });
  }
  return out.slice(0, cap);
}

/** Activist filings, newest first, not yet in sec_activist_positions. */
async function unparsedActivist(admin, lookback, cap) {
  const { data } = await admin
    .from('sec_filings')
    .select('accession_no, cik, form_type, filed_at, primary_doc_url')
    .eq('form_family', 'activist')
    .order('filed_at', { ascending: false })
    .limit(lookback);
  const list = data || [];
  const done = new Set();
  for (let i = 0; i < list.length; i += IN_CHUNK) {
    const accs = list.slice(i, i + IN_CHUNK).map((f) => f.accession_no);
    // eslint-disable-next-line no-await-in-loop
    const { data: rows } = await admin
      .from('sec_activist_positions')
      .select('accession_no')
      .in('accession_no', accs);
    for (const r of rows || []) done.add(r.accession_no);
  }
  return list.filter((f) => !done.has(f.accession_no)).slice(0, cap);
}

/** CUSIP -> mapped ticker from sec_cusip_map. */
async function tickersFor(admin, cusips) {
  const out = new Map();
  const list = [...new Set(cusips.filter(Boolean).map((c) => String(c).trim().toUpperCase()))];
  for (let i = 0; i < list.length; i += IN_CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await admin
      .from('sec_cusip_map')
      .select('cusip, ticker')
      .eq('status', 'mapped')
      .in('cusip', list.slice(i, i + IN_CHUNK));
    for (const r of data || []) if (r.ticker) out.set(r.cusip, r.ticker);
  }
  return out;
}

/* EDGAR serves the structured cover through an XSL rendering
   (…/xslSCHEDULE_13D_X01/primary_doc.xml); the raw XML sits one level up. */
const rawXmlUrl = (url) => String(url || '').replace(/\/xsl[^/]*\//i, '/');

/* Legacy (pre-structured) filing: the full submission .txt carries both the
   SEC header (SUBJECT COMPANY / FILED BY, which tells the investor apart from
   the target) and the cover text, in one request. */
async function fetchLegacyCover(f) {
  const { base } = edgarUrls({ accessionNo: f.accession_no, cik: f.cik });
  let text = null;
  try {
    text = await secFetchText(`${base}/${f.accession_no}.txt`);
  } catch {
    if (f.primary_doc_url) text = await secFetchText(f.primary_doc_url);
  }
  if (!text) return null;
  const header = parseSecHeader(text);
  const cover = parseActivistCover(text);
  return {
    form_type: null,
    subject_name: cover.subject_name || header.subject?.name || null,
    subject_cik: header.subject?.cik || null,
    subject_cusip: null,
    event_date: null,
    percent_of_class: cover.percent_of_class,
    shares: cover.shares,
    reporting_persons: [],
    header,
    via: 'text',
  };
}

async function fetchActivistCover(f) {
  const structured = /^SCHEDULE\s/i.test(String(f.form_type || ''));
  if (!structured) return fetchLegacyCover(f);
  let url = f.primary_doc_url ? rawXmlUrl(f.primary_doc_url) : null;
  if (!url || !/\.xml$/i.test(url)) {
    // New-style filing whose search hit pointed at another document: find the
    // XML primary document in the filing index.
    const index = await getFilingIndexJson({ cik: f.cik, accessionNo: f.accession_no });
    const items = index?.directory?.item || [];
    const xml =
      items.find((it) => /primary_doc\.xml$/i.test(it?.name || '')) ||
      items.find((it) => /\.xml$/i.test(it?.name || ''));
    if (xml) url = `${edgarUrls({ accessionNo: f.accession_no, cik: f.cik }).base}/${xml.name}`;
  }
  if (!url) return fetchLegacyCover(f);
  const parsed = parseSchedule13Xml(await secFetchText(url));
  return parsed ? { ...parsed, via: 'xml' } : fetchLegacyCover(f);
}

/** Filings whose stored row came from an older parser, newest first. */
async function staleActivist(admin, cap) {
  if (cap <= 0) return [];
  const { data: stale, error } = await admin
    .from('sec_activist_positions')
    .select('accession_no')
    .or(`parser_version.is.null,parser_version.lt.${SCHEDULE13_PARSER_VERSION}`)
    .limit(cap * 3);
  if (error || !stale?.length) return [];
  const { data } = await admin
    .from('sec_filings')
    .select('accession_no, cik, form_type, filed_at, primary_doc_url')
    .in(
      'accession_no',
      stale.map((r) => r.accession_no),
    )
    .order('filed_at', { ascending: false })
    .limit(cap);
  return data || [];
}

/** Delete holdings of filings older than the parse window, by accession. */
async function applyRetention(admin, oldestKept, errors) {
  let removed = 0;
  const accs = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_filings')
      .select('accession_no')
      .eq('form_family', 'institutional')
      .lt('period_of_report', oldestKept)
      .order('accession_no')
      .range(from, from + 999);
    if (error) {
      errors.push(`retention list: ${error.message}`);
      return removed;
    }
    accs.push(...(data || []).map((r) => r.accession_no));
    if (!data || data.length < 1000) break;
  }
  for (let i = 0; i < accs.length; i += 50) {
    // eslint-disable-next-line no-await-in-loop
    const { count, error } = await admin
      .from('sec_13f_holdings')
      .delete({ count: 'exact' })
      .in('accession_no', accs.slice(i, i + 50));
    if (error) errors.push(`retention: ${error.message}`);
    else removed += count || 0;
  }
  return removed;
}

async function run(request) {
  const started = Date.now();
  const outOfTime = () => Date.now() - started > RUN_BUDGET_MS;
  const { searchParams } = new URL(request.url);
  const max13f = Math.min(Math.max(Number(searchParams.get('max13f')) || 12, 1), 60);
  const maxActivist = Math.min(Math.max(Number(searchParams.get('maxActivist')) || 15, 1), 60);

  const admin = getAdminClient();
  const errors = [];
  const periods = recentPeriods(new Date());
  let filings13f = 0;
  let holdingsRows = 0;
  let mappedAtInsert = 0;
  let positions = 0;
  let viaXml = 0;

  // ── 13F holdings ──────────────────────────────────────────────────────────
  let f13 = [];
  try {
    f13 = await unparsed13F(admin, periods, max13f);
  } catch (e) {
    errors.push(`13f queue: ${e?.message || e}`);
  }
  for (const f of f13) {
    if (outOfTime()) break;
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
      // eslint-disable-next-line no-await-in-loop
      const known = await tickersFor(
        admin,
        parsed.map((p) => p.cusip),
      );
      const rows = parsed.map((p) => {
        const cusip = p.cusip ? String(p.cusip).trim().toUpperCase() : null;
        const ticker = (cusip && known.get(cusip)) || null;
        if (ticker) mappedAtInsert += 1;
        return {
          accession_no: f.accession_no,
          name_of_issuer: p.name_of_issuer,
          cusip,
          ticker,
          value_usd: normalize13FValue(p.value, {
            periodOfReport: f.period_of_report,
            filedAt: f.filed_at,
          }),
          shares: p.shares,
          share_type: p.share_type,
          put_call: p.put_call,
        };
      });
      // Replace this filing's holdings (idempotent on re-parse).
      // eslint-disable-next-line no-await-in-loop
      await admin.from('sec_13f_holdings').delete().eq('accession_no', f.accession_no);
      let failed = false;
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        // eslint-disable-next-line no-await-in-loop
        const { error } = await admin
          .from('sec_13f_holdings')
          .insert(rows.slice(i, i + INSERT_CHUNK));
        if (error) {
          errors.push(`13f ${f.accession_no}: ${error.message}`);
          failed = true;
          break;
        }
      }
      if (failed) {
        // Never leave a half-written filing: it would read as parsed.
        // eslint-disable-next-line no-await-in-loop
        await admin.from('sec_13f_holdings').delete().eq('accession_no', f.accession_no);
        continue;
      }
      filings13f += 1;
      holdingsRows += rows.length;
    } catch (e) {
      errors.push(`13f ${f.accession_no}: ${e?.message || e}`);
    }
  }

  // ── 13D/13G stakes: new filings first, then rows from an older parser ────
  const maxReparse = Math.min(Math.max(Number(searchParams.get('maxReparse') ?? 20) || 0, 0), 60);
  let reparsed = 0;
  let legacyFilerFound = 0;
  let cikTicker = null;

  const subjectTickerFor = async (cover) => {
    if (cover.subject_cusip) {
      const t = (await tickersFor(admin, [cover.subject_cusip])).get(cover.subject_cusip);
      if (t) return t;
    }
    if (!cover.subject_cik) return null;
    if (!cikTicker) {
      try {
        cikTicker = buildCikTickerIndex(await getTickerMap());
      } catch (e) {
        cikTicker = new Map();
        errors.push(`ticker map: ${e?.message || e}`);
      }
    }
    return cikTicker.get(String(parseInt(cover.subject_cik, 10))) || null;
  };

  const processActivist = async (f) => {
    const cover = await fetchActivistCover(f);
    if (!cover) return false;
    if (cover.via === 'xml') viaXml += 1;
    if (cover.via === 'text' && cover.header?.filedBy) legacyFilerFound += 1;
    const row = buildActivistRow({
      accessionNo: f.accession_no,
      filingFormType: f.form_type,
      cover,
      subjectTicker: await subjectTickerFor(cover),
    });
    const { error } = await admin
      .from('sec_activist_positions')
      .upsert(row, { onConflict: 'accession_no' });
    if (error) {
      errors.push(`activist ${f.accession_no}: ${error.message}`);
      return false;
    }
    return true;
  };

  const act = await unparsedActivist(admin, 400, maxActivist);
  for (const f of act) {
    if (outOfTime()) break;
    try {
      // eslint-disable-next-line no-await-in-loop
      if (await processActivist(f)) positions += 1;
    } catch (e) {
      errors.push(`activist ${f.accession_no}: ${e?.message || e}`);
    }
  }

  const stale = outOfTime() ? [] : await staleActivist(admin, maxReparse);
  for (const f of stale) {
    if (outOfTime()) break;
    try {
      // eslint-disable-next-line no-await-in-loop
      if (await processActivist(f)) reparsed += 1;
    } catch (e) {
      errors.push(`activist reparse ${f.accession_no}: ${e?.message || e}`);
    }
  }

  // ── Retention: holdings only for the parse window ─────────────────────────
  const oldestKept = periods[periods.length - 1];
  const removed = await applyRetention(admin, oldestKept, errors);
  if (removed)
    console.log(
      `[ingest-sec-holdings] retention removed ${removed} holdings older than ${oldestKept}`,
    );

  if (holdingsRows || positions || reparsed || removed) {
    revalidateTag('titans');
    revalidateTag('hubs');
    /* The Burry watcher reads Scion's 13F (24 h cache otherwise). */
    revalidateTag('burry');
  }

  return NextResponse.json({
    ok: errors.length === 0,
    periods,
    filings_13f: filings13f,
    holdings_rows: holdingsRows,
    tickers_at_insert: mappedAtInsert,
    activist_positions: positions,
    activist_xml: viaXml,
    activist_reparsed: reparsed,
    activist_legacy_filer_found: legacyFilerFound,
    retention_removed: removed,
    sec_requests: secRequestCount(),
    errors: errors.slice(0, 20),
  });
}

export const GET = cronRoute('ingest-sec-holdings', run, { ttlSeconds: 360 });
