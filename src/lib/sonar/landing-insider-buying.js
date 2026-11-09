/**
 * Sonar insider buying (Nov 2026): "Who's buying their own stock this week?",
 * "Which CEOs bought shares this month?", "insider purchases last week".
 *
 * Before this the ping had no company, member, country or industry to
 * resolve, so it fell through to a general briefing while Ezana's Form 4
 * transactions sat unread. It now reads sec_insider_transactions (open-market
 * purchases, code P) for the window asked, groups them into buys
 * (src/lib/sec/insider-buys.js), adds each company's latest quote, market cap
 * and P/E, and the stack plays them smallest to largest
 * (SonarInsiderBuyingStack.jsx).
 *
 *   detectInsiderBuyingPing(text)    { window, said } or null
 *   insiderWindow(spec, now)         the dates and words a window spec means
 *                                    (src/lib/sonar/insider-windows.js)
 *   buildInsiderBuyingDossier(opts)  the dossier the stack renders (kind 'insider_buying')
 *   insiderBuyingEvidence(dossier)   the snippets the brief reads and cites
 *   insiderBuyingBrief(dossier)      the answer-first paragraph (no model call)
 *   INSIDER_BUYING_ADDENDUM          the brief's instructions if a model ever writes it
 *
 * Honesty rules, enforced here rather than left to the model:
 *   - Every figure is from a filing or a quote. Nothing is estimated or filled.
 *   - A missing quote shows n/a; since-purchase is never inferred.
 *   - Form 4s are due two business days after the trade, so the newest days
 *     are incomplete; the copy says so.
 *   - "This week" with fewer than MIN_BUYS filed so far shows last week and
 *     says it did.
 *   - Nov 9, 2026: any window the ping names (a year, quarter, month, "last 90
 *     days", "since 2025"), never quietly this week. A window that has not
 *     started, or that Ezana's records do not reach, says so; one they reach
 *     part of says where coverage starts. Windows over LONG_DAYS are grouped in
 *     the database (sonar_insider_buys_window) and the ledger lists the
 *     LEDGER_TOP largest.
 * Findings only: no motive, no signal claim, no advice.
 */
import { FmpAPI } from '@/lib/services/fmp';
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import {
  groupBuys,
  summarizeBuys,
  summaryFromStats,
  buyFromGroupRow,
  roleInSentence,
  usdTight,
  usdSpoken,
  pctSigned,
  dayFmt,
  rangeFmt,
  num,
} from '@/lib/sec/insider-buys';
import { windowSpec, resolveWindow, windowDays, monthYear } from '@/lib/sonar/insider-windows';

export const MIN_BUYS = 5;
/* The race plays at most this many buys (the largest, in ascending order). */
export const MAX_RACE = 30;
const SPOTLIGHTS = 5;
const QUOTE_CAP = 40;
const QUOTE_MS = 2800;
/* Windows longer than this are grouped in the database, not paged into the ping. */
export const LONG_DAYS = 62;
/* A long window's ledger lists this many of its largest buys. */
export const LEDGER_TOP = 200;
const COVERAGE_TTL_MS = 6 * 60 * 60 * 1000;

/* ── Detection ──────────────────────────────────────────────────────── */

const OWN_RE =
  /\b(?:buy\w*|bought|purchas\w*|load\w*\s+up\s+on|scoop\w*\s+up)\s+(?:back\s+)?(?:their|its|his|her)\s+own\s+(?:stock|shares?|company|companies|equity)\b/i;
const WHO_RE =
  /\b(insiders?|insider\s+(?:buy\w*|purchas\w*|trad\w*|activity)|executives?|execs?|ceos?|cfos?|c-suite|directors?|board\s+members?|officers?|management|founders?|form\s*4s?)\b/i;
const BUY_RE = /\b(buy\w*|bought|purchas\w*|accumulat\w*|add(?:ed|ing)\s+to)\b/i;
/* "directors" alone is common in other pings; require a stock word with it. */
const STOCK_RE = /\b(stock|shares?|equity|own\s+company|insider|form\s*4)\b/i;

/**
 * An insider-buying ping names insiders (or says "their own stock") and a
 * purchase. The caller lets a named company or ticker win ("Is Nvidia's CEO
 * buying?" is a company ping) and runs this before the 13F flows detector.
 */
export function detectInsiderBuyingPing(text) {
  const t = String(text || '');
  const own = OWN_RE.test(t);
  if (!own && !(WHO_RE.test(t) && BUY_RE.test(t) && STOCK_RE.test(t))) return null;
  /* Institutions and Congress have their own pings. */
  if (!own && /\b(hedge\s+funds?|institutions?|13f|congress\w*|senators?|lawmakers?)\b/i.test(t))
    return null;
  const spec = windowSpec(t);
  return { window: spec, said: resolveWindow(spec).noun };
}

/* ── Windows (New York calendar days) ───────────────────────────────── */

/** The dates and words a window spec means (see src/lib/sonar/insider-windows.js). */
export function insiderWindow(spec, now = new Date()) {
  return resolveWindow(spec, now);
}

/* ── Quotes: price, market cap, P/E (fail soft, capped) ─────────────── */

async function ratiosTtm(symbol) {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/ratios-ttm?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`,
      {},
      QUOTE_MS,
    );
    if (!res.ok) return null;
    const d = await res.json();
    return (Array.isArray(d) ? d[0] : d) || null;
  } catch {
    return null;
  }
}

async function quoteFor(ticker) {
  const symbol = ticker.replace('.', '-');
  const [q, r] = await Promise.all([FmpAPI.getQuote(symbol).catch(() => null), ratiosTtm(symbol)]);
  const price = num(q?.price);
  return {
    price,
    marketCap: num(q?.marketCap),
    pe: num(r?.priceToEarningsRatioTTM) ?? num(r?.peRatioTTM) ?? num(q?.pe),
  };
}

async function quotesFor(tickers) {
  const out = new Map();
  const list = tickers.slice(0, QUOTE_CAP);
  const timeout = new Promise((r) => setTimeout(() => r('timeout'), QUOTE_MS + 400));
  const all = Promise.all(
    list.map(async (t) => {
      const q = await quoteFor(t).catch(() => null);
      if (q) out.set(t, q);
    }),
  );
  await Promise.race([all, timeout]);
  return out;
}

/* ── Dossier ────────────────────────────────────────────────────────── */

const SELECT =
  'accession_no, table_kind, line_no, form_type, filed_at, issuer_cik, issuer_name, issuer_ticker, reporter_cik, reporter_name, reporter_title, is_director, is_officer, is_ten_pct_owner, transaction_date, transaction_code, acquired_disposed, shares, price, value_usd, direct_indirect';

async function readPurchases(admin, from, to, cap = 10000) {
  const rows = [];
  let capped = false;
  for (let start = 0; start < cap; start += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_insider_transactions')
      .select(SELECT)
      .eq('transaction_code', 'P')
      .eq('table_kind', 'non_derivative')
      .gte('transaction_date', from)
      .lte('transaction_date', to)
      .order('transaction_date', { ascending: true })
      .order('accession_no', { ascending: true })
      .order('line_no', { ascending: true })
      .range(start, start + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
    if (start + 1000 >= cap) capped = true;
  }
  return { rows, capped };
}

/* Where reliable coverage starts (the first month with a full month's purchases), cached
   per instance; null when the function is missing or the read fails (no coverage note). */
let coverageCache = { at: 0, value: null };
async function readCoverage(admin) {
  if (coverageCache.value && Date.now() - coverageCache.at < COVERAGE_TTL_MS)
    return coverageCache.value;
  try {
    const { data, error } = await admin.rpc('sonar_insider_coverage', { p_min_rows: 50 });
    if (error) return null;
    const value = { coveredFrom: data?.coveredFrom || null, latest: data?.latest || null };
    coverageCache = { at: Date.now(), value };
    return value;
  } catch {
    return null;
  }
}

/* A long window, grouped in the database: { stats, buys } or null (function missing). */
async function readWindowSql(admin, from, to) {
  try {
    const { data, error } = await admin.rpc('sonar_insider_buys_window', {
      p_from: from,
      p_to: to,
      p_top: LEDGER_TOP,
    });
    if (error || !data) return null;
    return { stats: data, buys: (data.groups || []).map(buyFromGroupRow) };
  } catch {
    return null;
  }
}

const inRange = (b, w) => b.date >= w.from && b.date <= w.to;

const windowOut = (w) => ({
  id: w.spec,
  label: w.label,
  word: w.word,
  noun: w.noun,
  unit: w.unit,
  from: w.from,
  to: w.to,
});

export async function buildInsiderBuyingDossier({ admin, window = 'week', now = new Date() }) {
  if (!admin) return null;
  const asked = insiderWindow(window, now);
  const base = {
    kind: 'insider_buying',
    name: 'Insider open-market buying',
    ticker: null,
    asof: asked.today,
    matches: { insiderBuys: [] },
    fundamentals: null,
    spark: [],
    news: [],
    echo: [],
  };
  const empty = (w, extra = {}) => ({
    ...base,
    window: windowOut(w),
    empty: true,
    buys: [],
    race: [],
    ledger: [],
    summary: summarizeBuys([]),
    ...extra,
  });

  /* A window that has not started is said, not swapped for another. */
  if (asked.future) return empty(asked, { coverage: { note: 'future' } });

  /* Coverage: before Ezana's records, say so; part-way, read from where they start. */
  const span = { from: asked.from, to: asked.to };
  let coverage = null;
  const cov = await readCoverage(admin);
  if (cov?.coveredFrom) {
    if (asked.to < cov.coveredFrom)
      return empty(asked, { coverage: { note: 'before', coveredFrom: cov.coveredFrom } });
    if (asked.from < cov.coveredFrom) {
      span.from = cov.coveredFrom;
      coverage = { note: 'partial', coveredFrom: cov.coveredFrom };
    }
  }

  let w = asked;
  let buys = null;
  let stats = null;
  let fallback = null;
  let capped = false;
  const long = windowDays(span) > LONG_DAYS;
  if (long) {
    const sql = await readWindowSql(admin, span.from, span.to);
    if (sql) ({ stats, buys } = sql);
  }
  if (!buys) {
    /* Short windows, or a long one before the migration is applied (capped read). */
    const earliest = asked.prev ? asked.prev.from : span.from;
    const read = await readPurchases(admin, earliest, span.to, long ? 20000 : 10000);
    capped = read.capped;
    const all = groupBuys(read.rows);
    buys = all.filter((b) => inRange(b, span));
    if (buys.length < MIN_BUYS && asked.prev) {
      const prev = all.filter((b) => inRange(b, asked.prev));
      if (prev.length > buys.length) {
        fallback = { askedLabel: asked.label, askedCount: buys.length };
        w = { ...asked.prev, today: asked.today };
        buys = prev;
      }
    }
  }
  if (!buys.length) return empty(w, { fallback, coverage });

  /* Quotes for the largest buys' companies first (the cap keeps a busy window inside budget). */
  const tickers = [...new Set([...buys].sort((a, b) => b.value - a.value).map((b) => b.ticker))];
  const quotes = await quotesFor(tickers);
  for (const b of buys) {
    const q = quotes.get(b.ticker) || null;
    b.priceNow = q?.price ?? null;
    b.marketCap = q?.marketCap ?? null;
    b.pe = q?.pe ?? null;
    b.sincePct = b.priceNow && b.price ? (b.priceNow / b.price - 1) * 100 : null;
  }

  const summary = stats ? summaryFromStats(stats, buys) : summarizeBuys(buys);
  const total = stats ? summary.count : buys.length;

  /* The race: the MAX_RACE largest buys, played smallest to largest. */
  const race = [...buys]
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_RACE)
    .sort((a, b) => a.value - b.value || String(a.date).localeCompare(String(b.date)));

  /* Spotlights: the largest buy at each of the five biggest companies by market cap. */
  const best = new Map();
  for (const b of race) {
    if (!b.marketCap) continue;
    const cur = best.get(b.ticker);
    if (!cur || b.value > cur.value) best.set(b.ticker, b);
  }
  const spot = new Set(
    [...best.values()]
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, SPOTLIGHTS)
      .map((b) => b.accession + b.reporter),
  );
  const raceOut = race.map((b, i) => ({
    i: i + 1,
    ticker: b.ticker,
    name: b.name,
    reporter: b.reporter,
    role: b.role,
    title: b.title,
    shares: b.shares,
    price: b.price,
    value: b.value,
    date: b.date,
    firstDate: b.firstDate,
    filedAt: b.filedAt,
    accession: b.accession,
    issuerCik: b.issuerCik,
    indirect: b.indirect,
    priceNow: b.priceNow,
    marketCap: b.marketCap,
    pe: b.pe,
    sincePct: b.sincePct,
    spotlight: spot.has(b.accession + b.reporter),
  }));

  const dates = buys
    .map((b) => b.date)
    .filter(Boolean)
    .sort();
  const latestFiled =
    stats?.latestFiled ||
    buys
      .map((b) => b.filedAt)
      .filter(Boolean)
      .sort()
      .pop() ||
    null;
  const strip = (b) => ({
    ticker: b.ticker,
    name: b.name,
    reporter: b.reporter,
    role: b.role.label,
    value: b.value,
    date: b.date,
  });
  const byValue = [...buys].sort((a, b) => b.value - a.value);

  return {
    ...base,
    window: windowOut(w),
    fallback,
    coverage,
    capped,
    rangeLabel: stats
      ? rangeFmt(stats.firstDate, stats.lastDate)
      : rangeFmt(dates[0], dates[dates.length - 1]),
    latestFiled,
    truncated: total > race.length ? { shown: race.length, total } : null,
    ledgerTruncated: total > buys.length ? { shown: buys.length, total } : null,
    summary: {
      ...summary,
      largest: summary.largest ? strip(summary.largest) : null,
      smallest: summary.smallest ? strip(summary.smallest) : null,
      spotlights: spot.size,
    },
    race: raceOut,
    /* Every buy (a long window: its LEDGER_TOP largest), largest first, for the ledger. */
    ledger: byValue.map((b) => ({
      ...strip(b),
      tier: b.role.tier,
      price: b.price,
      shares: b.shares,
      sincePct: b.sincePct,
      accession: b.accession,
      issuerCik: b.issuerCik,
    })),
    matches: { insiderBuys: byValue.slice(0, 5).map(strip) },
  };
}

/* ── Evidence for the brief ─────────────────────────────────────────── */

const SOURCE = 'SEC Form 4, open-market purchases (transaction code P)';

export function insiderBuyingEvidence(d) {
  if (!d || d.kind !== 'insider_buying' || d.empty) return [];
  const s = d.summary;
  const out = [];
  const push = (title, snippet) =>
    out.push({
      corpus: 'insider',
      title,
      snippet,
      date: d.window.to,
      meta: { source: SOURCE, period: `${d.window.from} to ${d.window.to}` },
    });
  push(
    `Insider open-market buys, ${d.window.word}`,
    `${s.count} buys worth ${usdTight(s.total)} across ${s.companies} companies, traded ${d.rangeLabel}. Largest ${s.largest.ticker} ${usdTight(s.largest.value)} (${s.largest.reporter}, ${s.largest.role}); smallest ${s.smallest.ticker} ${usdTight(s.smallest.value)}; median ${usdTight(s.median)}.`,
  );
  push(
    'Who bought',
    `${s.tiers.exec} by executives, ${s.tiers.director} by directors, ${s.tiers.officer} by other officers, ${s.tiers.owner} by 10% owners. Most common role: ${s.topRole?.label} (${s.topRole?.count}).`,
  );
  push(
    'Since purchase',
    `${s.upCount} of ${s.quoted} quoted buys are above the price paid at the latest quote.`,
  );
  for (const b of d.ledger.slice(0, 6)) {
    push(
      `${b.ticker} insider buy`,
      `${b.reporter} (${b.role}) bought ${usdTight(b.value)} of ${b.name} on ${dayFmt(b.date)}${Number.isFinite(b.sincePct) ? `, ${pctSigned(b.sincePct, 1)} since` : ''}.`,
    );
  }
  return out;
}

/* ── The brief ──────────────────────────────────────────────────────── */

/**
 * Answer first, one short paragraph (the race, ledger and roles cards carry
 * the detail). Built from the dossier, so it never states a figure the cards
 * do not show, and it never times out.
 */
export function insiderBuyingBrief(d) {
  if (!d || d.kind !== 'insider_buying') return null;
  const noun = d.window.noun || d.window.word;
  if (d.coverage?.note === 'future') {
    return `${noun.replace(/^./, (c) => c.toUpperCase())} has not started yet, so there are no insider purchases to show.`;
  }
  if (d.coverage?.note === 'before') {
    return `Ezana's insider purchase records start in ${monthYear(d.coverage.coveredFrom)}, so ${noun} is not covered yet. Ask about a window from ${monthYear(d.coverage.coveredFrom)} onward.`;
  }
  if (d.empty) {
    return `No open-market insider purchases are on file for ${noun} (${rangeFmt(d.window.from, d.window.to)}). Form 4s are due two business days after a trade, so the latest days fill in over the next few days.`;
  }
  const s = d.summary;
  const parts = [];
  if (d.coverage?.note === 'partial') {
    parts.push(
      `Ezana's insider purchase records start in ${monthYear(d.coverage.coveredFrom)}, so this covers ${noun} from then on.`,
    );
  }
  if (d.fallback) {
    parts.push(
      `${d.fallback.askedLabel} has ${d.fallback.askedCount} open-market insider buy${d.fallback.askedCount === 1 ? '' : 's'} filed so far, so this shows ${d.window.word}.`,
    );
  }
  parts.push(
    `Insiders made ${s.count.toLocaleString('en-US')} open-market purchase${s.count === 1 ? '' : 's'} of their own companies' stock worth ${usdSpoken(s.total)} ${d.window.word} (${d.rangeLabel}), across ${s.companies.toLocaleString('en-US')} compan${s.companies === 1 ? 'y' : 'ies'}.`,
  );
  parts.push(
    `The largest was ${s.largest.name}, where ${s.largest.reporter} (${s.largest.role}) bought ${usdSpoken(s.largest.value)}; the smallest was ${s.smallest.ticker} at ${usdSpoken(s.smallest.value)}, and the median buy was ${usdSpoken(s.median)}.`,
  );
  if (s.topRole) {
    parts.push(
      `The most common buyer was ${roleInSentence(s.topRole.label)} (${s.topRole.count} of ${s.count})${s.quoted ? `, and ${s.upCount} of ${s.quoted} quoted buys are above the price paid` : ''}.`,
    );
  }
  parts.push(
    'Open-market purchases (code P) only; awards, option exercises and gifts are excluded, and Form 4s arrive up to two business days after the trade.',
  );
  return parts.join(' ');
}

export const INSIDER_BUYING_ADDENDUM = `
This ping asks which company insiders bought their own stock in a window (a week, month, quarter, year or a range; the snippets name it). The (insider) snippets are Ezana's own grouping of SEC Form 4 open-market purchases (code P), computed in code and shown beside the brief as a playable bar chart and a ledger. Answer first, in one paragraph of 70 to 110 words: the count and total, the largest and smallest buy with who made them, the most common role, and how many quoted buys are above the price paid. Then one sentence of limits. Never state a figure the snippets do not give. Never call a purchase a signal or say what an insider knows. No advice.`;

export const insiderFormat = { usdTight, usdSpoken, pctSigned, dayFmt, rangeFmt };
