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
  isAmendmentForm,
} from '@/lib/sec-13f-parse';
import { recentPeriods } from '@/lib/sec/quarters';

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
 *            sec_activist_positions.
 * Retention: holdings for quarters older than the parse window are deleted at
 * the end of each run (sec_filings rows are never deleted).
 *
 * Bounded per run so it stays within the function timeout and the SEC throttle
 * (each 13F costs two SEC requests, each 13D/13G one or two; at about 6 req/s
 * the default caps take well under a minute of SEC time). Idempotent.
 * Auth: CRON_SECRET bearer (or ?key=).
 *   GET /api/cron/ingest-sec-holdings?max13f=40&maxActivist=40
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const RUN_BUDGET_MS = 230_000;
const PROBE_BATCH = 40;
const INSERT_CHUNK = 1000;
const IN_CHUNK = 300;

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

async function fetchActivistCover(f) {
  let url = f.primary_doc_url ? rawXmlUrl(f.primary_doc_url) : null;
  const structured = /^SCHEDULE\s/i.test(String(f.form_type || ''));
  if ((!url || !/\.xml$/i.test(url)) && structured) {
    // New-style filing whose search hit pointed at another document: find the
    // XML primary document in the filing index.
    const index = await getFilingIndexJson({ cik: f.cik, accessionNo: f.accession_no });
    const items = index?.directory?.item || [];
    const xml =
      items.find((it) => /primary_doc\.xml$/i.test(it?.name || '')) ||
      items.find((it) => /\.xml$/i.test(it?.name || ''));
    if (xml) url = `${edgarUrls({ accessionNo: f.accession_no, cik: f.cik }).base}/${xml.name}`;
  }
  if (!url) return null;
  const text = await secFetchText(url);
  const parsed = parseSchedule13Xml(text);
  if (parsed) return { ...parsed, via: 'xml' };
  const cover = parseActivistCover(text);
  return {
    form_type: null,
    subject_name: cover.subject_name,
    subject_cik: null,
    subject_cusip: null,
    event_date: null,
    percent_of_class: cover.percent_of_class,
    shares: cover.shares,
    reporting_persons: [],
    via: 'text',
  };
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

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

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

  // ── 13D/13G stakes ────────────────────────────────────────────────────────
  const act = await unparsedActivist(admin, 400, maxActivist);
  let cikTicker = null;
  for (const f of act) {
    if (outOfTime()) break;
    try {
      // eslint-disable-next-line no-await-in-loop
      const cover = await fetchActivistCover(f);
      if (!cover) continue;
      if (cover.via === 'xml') viaXml += 1;

      let subjectTicker = null;
      if (cover.subject_cusip) {
        // eslint-disable-next-line no-await-in-loop
        subjectTicker =
          (await tickersFor(admin, [cover.subject_cusip])).get(cover.subject_cusip) || null;
      }
      if (!subjectTicker && cover.subject_cik) {
        if (!cikTicker) {
          try {
            // eslint-disable-next-line no-await-in-loop
            cikTicker = buildCikTickerIndex(await getTickerMap());
          } catch (e) {
            cikTicker = new Map();
            errors.push(`ticker map: ${e?.message || e}`);
          }
        }
        subjectTicker = cikTicker.get(String(parseInt(cover.subject_cik, 10))) || null;
      }

      const formType = cover.form_type || f.form_type || null;
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin.from('sec_activist_positions').upsert(
        {
          accession_no: f.accession_no,
          subject_name: cover.subject_name,
          subject_cik: cover.subject_cik,
          subject_cusip: cover.subject_cusip,
          subject_ticker: subjectTicker,
          percent_of_class: cover.percent_of_class,
          shares: cover.shares,
          form_type: formType,
          event_date: cover.event_date,
          reporting_persons: cover.reporting_persons || [],
          is_amendment: isAmendmentForm(formType),
        },
        { onConflict: 'accession_no' },
      );
      if (error) errors.push(`activist ${f.accession_no}: ${error.message}`);
      else positions += 1;
    } catch (e) {
      errors.push(`activist ${f.accession_no}: ${e?.message || e}`);
    }
  }

  // ── Retention: holdings only for the parse window ─────────────────────────
  const oldestKept = periods[periods.length - 1];
  const removed = await applyRetention(admin, oldestKept, errors);
  if (removed)
    console.log(
      `[ingest-sec-holdings] retention removed ${removed} holdings older than ${oldestKept}`,
    );

  if (holdingsRows || positions || removed) revalidateTag('titans');

  return NextResponse.json({
    ok: errors.length === 0,
    periods,
    filings_13f: filings13f,
    holdings_rows: holdingsRows,
    tickers_at_insert: mappedAtInsert,
    activist_positions: positions,
    activist_xml: viaXml,
    retention_removed: removed,
    sec_requests: secRequestCount(),
    errors: errors.slice(0, 20),
  });
}
