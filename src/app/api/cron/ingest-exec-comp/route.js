import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import {
  getTickerMap,
  getSubmissions,
  secFetchText,
  edgarUrls,
  secRequestCount,
} from '@/lib/sec-edgar';
import { getCompanyFacts, pvpFromCompanyFacts, pvpFromInlineXbrl, ixDei } from '@/lib/sec/xbrl';

/**
 * Pay versus performance (Item 402(v)) into sec_exec_comp, one row per company,
 * fiscal year and PEO.
 *
 * Path per company:
 *   C2a companyfacts: when the SEC's companyfacts JSON carries the `ecd`
 *       taxonomy, read the PvP facts from it (one request).
 *   C2b proxy inline XBRL: otherwise find the latest DEF 14A in the company's
 *       submissions and read the `ecd:` facts from its inline XBRL (two
 *       requests). After three companies in a row without `ecd` in
 *       companyfacts, the run goes straight to C2b.
 *
 * Universe: tickers most widely held among large 13F positions, tickers in
 * congressional trades over the last two years, and tickers on any user
 * watchlist, resolved to CIKs through company_tickers.json. Never-synced
 * companies first (rotating daily so none is starved), then the stalest.
 * Bounded by time; proxies are annual, so a monthly revisit is plenty.
 * Auth: CRON_SECRET bearer (or ?key=).   GET /api/cron/ingest-exec-comp[?max=60]
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const RUN_BUDGET_MS = 230_000;
const REVISIT_DAYS = 30;

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

async function pageAll(build, cap = 50) {
  const out = [];
  for (let page = 0; page < cap; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await build().range(page * 1000, page * 1000 + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Ticker universe (upper-case symbols). */
async function universe(admin) {
  const set = new Set();
  // Most widely held among large 13F positions (filers per ticker, top 500).
  const big = await pageAll(
    () =>
      admin
        .from('sec_13f_holdings')
        .select('ticker, accession_no')
        .not('ticker', 'is', null)
        .gte('value_usd', 50_000_000)
        .order('id'),
    40,
  );
  const holders = new Map();
  for (const r of big) {
    if (!holders.has(r.ticker)) holders.set(r.ticker, new Set());
    holders.get(r.ticker).add(r.accession_no);
  }
  [...holders.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 500)
    .forEach(([t]) => set.add(t));

  const since = new Date(Date.now() - 730 * 86400000).toISOString().slice(0, 10);
  const congress = await pageAll(
    () =>
      admin
        .from('congress_trades')
        .select('ticker')
        .not('ticker', 'is', null)
        .gte('transaction_date', since)
        .order('id'),
    40,
  );
  congress.forEach((r) => set.add(String(r.ticker).toUpperCase()));

  const watch = await pageAll(
    () => admin.from('user_watchlist_items').select('ticker').not('ticker', 'is', null).order('id'),
    10,
  );
  watch.forEach((r) => set.add(String(r.ticker).toUpperCase()));
  return set;
}

async function latestDef14a(cik) {
  const sub = await getSubmissions(cik);
  const r = sub?.filings?.recent || {};
  const forms = r.form || [];
  for (let i = 0; i < forms.length; i += 1) {
    if (forms[i] === 'DEF 14A') {
      return {
        accessionNo: r.accessionNumber[i],
        filedAt: r.filingDate?.[i] || null,
        primaryDoc: r.primaryDocument?.[i] || null,
        entityName: sub.name || null,
      };
    }
  }
  return null;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const started = Date.now();
  const outOfTime = () => Date.now() - started > RUN_BUDGET_MS;
  const { searchParams } = new URL(request.url);
  const max = Math.min(Math.max(Number(searchParams.get('max')) || 60, 1), 200);

  const admin = getAdminClient();
  const errors = [];
  const paths = { companyfacts: 0, inline_xbrl: 0, none: 0 };

  let tickerMap;
  let symbols;
  try {
    [tickerMap, symbols] = await Promise.all([getTickerMap(), universe(admin)]);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }

  // ticker -> { cik, ticker, title }
  const byTicker = new Map();
  for (const row of Object.values(tickerMap || {})) {
    if (row?.ticker && row?.cik_str != null) {
      byTicker.set(String(row.ticker).toUpperCase(), {
        cik: String(row.cik_str),
        ticker: row.ticker,
        title: row.title,
      });
    }
  }
  const companies = new Map();
  for (const t of symbols) {
    const c = byTicker.get(t);
    if (c && !companies.has(c.cik)) companies.set(c.cik, c);
  }

  const synced = await pageAll(
    () => admin.from('sec_exec_comp').select('cik, synced_at').order('cik'),
    20,
  );
  const last = new Map();
  for (const r of synced)
    if (!last.has(r.cik) || r.synced_at > last.get(r.cik)) last.set(r.cik, r.synced_at);

  const cutoff = new Date(Date.now() - REVISIT_DAYS * 86400000).toISOString();
  const never = [...companies.values()]
    .filter((c) => !last.has(c.cik))
    .sort((a, b) => a.cik.localeCompare(b.cik));
  const day = Math.floor(Date.now() / 86400000);
  const offset = never.length ? (day * max) % never.length : 0;
  const stale = [...companies.values()]
    .filter((c) => last.has(c.cik) && last.get(c.cik) < cutoff)
    .sort((a, b) => String(last.get(a.cik)).localeCompare(String(last.get(b.cik))));
  const queue = [...never.slice(offset), ...never.slice(0, offset), ...stale].slice(0, max);

  let companiesWritten = 0;
  let rowsWritten = 0;
  let missesInARow = 0;
  for (const c of queue) {
    if (outOfTime()) break;
    try {
      let rows = [];
      let entityName = c.title || null;
      let filedAt = null;
      if (missesInARow < 3) {
        // eslint-disable-next-line no-await-in-loop
        const facts = await getCompanyFacts(c.cik);
        rows = pvpFromCompanyFacts(facts);
        entityName = facts?.entityName || entityName;
        if (rows.length) {
          paths.companyfacts += 1;
          missesInARow = 0;
        } else missesInARow += 1;
      }
      if (!rows.length) {
        // eslint-disable-next-line no-await-in-loop
        const proxy = await latestDef14a(c.cik);
        if (proxy?.primaryDoc) {
          const { primaryDocUrl } = edgarUrls({
            accessionNo: proxy.accessionNo,
            cik: c.cik,
            primaryDoc: proxy.primaryDoc,
          });
          // eslint-disable-next-line no-await-in-loop
          const html = await secFetchText(primaryDocUrl);
          rows = pvpFromInlineXbrl(html, { accessionNo: proxy.accessionNo });
          entityName = ixDei(html).entityName || proxy.entityName || entityName;
          filedAt = proxy.filedAt;
          if (rows.length) paths.inline_xbrl += 1;
        }
      }
      if (!rows.length) {
        paths.none += 1;
        continue;
      }
      const out = rows.map((r) => ({
        ...r,
        cik: c.cik,
        ticker: c.ticker,
        entity_name: entityName,
        filed_at: filedAt,
        synced_at: new Date().toISOString(),
      }));
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin
        .from('sec_exec_comp')
        .upsert(out, { onConflict: 'cik,fiscal_year,peo_key' });
      if (error) errors.push(`${c.ticker}: ${error.message}`);
      else {
        companiesWritten += 1;
        rowsWritten += out.length;
      }
    } catch (e) {
      errors.push(`${c.ticker}: ${e?.message || e}`);
    }
  }

  if (rowsWritten) {
    revalidateTag('titans');
    revalidateTag('hubs');
  }

  return NextResponse.json({
    ok: errors.length === 0,
    universe: companies.size,
    queued: queue.length,
    companies: companiesWritten,
    rows: rowsWritten,
    paths,
    sec_requests: secRequestCount(),
    errors: errors.slice(0, 20),
  });
}
