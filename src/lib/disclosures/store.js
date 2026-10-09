/**
 * Read layer for the financial-disclosure pages, both chambers.
 *
 * One module serves House and Senate because the two schemas were built to
 * match: the only difference is that a senator has a state where a
 * representative has a state and a district. A chamber therefore resolves to
 * a set of table names and one field, and every query below is written once.
 *
 * Service-role reads on the server; only the crons write. Every function
 * returns an empty result rather than throwing, so a page renders its honest
 * empty or pending state instead of an error boundary.
 *
 * Amounts are brackets. amount_midpoint is read ONLY to order by size, is
 * never returned as a figure, and any response that used it says so.
 */
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

const CHAMBERS = {
  house: {
    filings: 'house_disclosure_filings',
    trades: 'house_trades',
    coverage: 'house_disclosure_coverage',
    where: 'state_dst',
  },
  senate: {
    filings: 'senate_disclosure_filings',
    trades: 'senate_trades',
    coverage: 'senate_disclosure_coverage',
    where: 'state',
  },
};

export function chamberTables(chamber) {
  return CHAMBERS[String(chamber || '').toLowerCase()] || null;
}

/* Server-side reads go through the service-role client: the dataset tables
   are not readable with the public (anon) key, so they can only be reached
   through this app's rate-limited routes and pages. */
function client() {
  if (!isServerSupabaseConfigured()) return null;
  return getAdminClient();
}

const MAX_PAGE = 200;
export function clampLimit(v, fallback = 50) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), MAX_PAGE);
}

/** 'P' | 'S' | 'E' from the UI's buy/sell/exchange, or null for all. */
export function txCode(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'buy' || t === 'p') return 'P';
  if (t === 'sell' || t === 's') return 'S';
  if (t === 'exchange' || t === 'exch' || t === 'e') return 'E';
  return null;
}

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function memberSlugOf(row) {
  return slugify(`${row?.first_name || ''} ${row?.last_name || ''}`);
}

/** Whole days from transaction to filing, or null when either date is absent. */
function lagDays(traded, filed) {
  if (!traded || !filed) return null;
  const a = new Date(traded);
  const b = new Date(filed);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/**
 * The source document for a trade row. Built here, where the chamber is
 * known, rather than in the shared page component, and from the same path the
 * ingest itself stores on the filing. The Senate serves an eFD page rather
 * than a PDF, so it gets null until that ingest exists rather than a House
 * URL with a Senate id in it.
 */
function sourceUrl(chamber, r) {
  if (chamber !== 'house' || !r.doc_id || !r.tx_date) return null;
  const year = String(r.tx_date).slice(0, 4);
  return `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year}/${r.doc_id}.pdf`;
}

/** The shape the page renders. Note there is no midpoint in it. */
function toTrade(r, t, chamber) {
  return {
    id: r.id,
    docId: r.doc_id,
    member: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.last_name || null,
    slug: memberSlugOf(r),
    where: r[t.where] || null,
    ticker: r.ticker || null,
    asset: r.asset_name || null,
    type: r.tx_type || null,
    traded: r.tx_date || null,
    filed: r.notification_date || null,
    lag: lagDays(r.tx_date, r.notification_date),
    bracket: r.amount_bracket_label || null,
    url: sourceUrl(chamber, r),
  };
}

export async function getSummary(chamber, { year } = {}) {
  const t = chamberTables(chamber);
  const db = client();
  const empty = { filings: 0, years: 0, ptrs: 0, trades: 0, mostRecent: null, ptrsPending: 0 };
  if (!t || !db) return empty;
  try {
    const [filingsRes, tradesRes, recent, yearsRes, ptrsRes, pendingRes] = await Promise.all([
      db.from(t.filings).select('*', { count: 'exact', head: true }),
      db.from(t.trades).select('*', { count: 'exact', head: true }),
      /* Most recent NON-NULL filing date. Withdrawals and rejected source
         dates are stored null, so ordering without this filter reports
         nothing useful. */
      db
        .from(t.filings)
        .select('filing_date')
        .not('filing_date', 'is', null)
        .order('filing_date', { ascending: false })
        .limit(1),
      db.from(t.filings).select('filing_year'),
      year
        ? db
            .from(t.filings)
            .select('*', { count: 'exact', head: true })
            .eq('is_ptr', true)
            .eq('filing_year', Number(year))
        : db.from(t.filings).select('*', { count: 'exact', head: true }).eq('is_ptr', true),
      /* PTRs whose trades have not been extracted yet. This is the number the
         pending state shows, so it has to be real. */
      db
        .from(t.filings)
        .select('*', { count: 'exact', head: true })
        .eq('is_ptr', true)
        .eq('trades_parsed', false),
    ]);
    const years = new Set((yearsRes.data || []).map((r) => r.filing_year).filter(Boolean));
    return {
      filings: filingsRes.count || 0,
      years: years.size,
      ptrs: ptrsRes.count || 0,
      trades: tradesRes.count || 0,
      mostRecent: recent.data?.[0]?.filing_date || null,
      ptrsPending: pendingRes.count || 0,
    };
  } catch {
    return empty;
  }
}

export async function getTrades(chamber, opts = {}) {
  const t = chamberTables(chamber);
  const db = client();
  const { year, type, bracket, lag, member, ticker, sort = 'filed', page = 1 } = opts;
  const byAmount = sort === 'amount';
  if (!t || !db) return { rows: [], total: 0, amountEstimated: byAmount };
  const limit = clampLimit(opts.limit);
  const from = (Math.max(1, Number(page) || 1) - 1) * limit;
  try {
    let q = db.from(t.trades).select('*', { count: 'exact' });
    const code = txCode(type);
    if (code) q = q.eq('tx_type', code);
    if (bracket) q = q.eq('amount_bracket_label', bracket);
    if (ticker) q = q.eq('ticker', String(ticker).toUpperCase());
    if (member) q = q.ilike('last_name', `%${member}%`);
    if (year) {
      q = q.gte('tx_date', `${Number(year)}-01-01`).lte('tx_date', `${Number(year)}-12-31`);
    }
    /* Sorting by size uses the midpoint, which is why the response flags it.
       The midpoint itself never leaves this module. */
    if (byAmount) q = q.order('amount_midpoint', { ascending: false, nullsFirst: false });
    else if (sort === 'traded') q = q.order('tx_date', { ascending: false, nullsFirst: false });
    else q = q.order('notification_date', { ascending: false, nullsFirst: false });

    const { data, count } = await q.range(from, from + limit - 1);
    let rows = (data || []).map((r) => toTrade(r, t, chamber));
    /* Lag is derived, so it cannot be filtered in the query. Filtering here
       means the total is the pre-filter count; both are returned so the page
       never claims a page count it did not produce. */
    if (lag === 'le45') rows = rows.filter((r) => r.lag != null && r.lag <= 45);
    else if (lag === 'gt45') rows = rows.filter((r) => r.lag != null && r.lag > 45);
    return { rows, total: count || 0, amountEstimated: byAmount };
  } catch {
    return { rows: [], total: 0, amountEstimated: byAmount };
  }
}

export async function getFilings(chamber, opts = {}) {
  const t = chamberTables(chamber);
  const db = client();
  if (!t || !db) return { rows: [], total: 0 };
  const { year, type, member, page = 1 } = opts;
  const limit = clampLimit(opts.limit);
  const from = (Math.max(1, Number(page) || 1) - 1) * limit;
  try {
    let q = db.from(t.filings).select('*', { count: 'exact' });
    if (year) q = q.eq('filing_year', Number(year));
    if (type) q = q.eq('filing_type', String(type).toUpperCase());
    if (member) q = q.ilike('last_name', `%${member}%`);
    const { data, count } = await q
      .order('filing_date', { ascending: false, nullsFirst: false })
      .range(from, from + limit - 1);
    return {
      rows: (data || []).map((r) => ({
        docId: r.doc_id,
        member: [r.first_name, r.last_name].filter(Boolean).join(' '),
        slug: memberSlugOf(r),
        where: r[t.where] || null,
        type: r.filing_type,
        typeLabel: r.filing_type_label || r.filing_type,
        year: r.filing_year,
        coveredYear: r.covered_year ?? null,
        /* Null is the answer for a withdrawal and for a source date that
           failed the plausibility check. The page prints "no date". */
        filed: r.filing_date || null,
        isPtr: Boolean(r.is_ptr),
        pending: Boolean(r.is_ptr) && !r.trades_parsed,
        url: r.pdf_url || r.report_url || null,
      })),
      total: count || 0,
    };
  } catch {
    return { rows: [], total: 0 };
  }
}

export async function getMember(chamber, slug) {
  const t = chamberTables(chamber);
  const db = client();
  if (!t || !db || !slug) return null;
  try {
    const { data: filings } = await db.from(t.filings).select('*').limit(1000);
    const mine = (filings || []).filter((r) => memberSlugOf(r) === slug);
    if (!mine.length) return null;
    const first = mine[0];
    const { data: trades } = await db
      .from(t.trades)
      .select('*')
      .in('doc_id', mine.map((r) => r.doc_id).slice(0, 200));
    const tr = (trades || []).map((r) => toTrade(r, t, chamber));
    const counts = new Map();
    for (const x of tr) if (x.ticker) counts.set(x.ticker, (counts.get(x.ticker) || 0) + 1);
    const lags = tr
      .map((x) => x.lag)
      .filter((n) => n != null)
      .sort((a, b) => a - b);
    return {
      slug,
      name: [first.first_name, first.last_name].filter(Boolean).join(' '),
      where: first[t.where] || null,
      filings: mine.length,
      ptrs: mine.filter((r) => r.is_ptr).length,
      txns: tr.length,
      medianLag: lags.length ? lags[Math.floor(lags.length / 2)] : null,
      topTickers: [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([ticker, count]) => ({ ticker, count })),
      trades: tr,
      rows: mine.slice(0, 50).map((r) => ({
        id: r.doc_id,
        ticker: null,
        type: r.filing_type_label || r.filing_type,
        bracket: null,
        filed: r.filing_date || null,
        url: r.pdf_url || r.report_url || null,
        pending: Boolean(r.is_ptr) && !r.trades_parsed,
      })),
    };
  } catch {
    return null;
  }
}

export async function getTicker(chamber, symbol) {
  const t = chamberTables(chamber);
  const db = client();
  const sym = String(symbol || '').toUpperCase();
  if (!t || !db || !sym) return { symbol: sym, rows: [], total: 0 };
  try {
    const { data, count } = await db
      .from(t.trades)
      .select('*', { count: 'exact' })
      .eq('ticker', sym)
      .order('tx_date', { ascending: false, nullsFirst: false })
      .limit(100);
    return {
      symbol: sym,
      rows: (data || []).map((r) => toTrade(r, t, chamber)),
      total: count || 0,
    };
  } catch {
    return { symbol: sym, rows: [], total: 0 };
  }
}

export async function getCoverage(chamber) {
  const t = chamberTables(chamber);
  const db = client();
  if (!t || !db) return { rows: [] };
  try {
    const { data } = await db.from(t.coverage).select('*').order('year', { ascending: false });
    return {
      rows: (data || []).map((r) => ({
        year: r.year,
        filings: r.filings,
        ptrs: r.ptrs,
        ptrsLegacy: r.ptrs_legacy ?? 0,
        badDates: r.bad_dates ?? 0,
        loadedAt: r.loaded_at || null,
      })),
    };
  } catch {
    return { rows: [] };
  }
}
