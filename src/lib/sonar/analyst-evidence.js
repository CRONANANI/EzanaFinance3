/**
 * What the market and the analysts say about a listed company, as evidence
 * snippets for a Sonar company brief (Nov 3). SERVER ONLY.
 *
 *   (market)    price performance: 1 month, 3 months, year to date, 1 year
 *   (analysts)  published price targets (consensus, median, high, low, and
 *               what the consensus implies against the last price), the
 *               spread of ratings, and the latest rating actions by firm
 *
 * These are third-party views reported as findings, always attributed to the
 * firm or to "analyst consensus"; the brief never presents them as Ezana's.
 * Primary feed first (FMP); the ratings spread falls back to Finnhub's
 * recommendation trends. Every call is bounded and fails soft: a plan that
 * does not cover an endpoint costs that one snippet, never the ping. No
 * vendor name appears in a snippet.
 */
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { getFmpKey } from '@/lib/fmp/upcoming-events';

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
const ACTION_DAYS = 120;
const MAX_ACTIONS = 6;

async function getJson(url, ms) {
  try {
    const res = await fetchWithTimeout(url, { cache: 'no-store' }, ms);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
const first = (d) => (Array.isArray(d) ? d[0] : d) || null;
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const money = (v) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

/* "maintain" -> "maintained"; FMP action words are lower case. */
const VERB = {
  upgrade: 'upgraded',
  downgrade: 'downgraded',
  maintain: 'maintained',
  reiterate: 'reiterated',
  reiterated: 'reiterated',
  init: 'initiated',
  initiate: 'initiated',
  initialise: 'initiated',
  initialize: 'initiated',
};

/** One rating action in words: "Goldman Sachs upgraded to Buy from Neutral (2026-10-21)". */
export function actionLine(r) {
  const firm = String(r?.gradingCompany || '').trim();
  const to = String(r?.newGrade || '').trim();
  if (!firm || !to) return null;
  const from = String(r?.previousGrade || '').trim();
  const verb = VERB[String(r?.action || '').toLowerCase()] || 'rated';
  const day = String(r?.date || '').slice(0, 10);
  const body =
    verb === 'upgraded' || verb === 'downgraded'
      ? `${verb} to ${to}${from && from !== to ? ` from ${from}` : ''}`
      : verb === 'initiated'
        ? `initiated at ${to}`
        : `${verb} ${to}`;
  return `${firm} ${body}${day ? ` (${day})` : ''}`;
}

/**
 * @param {string} ticker
 * @param {{ ms?: number, now?: Date }} [opts]
 * @returns {Promise<Array<{ corpus: string, title: string, snippet: string, date: string, meta: object }>>}
 */
export async function analystEvidence(ticker, { ms = 1500, now = new Date() } = {}) {
  const sym = String(ticker || '').toUpperCase();
  const key = getFmpKey();
  if (!sym) return [];
  const today = now.toISOString().slice(0, 10);
  const q = (path) =>
    key
      ? getJson(
          `${FMP_STABLE}/${path}?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}`,
          ms,
        )
      : Promise.resolve(null);
  const finnhubKey = process.env.FINNHUB_API_KEY;

  const [change, quote, target, consensus, grades, trends] = await Promise.all([
    q('stock-price-change'),
    q('quote-short'),
    q('price-target-consensus'),
    q('grades-consensus'),
    q('grades'),
    finnhubKey
      ? getJson(
          `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(finnhubKey)}`,
          ms,
        )
      : Promise.resolve(null),
  ]);

  const out = [];

  /* Price performance over the standard windows. */
  const ch = first(change);
  const windows = [
    ['1M', '1 month'],
    ['3M', '3 months'],
    ['6M', '6 months'],
    ['ytd', 'year to date'],
    ['1Y', '1 year'],
  ]
    .map(([k, label]) => [label, num(ch?.[k] ?? ch?.[k.toUpperCase()])])
    .filter(([, v]) => v != null);
  if (windows.length) {
    out.push({
      corpus: 'market',
      title: `${sym} price performance`,
      snippet: `${sym} share price change: ${windows
        .map(([label, v]) => `${label} ${pct(v)}`)
        .join(', ')}. As of ${today}.`,
      date: today,
      meta: { ticker: sym },
    });
  }

  /* Published price targets, and what the consensus implies. */
  const t = first(target);
  const last = num(first(quote)?.price);
  const cons = num(t?.targetConsensus);
  const med = num(t?.targetMedian);
  const hi = num(t?.targetHigh);
  const lo = num(t?.targetLow);
  if (cons || med) {
    const parts = [
      cons ? `consensus ${money(cons)}` : null,
      med ? `median ${money(med)}` : null,
      hi && lo ? `range ${money(lo)} (low) to ${money(hi)} (high)` : null,
    ].filter(Boolean);
    const implied =
      cons && last
        ? ` Against the last price of ${money(last)}, the consensus target implies ${pct(((cons - last) / last) * 100)}.`
        : '';
    out.push({
      corpus: 'analysts',
      title: `Analyst price targets for ${sym}`,
      snippet: `Analyst price targets for ${sym}: ${parts.join(', ')}.${implied}`,
      date: today,
      meta: { ticker: sym },
    });
  }

  /* The spread of ratings: primary, else recommendation trends. */
  const gc = first(consensus);
  let spread = null;
  if (gc && ['strongBuy', 'buy', 'hold', 'sell', 'strongSell'].some((k) => num(gc[k]) != null)) {
    spread = { ...gc, label: gc.consensus || null };
  } else {
    const tr = Array.isArray(trends)
      ? [...trends].sort((a, b) => String(b.period).localeCompare(String(a.period)))[0]
      : null;
    if (tr) spread = { ...tr, label: null, period: tr.period };
  }
  if (spread) {
    const counts = [
      ['strong buy', spread.strongBuy],
      ['buy', spread.buy],
      ['hold', spread.hold],
      ['sell', spread.sell],
      ['strong sell', spread.strongSell],
    ]
      .map(([label, v]) => [label, num(v)])
      .filter(([, v]) => v != null);
    const total = counts.reduce((s, [, v]) => s + v, 0);
    if (total > 0) {
      out.push({
        corpus: 'analysts',
        title: `Analyst ratings on ${sym}`,
        snippet: `Analyst ratings on ${sym}${spread.period ? ` (${String(spread.period).slice(0, 7)})` : ''}: ${counts
          .map(([label, v]) => `${v} ${label}`)
          .join(
            ', ',
          )}, from ${total} analysts${spread.label ? `; consensus rating ${spread.label}` : ''}.`,
        date: today,
        meta: { ticker: sym },
      });
    }
  }

  /* The latest rating actions, newest first, within ACTION_DAYS. */
  const since = new Date(now.getTime() - ACTION_DAYS * 864e5).toISOString().slice(0, 10);
  const actions = (Array.isArray(grades) ? grades : [])
    .filter((r) => String(r?.date || '').slice(0, 10) >= since)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map(actionLine)
    .filter(Boolean)
    .slice(0, MAX_ACTIONS);
  if (actions.length) {
    out.push({
      corpus: 'analysts',
      title: `Recent analyst rating actions on ${sym}`,
      snippet: `Recent analyst rating actions on ${sym}: ${actions.join('; ')}.`,
      date: today,
      meta: { ticker: sym },
    });
  }
  return out;
}
