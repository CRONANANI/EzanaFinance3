import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import {
  secFetchJson,
  secFetchText,
  getSubmissions,
  edgarUrls,
  secRequestCount,
} from '@/lib/sec-edgar';
import { ETF_UNIVERSE } from '@/lib/etf/universe';
import {
  parseNportXml,
  parseBrowseAtom,
  buildMfIndex,
  nportSeriesIdFromHead,
} from '@/lib/sec/nport';

/**
 * ETF holdings from Form N-PORT into sec_etf_funds / sec_etf_holdings.
 *
 *   1. Resolve ETF_UNIVERSE through company_tickers_mf.json (ticker -> trust
 *      CIK, series id, class id). A ticker with no series there (commodity and
 *      spot-crypto grantor trusts, unit investment trusts) cannot be stored:
 *      series_id is the key and must be an S######### id. The page lists those
 *      as "Not covered" straight from the universe.
 *   2. For every pending or ok fund, find its latest NPORT-P (one request):
 *      browse-edgar Atom with the series id as the CIK, else the trust's
 *      submissions, opened newest first until one carries this series id.
 *   3. Parse at most 4 new filings per run (large XML), replace holdings for
 *      that report date in chunks of 1,000 with tickers from sec_cusip_map,
 *      keep the two most recent report dates per fund, then fill tickers
 *      mapped since with apply_cusip_tickers_etf(). New CUSIPs reach the
 *      OpenFIGI queue through /api/cron/map-cusips.
 *
 * Auth: CRON_SECRET bearer (or ?key=).   GET /api/cron/ingest-etf-holdings[?parse=4]
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const RUN_BUDGET_MS = 230_000;
const CHUNK = 1000;
const IN_CHUNK = 300;
const SUBMISSION_PROBES = 12;

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

const primaryDocUrl = (cik, accessionNo) =>
  `${edgarUrls({ accessionNo, cik }).base}/primary_doc.xml`;

/** Latest NPORT-P for a series: { accessionNo, cik, filedAt, method } or null. */
async function latestNport(fund, methods) {
  try {
    const atom = await secFetchText(
      `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${fund.series_id}&type=NPORT-P&dateb=&owner=include&count=10&output=atom`,
    );
    const entries = parseBrowseAtom(atom);
    if (entries.length) {
      methods.atom += 1;
      return { ...entries[0], cik: entries[0].cik || fund.filer_cik, method: 'atom' };
    }
  } catch {
    /* fall through to the trust's submissions */
  }
  if (!fund.filer_cik) return null;
  const sub = await getSubmissions(fund.filer_cik);
  const r = sub?.filings?.recent || {};
  let probes = 0;
  for (let i = 0; i < (r.form || []).length && probes < SUBMISSION_PROBES; i += 1) {
    if (r.form[i] !== 'NPORT-P') continue;
    probes += 1;
    // eslint-disable-next-line no-await-in-loop
    const xml = await secFetchText(primaryDocUrl(fund.filer_cik, r.accessionNumber[i]));
    if (nportSeriesIdFromHead(xml) === fund.series_id) {
      methods.submissions += 1;
      return {
        accessionNo: r.accessionNumber[i],
        cik: fund.filer_cik,
        filedAt: r.filingDate?.[i] || null,
        method: 'submissions',
        xml,
      };
    }
  }
  return null;
}

async function tickersFor(admin, cusips) {
  const out = new Map();
  const list = [...new Set(cusips.filter(Boolean))];
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

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const started = Date.now();
  const outOfTime = () => Date.now() - started > RUN_BUDGET_MS;
  const { searchParams } = new URL(request.url);
  const maxParse = Math.min(Math.max(Number(searchParams.get('parse')) || 4, 1), 8);

  const admin = getAdminClient();
  const errors = [];
  const methods = { atom: 0, submissions: 0 };

  // ── 1. Resolve the universe ─────────────────────────────────────────────
  const { data: existing, error: fErr } = await admin.from('sec_etf_funds').select('*');
  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  const known = new Set((existing || []).map((f) => f.ticker));
  const unresolved = [];
  const missing = ETF_UNIVERSE.filter((t) => !known.has(t));
  if (missing.length) {
    try {
      const mf = buildMfIndex(
        await secFetchJson('https://www.sec.gov/files/company_tickers_mf.json'),
      );
      const rows = [];
      for (const t of missing) {
        const hit = mf.get(t);
        if (!hit?.seriesId || !/^S\d{9}$/.test(hit.seriesId)) {
          unresolved.push(t);
          continue;
        }
        rows.push({
          series_id: hit.seriesId,
          ticker: t,
          class_id: hit.classId,
          filer_cik: hit.cik,
          status: 'pending',
        });
      }
      // Two tickers can share a series (share classes); keep the first.
      const seen = new Set((existing || []).map((f) => f.series_id));
      const fresh = rows.filter((r) => !seen.has(r.series_id) && seen.add(r.series_id));
      if (fresh.length) {
        const { error } = await admin
          .from('sec_etf_funds')
          .upsert(fresh, { onConflict: 'series_id' });
        if (error) errors.push(`resolve: ${error.message}`);
      }
    } catch (e) {
      errors.push(`resolve: ${e?.message || e}`);
    }
  }

  const { data: funds } = await admin
    .from('sec_etf_funds')
    .select('*')
    .in('status', ['pending', 'ok', 'error'])
    .order('synced_at', { ascending: true });

  // ── 2. Find each fund's latest filing ───────────────────────────────────
  const toParse = [];
  for (const f of funds || []) {
    if (outOfTime()) break;
    try {
      // eslint-disable-next-line no-await-in-loop
      const latest = await latestNport(f, methods);
      if (!latest) {
        // eslint-disable-next-line no-await-in-loop
        await admin
          .from('sec_etf_funds')
          .update({
            status: 'no_nport',
            status_detail: 'No NPORT-P filing found for this series',
            synced_at: new Date().toISOString(),
          })
          .eq('series_id', f.series_id);
        continue;
      }
      if (latest.accessionNo !== f.latest_accession || f.status !== 'ok')
        toParse.push({ fund: f, latest });
    } catch (e) {
      errors.push(`${f.ticker} lookup: ${e?.message || e}`);
    }
  }

  // ── 3. Parse new filings ────────────────────────────────────────────────
  let parsedFilings = 0;
  let holdingsRows = 0;
  for (const { fund, latest } of toParse.slice(0, maxParse)) {
    if (outOfTime()) break;
    try {
      // eslint-disable-next-line no-await-in-loop
      const xml = latest.xml || (await secFetchText(primaryDocUrl(latest.cik, latest.accessionNo)));
      const doc = parseNportXml(xml);
      const now = new Date().toISOString();
      if (!doc || doc.seriesId !== fund.series_id) {
        // eslint-disable-next-line no-await-in-loop
        await admin
          .from('sec_etf_funds')
          .update({
            status: 'error',
            status_detail: 'Filing did not match this series',
            synced_at: now,
          })
          .eq('series_id', fund.series_id);
        continue;
      }
      if (!doc.hasHoldings || !doc.reportDate) {
        // eslint-disable-next-line no-await-in-loop
        await admin
          .from('sec_etf_funds')
          .update({
            status: 'error',
            status_detail: 'Schedule of investments not public in the latest filing',
            latest_accession: latest.accessionNo,
            synced_at: now,
          })
          .eq('series_id', fund.series_id);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const known2 = await tickersFor(
        admin,
        doc.holdings.map((h) => h.cusip),
      );
      // eslint-disable-next-line no-await-in-loop
      await admin
        .from('sec_etf_holdings')
        .delete()
        .eq('series_id', fund.series_id)
        .eq('report_date', doc.reportDate);
      let failed = false;
      for (let i = 0; i < doc.holdings.length; i += CHUNK) {
        const rows = doc.holdings.slice(i, i + CHUNK).map((h) => ({
          series_id: fund.series_id,
          report_date: doc.reportDate,
          line_no: h.lineNo,
          accession_no: latest.accessionNo,
          name: h.name,
          title: h.title,
          cusip: h.cusip,
          isin: h.isin,
          ticker: (h.cusip && known2.get(h.cusip)) || null,
          lei: h.lei,
          balance: h.balance,
          units: h.units,
          value_usd: h.valueUsd,
          pct_value: h.pctValue,
          asset_category: h.assetCategory,
          issuer_category: h.issuerCategory,
          country: h.country,
        }));
        // eslint-disable-next-line no-await-in-loop
        const { error } = await admin.from('sec_etf_holdings').insert(rows);
        if (error) {
          errors.push(`${fund.ticker} holdings: ${error.message}`);
          failed = true;
          break;
        }
      }
      if (failed) {
        // eslint-disable-next-line no-await-in-loop
        await admin
          .from('sec_etf_holdings')
          .delete()
          .eq('series_id', fund.series_id)
          .eq('report_date', doc.reportDate);
        continue;
      }
      // Keep the two most recent report dates: this one and the fund's previous.
      const keep = [doc.reportDate, fund.report_date].filter(Boolean);
      // eslint-disable-next-line no-await-in-loop
      await admin
        .from('sec_etf_holdings')
        .delete()
        .eq('series_id', fund.series_id)
        .not('report_date', 'in', `(${[...new Set(keep)].join(',')})`);
      // eslint-disable-next-line no-await-in-loop
      await admin
        .from('sec_etf_funds')
        .update({
          status: 'ok',
          status_detail: null,
          fund_name: doc.seriesName || fund.fund_name,
          latest_accession: latest.accessionNo,
          report_date: doc.reportDate,
          net_assets: doc.netAssets,
          holdings_count: doc.holdings.length,
          synced_at: now,
        })
        .eq('series_id', fund.series_id);
      parsedFilings += 1;
      holdingsRows += doc.holdings.length;
    } catch (e) {
      errors.push(`${fund.ticker} parse: ${e?.message || e}`);
    }
  }

  const { data: applied, error: aErr } = await admin.rpc('apply_cusip_tickers_etf');
  if (aErr) errors.push(`apply_cusip_tickers_etf: ${aErr.message}`);

  const { data: statusRows } = await admin.from('sec_etf_funds').select('status');
  const byStatus = (statusRows || []).reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }),
    {},
  );

  if (holdingsRows || Number(applied) > 0) revalidateTag('titans');

  return NextResponse.json({
    ok: errors.length === 0,
    funds_by_status: byStatus,
    unresolved_tickers: unresolved,
    lookup_method: methods,
    pending_parse: Math.max(0, toParse.length - parsedFilings),
    parsed_filings: parsedFilings,
    holdings_rows: holdingsRows,
    tickers_applied: applied ?? null,
    sec_requests: secRequestCount(),
    errors: errors.slice(0, 20),
  });
}
