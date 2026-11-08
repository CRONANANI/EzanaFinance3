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
 *   detectInsiderBuyingPing(text)    { window } or null
 *   insiderWindow(id, now)           the date range a window id means
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
 * Findings only: no motive, no signal claim, no advice.
 */
import { FmpAPI } from '@/lib/services/fmp';
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import {
  groupBuys,
  summarizeBuys,
  usdTight,
  usdSpoken,
  pctSigned,
  dayFmt,
  rangeFmt,
  num,
} from '@/lib/sec/insider-buys';

export const MIN_BUYS = 5;
/* The race plays at most this many buys (the largest, in ascending order). */
export const MAX_RACE = 30;
const SPOTLIGHTS = 5;
const QUOTE_CAP = 40;
const QUOTE_MS = 2800;

/* ── Detection ──────────────────────────────────────────────────────── */

const OWN_RE =
  /\b(?:buy\w*|bought|purchas\w*|load\w*\s+up\s+on|scoop\w*\s+up)\s+(?:back\s+)?(?:their|its|his|her)\s+own\s+(?:stock|shares?|company|companies|equity)\b/i;
const WHO_RE =
  /\b(insiders?|insider\s+(?:buy\w*|purchas\w*|trad\w*|activity)|executives?|execs?|ceos?|cfos?|c-suite|directors?|board\s+members?|officers?|management|founders?|form\s*4s?)\b/i;
const BUY_RE = /\b(buy\w*|bought|purchas\w*|accumulat\w*|add(?:ed|ing)\s+to)\b/i;
/* "directors" alone is common in other pings; require a stock word with it. */
const STOCK_RE = /\b(stock|shares?|equity|own\s+company|insider|form\s*4)\b/i;

function windowAsked(t) {
  if (/\blast\s+month\b|\bprevious\s+month\b|\bin\s+(?:october|september|august)\b/i.test(t))
    return 'last_month';
  if (
    /\b(this|past|the\s+last)\s+month\b|\blast\s+30\s+days\b|\bmonth\s+to\s+date\b|\bmtd\b/i.test(t)
  )
    return 'month';
  if (/\blast\s+week\b|\bprevious\s+week\b/i.test(t)) return 'last_week';
  return 'week';
}

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
  return { window: windowAsked(t) };
}

/* ── Windows (New York calendar days) ───────────────────────────────── */

const nyDate = (now) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
const addDays = (iso, n) =>
  new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function insiderWindow(id, now = new Date()) {
  const today = nyDate(now);
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const monday = addDays(today, -dow);
  const monthStart = `${today.slice(0, 8)}01`;
  const prevMonthEnd = addDays(monthStart, -1);
  const prevMonthStart = `${prevMonthEnd.slice(0, 8)}01`;
  const lastWeek = {
    id: 'last_week',
    from: addDays(monday, -7),
    to: addDays(monday, -1),
    word: 'last week',
    label: 'Last week',
  };
  const lastMonth = {
    id: 'last_month',
    from: prevMonthStart,
    to: prevMonthEnd,
    word: 'last month',
    label: 'Last month',
  };
  switch (id) {
    case 'last_week':
      return { ...lastWeek, today };
    case 'last_month':
      return { ...lastMonth, today };
    case 'month':
      return {
        id,
        from: monthStart,
        to: today,
        word: 'this month',
        label: 'This month',
        prev: lastMonth,
        today,
      };
    default:
      return {
        id: 'week',
        from: monday,
        to: today,
        word: 'this week',
        label: 'This week',
        prev: lastWeek,
        today,
      };
  }
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

async function readPurchases(admin, from, to) {
  const rows = [];
  for (let start = 0; start < 10000; start += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_insider_transactions')
      .select(SELECT)
      .eq('transaction_code', 'P')
      .eq('table_kind', 'non_derivative')
      .gte('transaction_date', from)
      .lte('transaction_date', to)
      .order('transaction_date', { ascending: true })
      .range(start, start + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

const inRange = (b, w) => b.date >= w.from && b.date <= w.to;

export async function buildInsiderBuyingDossier({ admin, window = 'week', now = new Date() }) {
  if (!admin) return null;
  const asked = insiderWindow(window, now);
  const earliest = asked.prev ? asked.prev.from : asked.from;
  const raw = await readPurchases(admin, earliest, asked.to);
  const all = groupBuys(raw);

  let w = asked;
  let buys = all.filter((b) => inRange(b, asked));
  let fallback = null;
  if (buys.length < MIN_BUYS && asked.prev) {
    const prev = all.filter((b) => inRange(b, asked.prev));
    if (prev.length > buys.length) {
      fallback = { askedLabel: asked.label, askedCount: buys.length };
      w = { ...asked.prev, today: asked.today };
      buys = prev;
    }
  }
  if (!buys.length) {
    return {
      kind: 'insider_buying',
      name: 'Insider open-market buying',
      ticker: null,
      window: { id: w.id, label: w.label, word: w.word, from: w.from, to: w.to },
      fallback,
      empty: true,
      buys: [],
      race: [],
      summary: summarizeBuys([]),
      matches: { insiderBuys: [] },
      fundamentals: null,
      spark: [],
      news: [],
      echo: [],
    };
  }

  /* Quotes for the largest buys' companies first (the cap keeps a busy month inside budget). */
  const tickers = [...new Set([...buys].sort((a, b) => b.value - a.value).map((b) => b.ticker))];
  const quotes = await quotesFor(tickers);
  for (const b of buys) {
    const q = quotes.get(b.ticker) || null;
    b.priceNow = q?.price ?? null;
    b.marketCap = q?.marketCap ?? null;
    b.pe = q?.pe ?? null;
    b.sincePct = b.priceNow && b.price ? (b.priceNow / b.price - 1) * 100 : null;
  }

  const summary = summarizeBuys(buys);

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
    buys
      .map((b) => b.filedAt)
      .filter(Boolean)
      .sort()
      .pop() || null;
  const strip = (b) => ({
    ticker: b.ticker,
    name: b.name,
    reporter: b.reporter,
    role: b.role.label,
    value: b.value,
    date: b.date,
  });

  return {
    kind: 'insider_buying',
    name: 'Insider open-market buying',
    ticker: null,
    asof: asked.today,
    window: { id: w.id, label: w.label, word: w.word, from: w.from, to: w.to },
    fallback,
    rangeLabel: rangeFmt(dates[0], dates[dates.length - 1]),
    latestFiled,
    truncated: buys.length > race.length ? { shown: race.length, total: buys.length } : null,
    summary: {
      ...summary,
      largest: summary.largest ? strip(summary.largest) : null,
      smallest: summary.smallest ? strip(summary.smallest) : null,
      spotlights: spot.size,
    },
    race: raceOut,
    /* Every buy, largest first, for the ledger. */
    ledger: [...buys]
      .sort((a, b) => b.value - a.value)
      .map((b) => ({
        ...strip(b),
        tier: b.role.tier,
        price: b.price,
        shares: b.shares,
        sincePct: b.sincePct,
        accession: b.accession,
        issuerCik: b.issuerCik,
      })),
    matches: {
      insiderBuys: [...buys]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map(strip),
    },
    fundamentals: null,
    spark: [],
    news: [],
    echo: [],
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
  if (d.empty) {
    return `No open-market insider purchases are on file for ${d.window.word} (${rangeFmt(d.window.from, d.window.to)}). Form 4s are due two business days after a trade, so the latest days fill in over the next few days.`;
  }
  const s = d.summary;
  const parts = [];
  if (d.fallback) {
    parts.push(
      `${d.fallback.askedLabel} has ${d.fallback.askedCount} open-market insider buy${d.fallback.askedCount === 1 ? '' : 's'} filed so far, so this shows ${d.window.word}.`,
    );
  }
  parts.push(
    `Insiders made ${s.count} open-market purchases of their own companies' stock worth ${usdSpoken(s.total)} ${d.window.word} (${d.rangeLabel}), across ${s.companies} companies.`,
  );
  parts.push(
    `The largest was ${s.largest.name}, where ${s.largest.reporter} (${s.largest.role}) bought ${usdSpoken(s.largest.value)}; the smallest was ${s.smallest.ticker} at ${usdSpoken(s.smallest.value)}, and the median buy was ${usdSpoken(s.median)}.`,
  );
  if (s.topRole) {
    parts.push(
      `The most common buyer was a ${s.topRole.label === '10% Owner' ? '10% owner' : s.topRole.label} (${s.topRole.count} of ${s.count})${s.quoted ? `, and ${s.upCount} of ${s.quoted} quoted buys are above the price paid` : ''}.`,
    );
  }
  parts.push(
    'Open-market purchases (code P) only; awards, option exercises and gifts are excluded, and Form 4s arrive up to two business days after the trade.',
  );
  return parts.join(' ');
}

export const INSIDER_BUYING_ADDENDUM = `
This ping asks which company insiders bought their own stock in a window. The (insider) snippets are Ezana's own grouping of SEC Form 4 open-market purchases (code P), computed in code and shown beside the brief as a playable bar chart and a ledger. Answer first, in one paragraph of 70 to 110 words: the count and total, the largest and smallest buy with who made them, the most common role, and how many quoted buys are above the price paid. Then one sentence of limits. Never state a figure the snippets do not give. Never call a purchase a signal or say what an insider knows. No advice.`;

export const insiderFormat = { usdTight, usdSpoken, pctSigned, dayFmt, rangeFmt };
