/**
 * Companies a ping names in words ("How exposed is Nvidia to China export
 * controls?"), Nov 3. The understanding layer knows tickers by symbol and
 * read that ping as a policy question about China, so the brief never saw
 * Nvidia and asked the visitor what they meant. A named company now makes
 * the ping about that company, with any country it names kept as context.
 *
 * Whole words, longest name first. Names that are also everyday words
 * (Target, Block, Unity, Booking, Visa) only count in their full form, and
 * "Amazon" never counts next to the rainforest or the river.
 */

/* [names, ticker, display name] */
const COMPANIES = [
  [['nvidia'], 'NVDA', 'NVIDIA'],
  [['advanced micro devices', 'amd'], 'AMD', 'Advanced Micro Devices'],
  [['intel'], 'INTC', 'Intel'],
  [['tsmc', 'taiwan semiconductor'], 'TSM', 'Taiwan Semiconductor Manufacturing'],
  [['qualcomm'], 'QCOM', 'Qualcomm'],
  [['broadcom'], 'AVGO', 'Broadcom'],
  [['micron'], 'MU', 'Micron Technology'],
  [['applied materials'], 'AMAT', 'Applied Materials'],
  [['lam research'], 'LRCX', 'Lam Research'],
  [['asml'], 'ASML', 'ASML'],
  [['texas instruments'], 'TXN', 'Texas Instruments'],
  [['apple'], 'AAPL', 'Apple'],
  [['microsoft'], 'MSFT', 'Microsoft'],
  [['alphabet', 'google'], 'GOOGL', 'Alphabet'],
  [['amazon'], 'AMZN', 'Amazon'],
  [['meta platforms', 'facebook'], 'META', 'Meta Platforms'],
  [['tesla'], 'TSLA', 'Tesla'],
  [['berkshire hathaway', 'berkshire'], 'BRK.B', 'Berkshire Hathaway'],
  [['jpmorgan', 'jp morgan'], 'JPM', 'JPMorgan Chase'],
  [['visa inc'], 'V', 'Visa'],
  [['mastercard'], 'MA', 'Mastercard'],
  [['unitedhealth'], 'UNH', 'UnitedHealth Group'],
  [['eli lilly'], 'LLY', 'Eli Lilly'],
  [['johnson & johnson', 'johnson and johnson'], 'JNJ', 'Johnson & Johnson'],
  [['exxon mobil', 'exxonmobil', 'exxon'], 'XOM', 'Exxon Mobil'],
  [['chevron'], 'CVX', 'Chevron'],
  [['walmart'], 'WMT', 'Walmart'],
  [['costco'], 'COST', 'Costco'],
  [['home depot'], 'HD', 'Home Depot'],
  [['procter & gamble', 'procter and gamble'], 'PG', 'Procter & Gamble'],
  [['oracle'], 'ORCL', 'Oracle'],
  [['cisco'], 'CSCO', 'Cisco Systems'],
  [['salesforce'], 'CRM', 'Salesforce'],
  [['netflix'], 'NFLX', 'Netflix'],
  [['adobe'], 'ADBE', 'Adobe'],
  [['goldman sachs'], 'GS', 'Goldman Sachs'],
  [['morgan stanley'], 'MS', 'Morgan Stanley'],
  [['bank of america'], 'BAC', 'Bank of America'],
  [['wells fargo'], 'WFC', 'Wells Fargo'],
  [['blackrock'], 'BLK', 'BlackRock'],
  [['caterpillar'], 'CAT', 'Caterpillar'],
  [['john deere', 'deere'], 'DE', 'Deere'],
  [['boeing'], 'BA', 'Boeing'],
  [['lockheed martin', 'lockheed'], 'LMT', 'Lockheed Martin'],
  [['raytheon', 'rtx'], 'RTX', 'RTX'],
  [['northrop grumman', 'northrop'], 'NOC', 'Northrop Grumman'],
  [['general dynamics'], 'GD', 'General Dynamics'],
  [['palantir'], 'PLTR', 'Palantir'],
  [['crowdstrike'], 'CRWD', 'CrowdStrike'],
  [['snowflake'], 'SNOW', 'Snowflake'],
  [['coinbase'], 'COIN', 'Coinbase'],
  [['robinhood'], 'HOOD', 'Robinhood'],
  [['paypal'], 'PYPL', 'PayPal'],
  [['uber'], 'UBER', 'Uber'],
  [['airbnb'], 'ABNB', 'Airbnb'],
  [['spotify'], 'SPOT', 'Spotify'],
  [['ford motor', 'ford'], 'F', 'Ford Motor'],
  [['general motors'], 'GM', 'General Motors'],
  [['pfizer'], 'PFE', 'Pfizer'],
  [['moderna'], 'MRNA', 'Moderna'],
  [['disney'], 'DIS', 'Disney'],
];

const NOT_THE_COMPANY = {
  amazon:
    /\bamazon\s+(?:rain\s?forest|forest|river|basin|region|deforestation)\b|\bthe\s+amazon\b/i,
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ENTRIES = COMPANIES.flatMap(([names, ticker, name]) =>
  names.map((n) => ({ n, ticker, name })),
).sort((a, b) => b.n.length - a.n.length);
const RE = new RegExp(
  `(^|[^\\p{L}\\p{N}])(${ENTRIES.map((e) => escapeRe(e.n)).join('|')})(?=[^\\p{L}\\p{N}]|$)`,
  'iu',
);
const BY_NAME = new Map(ENTRIES.map((e) => [e.n, e]));

/**
 * The first company a ping names, or null.
 * @param {string} text
 * @returns {{ ticker: string, name: string, surface: string } | null}
 */
export function mentionedCompany(text) {
  const t = String(text || '');
  const m = t.match(RE);
  if (!m) return null;
  const hit = BY_NAME.get(m[2].toLowerCase());
  if (!hit) return null;
  const guard = NOT_THE_COMPANY[hit.n];
  if (guard && guard.test(t)) return null;
  return { ticker: hit.ticker, name: hit.name, surface: m[2] };
}

const RE_ALL = new RegExp(RE.source, 'giu');

/**
 * Every distinct company a ping names, in order of first mention (Nov 2026,
 * research modes: "Compare NVIDIA, AMD, Microsoft, Amazon, and Alphabet").
 * @param {string} text
 * @returns {Array<{ ticker: string, name: string, surface: string }>}
 */
export function mentionedCompanies(text) {
  const t = String(text || '');
  const out = [];
  const seen = new Set();
  for (const m of t.matchAll(RE_ALL)) {
    const hit = BY_NAME.get(m[2].toLowerCase());
    if (!hit || seen.has(hit.ticker)) continue;
    const guard = NOT_THE_COMPANY[hit.n];
    if (guard && guard.test(t)) continue;
    seen.add(hit.ticker);
    out.push({ ticker: hit.ticker, name: hit.name, surface: m[2] });
  }
  return out;
}
