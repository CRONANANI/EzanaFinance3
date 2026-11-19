import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { getAdminClient } from '@/lib/supabase';

/**
 * GET /api/research/company/:symbol?part=financials|ownership|filings
 *
 * Supporting data for the US Equities selected-stock tabs (Nov 19th, 2026
 * redesign). Each part is fetched only when its tab opens. Everything here is
 * a reported or filed record; nothing is estimated except where a field says
 * so (ownership percent is derived from market cap / price).
 *
 *   financials  FMP annual income statement, balance sheet and cash flow
 *               (last five fiscal years).
 *   ownership   Form 13F holdings from Ezana's SEC tables (latest two
 *               quarters, long positions only), Schedule 13D/G stakes, and
 *               Form 4 insider transactions (Ezana table, else Finnhub).
 *   filings     SEC filings (Finnhub, last 12 months), scheduled earnings
 *               (Finnhub calendar, next 180 days) and reported earnings vs
 *               consensus (FMP).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FMP = 'https://financialmodelingprep.com/stable';
const FINNHUB = 'https://finnhub.io/api/v1';
const SYMBOL_RE = /^[A-Z0-9.\-]{1,12}$/;

const fmpKey = () => process.env.FMP_API_KEY || '';
const finnhubKey = () => process.env.FINNHUB_API_KEY || '';
const num = (v) => {
  const n = Number(v);
  return v == null || v === '' || !Number.isFinite(n) ? null : n;
};
const isoDay = (d) => (d ? String(d).slice(0, 10) : null);

async function getJson(url, ms = 8000) {
  try {
    const res = await fetchWithTimeout(url, { cache: 'no-store' }, ms);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ── financials ─────────────────────────────────────────────────────── */

const INCOME = [
  ['revenue', 'Revenue'],
  ['costOfRevenue', 'Cost of revenue'],
  ['grossProfit', 'Gross profit'],
  ['researchAndDevelopmentExpenses', 'R&D'],
  ['sellingGeneralAndAdministrativeExpenses', 'SG&A'],
  ['operatingExpenses', 'Operating expenses'],
  ['operatingIncome', 'Operating income'],
  ['ebitda', 'EBITDA'],
  ['interestExpense', 'Interest expense'],
  ['incomeBeforeTax', 'Pre-tax income'],
  ['incomeTaxExpense', 'Income tax'],
  ['netIncome', 'Net income'],
  ['epsDiluted', 'EPS (diluted)'],
  ['weightedAverageShsOutDil', 'Diluted shares'],
];
const BALANCE = [
  ['cashAndCashEquivalents', 'Cash and equivalents'],
  ['shortTermInvestments', 'Short-term investments'],
  ['netReceivables', 'Receivables'],
  ['inventory', 'Inventory'],
  ['totalCurrentAssets', 'Total current assets'],
  ['propertyPlantEquipmentNet', 'PP&E (net)'],
  ['totalAssets', 'Total assets'],
  ['accountPayables', 'Accounts payable'],
  ['totalCurrentLiabilities', 'Total current liabilities'],
  ['shortTermDebt', 'Short-term debt'],
  ['longTermDebt', 'Long-term debt'],
  ['totalDebt', 'Total debt'],
  ['totalLiabilities', 'Total liabilities'],
  ['totalStockholdersEquity', 'Shareholders’ equity'],
  ['netDebt', 'Net debt'],
];
const CASHFLOW = [
  ['netIncome', 'Net income'],
  ['depreciationAndAmortization', 'D&A'],
  ['stockBasedCompensation', 'Stock-based compensation'],
  ['changeInWorkingCapital', 'Change in working capital'],
  ['operatingCashFlow', 'Operating cash flow'],
  ['capitalExpenditure', 'Capital expenditure'],
  ['freeCashFlow', 'Free cash flow'],
  ['commonDividendsPaid', 'Dividends paid'],
  ['commonStockRepurchased', 'Share repurchases'],
  ['netDebtIssuance', 'Net debt issuance'],
];

function shapeStatement(raw, layout) {
  const rows = (Array.isArray(raw) ? raw : []).slice(0, 5).reverse();
  return {
    periods: rows.map((r) => ({
      label: `FY${r.fiscalYear || r.calendarYear || String(r.date || '').slice(0, 4)}`,
      date: isoDay(r.date),
      filed: isoDay(r.filingDate || r.fillingDate),
      currency: r.reportedCurrency || 'USD',
    })),
    lines: layout
      .map(([key, label]) => ({ key, label, values: rows.map((r) => num(r[key])) }))
      .filter((l) => l.values.some((v) => v != null)),
  };
}

async function financials(sym) {
  const key = fmpKey();
  if (!key) return { error: 'Financial statements are not configured.', status: 503 };
  const q = (path) =>
    `${FMP}/${path}?symbol=${encodeURIComponent(sym)}&period=annual&limit=5&apikey=${encodeURIComponent(key)}`;
  const [inc, bal, cf] = await Promise.all([
    getJson(q('income-statement')),
    getJson(q('balance-sheet-statement')),
    getJson(q('cash-flow-statement')),
  ]);
  if (!Array.isArray(inc) || !inc.length) {
    return { error: 'No reported statements were returned for this ticker.', status: 404 };
  }
  return {
    symbol: sym,
    source: 'Company filings via Financial Modeling Prep (annual, as reported)',
    income: shapeStatement(inc, INCOME),
    balance: shapeStatement(bal, BALANCE),
    cashflow: shapeStatement(cf, CASHFLOW),
  };
}

/* ── ownership ──────────────────────────────────────────────────────── */

/* Long 13F rows for one ticker over the last ~9 months, newest quarter first,
   paged past the 1,000-row cap. Stops once three quarters have appeared
   (the third is only needed to know the second is complete). The view filters
   on upper(ticker); the index in docs/sql/research_13f_ticker_index.md makes
   this an index scan instead of a full scan. */
async function recentHoldings(admin, sym) {
  const since = new Date(Date.now() - 300 * 864e5).toISOString().slice(0, 10);
  const out = [];
  for (let from = 0; from < 12000; from += 1000) {
    const { data, error } = await admin
      .from('ezq_13f_holdings')
      .select('filer_cik, filer_name, value_usd, shares, filed_at, period_of_report')
      .eq('ticker', sym)
      .is('put_call', null)
      .gte('period_of_report', since)
      .order('period_of_report', { ascending: false })
      .order('filer_cik', { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
    if (new Set(out.map((r) => r.period_of_report)).size >= 3) break;
  }
  return out;
}

/* One row per filer (sub-accounts and share classes summed). */
function byFiler(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = r.filer_cik;
    const cur = m.get(k) || { cik: k, name: r.filer_name, value: 0, shares: 0, filedAt: null };
    cur.value += num(r.value_usd) || 0;
    cur.shares += num(r.shares) || 0;
    cur.filedAt = isoDay(r.filed_at) || cur.filedAt;
    m.set(k, cur);
  }
  return m;
}

async function ownership(sym) {
  const admin = getAdminClient();
  const rows = await recentHoldings(admin, sym);
  const periods = [...new Set(rows.map((r) => r.period_of_report))].sort().reverse();
  const latest = periods[0] || null;

  let institutional = null;
  if (latest) {
    const previous = periods[1] || null;
    const cur = rows.filter((r) => r.period_of_report === latest);
    const prev = previous ? rows.filter((r) => r.period_of_report === previous) : [];
    const curF = byFiler(cur);
    const prevF = byFiler(prev);
    const sum = (m, k) => [...m.values()].reduce((a, r) => a + r[k], 0);
    const holders = [...curF.values()].sort((a, b) => b.value - a.value);
    const top = holders.slice(0, 15).map((h) => {
      const p = prevF.get(h.cik);
      return {
        ...h,
        prevShares: p ? p.shares : null,
        changeShares: p ? h.shares - p.shares : null,
        isNew: previous ? !p : null,
      };
    });
    let added = 0;
    let reduced = 0;
    let opened = 0;
    let closed = 0;
    for (const h of curF.values()) {
      const p = prevF.get(h.cik);
      if (!p) opened += 1;
      else if (h.shares > p.shares) added += 1;
      else if (h.shares < p.shares) reduced += 1;
    }
    for (const k of prevF.keys()) if (!curF.has(k)) closed += 1;
    institutional = {
      period: latest,
      previousPeriod: previous,
      holders: curF.size,
      previousHolders: previous ? prevF.size : null,
      totalShares: sum(curF, 'shares'),
      totalValue: sum(curF, 'value'),
      previousShares: previous ? sum(prevF, 'shares') : null,
      changes: previous ? { opened, added, reduced, closed } : null,
      top,
    };
  }

  const { data: stakes } = await admin
    .from('ezq_activist_stakes')
    .select('filer_name, form_type, filed_at, event_date, percent_of_class, shares, is_amendment')
    .eq('ticker', sym)
    .order('filed_at', { ascending: false })
    .limit(10);

  let insiders = [];
  let insiderSource = null;
  const { data: ins } = await admin
    .from('sec_insider_transactions')
    .select(
      'reporter_name, reporter_title, transaction_date, transaction_code, acquired_disposed, shares, price, value_usd, shares_owned_after, filed_at',
    )
    .eq('issuer_ticker', sym)
    .order('filed_at', { ascending: false })
    .limit(25);
  if (ins?.length) {
    insiderSource = 'SEC Form 4 (Ezana SEC tables)';
    insiders = ins.map((r) => ({
      name: r.reporter_name,
      title: r.reporter_title || null,
      date: isoDay(r.transaction_date),
      code: r.transaction_code || null,
      direction:
        r.acquired_disposed === 'A' ? 'acquired' : r.acquired_disposed === 'D' ? 'disposed' : null,
      shares: num(r.shares),
      price: num(r.price),
      value: num(r.value_usd),
      ownedAfter: num(r.shares_owned_after),
      filedAt: isoDay(r.filed_at),
    }));
  } else if (finnhubKey()) {
    const j = await getJson(
      `${FINNHUB}/stock/insider-transactions?symbol=${encodeURIComponent(sym)}&token=${finnhubKey()}`,
    );
    const list = Array.isArray(j?.data) ? j.data : [];
    if (list.length) insiderSource = 'SEC Form 4 via Finnhub';
    insiders = list.slice(0, 25).map((r) => ({
      name: r.name,
      title: null,
      date: isoDay(r.transactionDate),
      code: r.transactionCode || null,
      direction: num(r.change) > 0 ? 'acquired' : num(r.change) < 0 ? 'disposed' : null,
      shares: num(r.change) != null ? Math.abs(num(r.change)) : null,
      price: num(r.transactionPrice),
      value:
        num(r.change) != null && num(r.transactionPrice) != null
          ? Math.abs(num(r.change)) * num(r.transactionPrice)
          : null,
      ownedAfter: num(r.share),
      filedAt: isoDay(r.filingDate),
    }));
  }

  return {
    symbol: sym,
    institutional,
    stakes: (stakes || []).map((s) => ({
      filer: s.filer_name,
      form: s.form_type,
      filedAt: isoDay(s.filed_at),
      eventDate: isoDay(s.event_date),
      percent: num(s.percent_of_class),
      shares: num(s.shares),
      amendment: !!s.is_amendment,
    })),
    insiders,
    insiderSource,
  };
}

/* ── filings and events ─────────────────────────────────────────────── */

async function filings(sym) {
  const today = new Date();
  const day = (d) => d.toISOString().slice(0, 10);
  const yearAgo = new Date(today.getTime() - 365 * 864e5);
  const ahead = new Date(today.getTime() + 180 * 864e5);
  const fk = finnhubKey();
  const key = fmpKey();
  const [secList, cal, hist] = await Promise.all([
    fk
      ? getJson(
          `${FINNHUB}/stock/filings?symbol=${encodeURIComponent(sym)}&from=${day(yearAgo)}&to=${day(today)}&token=${fk}`,
        )
      : null,
    fk
      ? getJson(
          `${FINNHUB}/calendar/earnings?symbol=${encodeURIComponent(sym)}&from=${day(today)}&to=${day(ahead)}&token=${fk}`,
        )
      : null,
    key
      ? getJson(
          `${FMP}/earnings-surprises?symbol=${encodeURIComponent(sym)}&limit=8&apikey=${encodeURIComponent(key)}`,
        )
      : null,
  ]);

  const sec = (Array.isArray(secList) ? secList : [])
    .map((f) => ({
      form: f.form,
      filedAt: isoDay(f.filedDate),
      acceptedAt: f.acceptedDate || null,
      url: f.reportUrl || f.filingUrl || null,
      indexUrl: f.filingUrl || null,
    }))
    .filter((f) => f.form && f.filedAt)
    .sort((a, b) => (a.filedAt < b.filedAt ? 1 : -1))
    .slice(0, 60);

  const upcoming = (Array.isArray(cal?.earningsCalendar) ? cal.earningsCalendar : [])
    .filter((e) => String(e.symbol || '').toUpperCase() === sym)
    .map((e) => ({
      date: isoDay(e.date),
      hour: e.hour || null,
      quarter: num(e.quarter),
      year: num(e.year),
      epsEstimate: num(e.epsEstimate),
      revenueEstimate: num(e.revenueEstimate),
    }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const reported = (Array.isArray(hist) ? hist : []).map((r) => ({
    date: isoDay(r.date),
    epsActual: num(r.actualEarningResult ?? r.epsActual),
    epsEstimate: num(r.estimatedEarning ?? r.epsEstimated),
  }));

  return {
    symbol: sym,
    sec,
    secSource: sec.length ? 'SEC EDGAR via Finnhub' : null,
    upcoming,
    reported,
  };
}

const PARTS = { financials, ownership, filings };

export const GET = withApiGuard(
  async (request, user, context) => {
    const sym = String(context?.params?.symbol || '')
      .toUpperCase()
      .trim();
    if (!SYMBOL_RE.test(sym)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }
    const part = new URL(request.url).searchParams.get('part') || '';
    const fn = PARTS[part];
    if (!fn) {
      return NextResponse.json(
        { error: 'part must be financials, ownership or filings' },
        { status: 400 },
      );
    }
    try {
      const out = await fn(sym);
      if (out?.error) return NextResponse.json({ error: out.error }, { status: out.status || 500 });
      return NextResponse.json(out, {
        headers: { 'Cache-Control': 'private, max-age=300' },
      });
    } catch (err) {
      console.error(`[research/company] ${part} ${sym}`, err?.message || err);
      return NextResponse.json({ error: 'Could not load this section.' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
