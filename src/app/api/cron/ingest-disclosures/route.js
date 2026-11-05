import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import {
  getTickerMap,
  getSubmissions,
  edgarUrls,
  secFetchText,
  secRequestCount,
} from '@/lib/sec-edgar';
import { htmlToText, findSections, DISCLOSURE_KIND_IDS } from '@/lib/disclosures/sections';
import { extractSection } from '@/lib/disclosures/extract';
import { synthesizeWithFallback, HAIKU_MODEL } from '@/lib/sonar/llm-providers';
import { disclosureTickers, latestPeriodic } from '@/lib/disclosures/filings';

/**
 * GET /api/cron/ingest-disclosures[?tickers=NVDA,AMD]
 *
 * Deep research (Nov 2026): reads the latest 10-Q and 10-K of the companies
 * Ezana's industry registry and their tracked customers cover (plus
 * SONAR_DISCLOSURE_TICKERS), finds the passages on customer concentration,
 * export controls and purchase obligations, and stores each disclosure as a
 * verbatim quote with its figures in company_disclosures.
 *
 * A quote is stored only if it appears in the filing word for word and every
 * figure appears in the quote (lib/disclosures/sections.js), so stored rows
 * are approved on arrival; anything else is dropped and counted. Each filing
 * is processed once per kind (company_disclosure_ingest.kinds; a filing read
 * before a kind was added is read again for the new kinds only, and a row
 * with no kinds recorded counts as the original three). Bounded: 240 s, and at most
 * MAX_FILINGS filings a run. SEC rules: User-Agent and the shared throttle in
 * sec-edgar.js.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const RUN_BUDGET_MS = 240_000;
const MAX_FILINGS = 8;
/* The kinds every filing read before Nov 2026 (no kinds recorded) was read for. */
const ORIGINAL_KINDS = ['customer_concentration', 'export_risk', 'purchase_obligations'];
async function run(request) {
  const started = Date.now();
  const left = () => RUN_BUDGET_MS - (Date.now() - started);
  const { searchParams } = new URL(request.url);
  const only = (searchParams.get('tickers') || '')
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  const admin = getAdminClient();
  const errors = [];
  const stats = { tickers: 0, filings: 0, sections: 0, kept: 0, dropped: 0 };

  let map;
  try {
    map = await getTickerMap();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `ticker map: ${e?.message || e}` },
      { status: 502 },
    );
  }
  const cikOf = new Map();
  for (const k of Object.keys(map || {})) {
    const row = map[k];
    if (row?.ticker && row?.cik_str != null && !cikOf.has(row.ticker))
      cikOf.set(String(row.ticker).toUpperCase(), String(row.cik_str));
  }

  /* Rotate the starting ticker by day so every company is reached in turn. */
  let tickers = only.length ? only : disclosureTickers();
  const day = Math.floor(Date.now() / 864e5);
  if (!only.length && tickers.length) {
    const s = day % tickers.length;
    tickers = [...tickers.slice(s), ...tickers.slice(0, s)];
  }
  const since = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);

  for (const ticker of tickers) {
    if (left() < 30_000 || stats.filings >= MAX_FILINGS) break;
    const cik = cikOf.get(ticker);
    if (!cik) continue;
    stats.tickers += 1;
    let filings = [];
    try {
      // eslint-disable-next-line no-await-in-loop
      filings = latestPeriodic(await getSubmissions(cik), { since });
    } catch (e) {
      errors.push(`${ticker} submissions: ${e?.message || e}`);
      continue;
    }
    if (!filings.length) continue;
    // eslint-disable-next-line no-await-in-loop
    const { data: done } = await admin
      .from('company_disclosure_ingest')
      .select('accession_no, kinds')
      .in(
        'accession_no',
        filings.map((f) => f.accessionNo),
      );
    const doneKinds = new Map(
      (done || []).map((d) => [d.accession_no, d.kinds?.length ? d.kinds : ORIGINAL_KINDS]),
    );
    for (const f of filings) {
      const had = doneKinds.get(f.accessionNo) || [];
      const todo = DISCLOSURE_KIND_IDS.filter((k) => !had.includes(k));
      if (!todo.length || left() < 30_000 || stats.filings >= MAX_FILINGS) continue;
      stats.filings += 1;
      const { primaryDocUrl } = edgarUrls({
        accessionNo: f.accessionNo,
        cik,
        primaryDoc: f.primaryDoc,
      });
      let sections = [];
      try {
        // eslint-disable-next-line no-await-in-loop
        sections = findSections(htmlToText(await secFetchText(primaryDocUrl)), { kinds: todo });
      } catch (e) {
        errors.push(`${ticker} ${f.accessionNo}: ${e?.message || e}`);
        continue;
      }
      stats.sections += sections.length;
      const rows = [];
      let dropped = 0;
      for (const sec of sections) {
        if (left() < 20_000) break;
        // eslint-disable-next-line no-await-in-loop
        const out = await extractSection(sec, {
          synthesize: synthesizeWithFallback,
          model: process.env.SONAR_DISCLOSURE_MODEL || HAIKU_MODEL,
          deadlineAt: Date.now() + 15_000,
        });
        dropped += out.dropped.length;
        for (const k of out.kept) {
          rows.push({
            ticker,
            cik,
            accession_no: f.accessionNo,
            form_type: f.form,
            filed_at: f.filedAt,
            period_end: f.periodEnd,
            kind: k.kind,
            quote: k.quote,
            party: k.party,
            period_label: k.period,
            figures: k.figures,
            source_url: primaryDocUrl,
            as_of: f.filedAt,
            review_status: 'approved',
            extractor: 'verbatim-quote-v1',
          });
        }
      }
      stats.kept += rows.length;
      stats.dropped += dropped;
      if (rows.length) {
        // eslint-disable-next-line no-await-in-loop
        const { error } = await admin
          .from('company_disclosures')
          .upsert(rows, { onConflict: 'accession_no,kind,quote_hash', ignoreDuplicates: true });
        if (error) {
          errors.push(`${ticker} ${f.accessionNo} write: ${error.message}`);
          continue;
        }
      }
      // eslint-disable-next-line no-await-in-loop
      await admin.from('company_disclosure_ingest').upsert({
        accession_no: f.accessionNo,
        ticker,
        form_type: f.form,
        sections: sections.length,
        kept: rows.length,
        kinds: [...new Set([...had, ...todo])],
        dropped,
        processed_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    ...stats,
    sec_requests: secRequestCount(),
    errors: errors.slice(0, 20),
  });
}

export const GET = cronRoute('ingest-disclosures', run, { ttlSeconds: 360 });
