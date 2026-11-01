/**
 * Commodity stats in a Sonar brief (Nov 1).
 *
 * A brief such as "tungsten up 557%, oil 40 to 55%, fertilizers roughly 75%"
 * makes each commodity figure clickable; clicking one opens that commodity's
 * price chart above the right-hand stack (SonarCommodityChart). This module
 * is shared by the client (finding the stats in the text) and the server
 * route that serves the series (/api/sonar/commodity-series), so the two can
 * never disagree on what a commodity id means.
 *
 * Each entry names its market symbol (`fmp`, the futures-style symbol the
 * primary market data feed uses) and, where one exists, the matching
 * commodity series of the fallback feed (`av`). Commodities with no traded
 * price (tungsten, fertilizer, uranium, lithium) chart a listed proxy, and
 * the chart says so in words: `proxy` holds that sentence.
 *
 * No vendor name appears in anything the page shows.
 */

export const COMMODITIES = [
  /* Specific names before general ones: "Brent" before "oil", "heating oil"
     before "oil", "natural gas" before "gas". */
  { id: 'brent', label: 'Brent crude', words: ['brent'], fmp: 'BZUSD', av: 'BRENT' },
  {
    id: 'heating-oil',
    label: 'Heating oil',
    words: ['heating oil', 'diesel'],
    fmp: 'HOUSD',
    av: null,
  },
  {
    id: 'gasoline',
    label: 'Gasoline (RBOB)',
    words: ['gasoline', 'petrol'],
    fmp: 'RBUSD',
    av: null,
  },
  {
    id: 'natgas',
    label: 'Natural gas',
    words: ['natural gas', 'lng', 'gas prices', 'gas'],
    fmp: 'NGUSD',
    av: 'NATURAL_GAS',
  },
  {
    id: 'oil',
    label: 'Crude oil (WTI)',
    words: ['crude oil', 'crude', 'oil', 'wti'],
    fmp: 'CLUSD',
    av: 'WTI',
  },
  { id: 'gold', label: 'Gold', words: ['gold'], fmp: 'GCUSD', av: null },
  { id: 'silver', label: 'Silver', words: ['silver'], fmp: 'SIUSD', av: null },
  { id: 'copper', label: 'Copper', words: ['copper'], fmp: 'HGUSD', av: 'COPPER' },
  {
    id: 'aluminum',
    label: 'Aluminum',
    words: ['aluminum', 'aluminium'],
    fmp: 'ALIUSD',
    av: 'ALUMINUM',
  },
  { id: 'platinum', label: 'Platinum', words: ['platinum'], fmp: 'PLUSD', av: null },
  { id: 'palladium', label: 'Palladium', words: ['palladium'], fmp: 'PAUSD', av: null },
  { id: 'wheat', label: 'Wheat', words: ['wheat'], fmp: 'KEUSX', av: 'WHEAT' },
  { id: 'corn', label: 'Corn', words: ['corn', 'maize'], fmp: 'ZCUSX', av: 'CORN' },
  {
    id: 'soybeans',
    label: 'Soybeans',
    words: ['soybeans', 'soybean', 'soy'],
    fmp: 'ZSUSX',
    av: null,
  },
  { id: 'rice', label: 'Rough rice', words: ['rice'], fmp: 'ZRUSD', av: null },
  { id: 'sugar', label: 'Sugar', words: ['sugar'], fmp: 'SBUSX', av: 'SUGAR' },
  { id: 'coffee', label: 'Coffee', words: ['coffee'], fmp: 'KCUSX', av: 'COFFEE' },
  { id: 'cocoa', label: 'Cocoa', words: ['cocoa'], fmp: 'CCUSD', av: null },
  { id: 'cotton', label: 'Cotton', words: ['cotton'], fmp: 'CTUSX', av: 'COTTON' },
  { id: 'lumber', label: 'Lumber', words: ['lumber', 'timber'], fmp: 'LBUSD', av: null },
  { id: 'cattle', label: 'Live cattle', words: ['cattle', 'beef'], fmp: 'LEUSX', av: null },
  { id: 'hogs', label: 'Lean hogs', words: ['hogs', 'pork'], fmp: 'HEUSX', av: null },
  /* No traded price: a listed proxy, said in words on the chart. */
  {
    id: 'fertilizer',
    label: 'Fertilizer',
    words: ['fertilizers', 'fertilizer', 'fertilisers', 'fertiliser', 'urea', 'potash', 'ammonia'],
    fmp: 'CF',
    av: null,
    avEquity: 'CF',
    proxy:
      'No traded fertilizer price exists, so this tracks CF Industries (CF), the largest North American nitrogen fertilizer producer.',
  },
  {
    id: 'tungsten',
    label: 'Tungsten',
    words: ['tungsten'],
    fmp: 'REMX',
    av: null,
    avEquity: 'REMX',
    proxy:
      'No traded tungsten price exists, so this tracks the VanEck Rare Earth and Strategic Metals ETF (REMX), which holds strategic metals producers.',
  },
  {
    id: 'uranium',
    label: 'Uranium',
    words: ['uranium'],
    fmp: 'URA',
    av: null,
    avEquity: 'URA',
    proxy:
      'No exchange-traded uranium price is in our feed, so this tracks the Global X Uranium ETF (URA).',
  },
  {
    id: 'lithium',
    label: 'Lithium',
    words: ['lithium'],
    fmp: 'LIT',
    av: null,
    avEquity: 'LIT',
    proxy:
      'No traded lithium price is in our feed, so this tracks the Global X Lithium and Battery Tech ETF (LIT).',
  },
];

export const COMMODITY_BY_ID = Object.fromEntries(COMMODITIES.map((c) => [c.id, c]));

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* Every word, longest first, each mapped to its commodity. */
const WORDS = COMMODITIES.flatMap((c) => c.words.map((w) => [w, c.id])).sort(
  (a, b) => b[0].length - a[0].length,
);
const WORD_ID = new Map(WORDS.map(([w, id]) => [w, id]));
const WORD_RE = new RegExp(
  `(^|[^\\p{L}])(${WORDS.map(([w]) => escapeRe(w)).join('|')})(?=[^\\p{L}]|$)`,
  'giu',
);
/* "557%", "+12.5%", "40-55%", "40 to 55%", "75 percent". */
const FIGURE_RE =
  /[+-]?\d+(?:\.\d+)?(?:\s*(?:-|–|to)\s*\d+(?:\.\d+)?)?\s*(?:%|percent\b|per cent\b)/gi;

/* How far a figure may sit from its commodity, and what may not lie between. */
const MAX_BEFORE = 48;
const MAX_AFTER = 24;
const BREAK_RE = /[.;:!?\n]|\[S\d+\]/;

/**
 * Split a paragraph into plain text and commodity stats. A stat runs from the
 * commodity's name to its figure ("tungsten up 557%"), or from the figure to
 * the name when the name follows ("a 75% jump in fertilizer").
 * @param {string} text
 * @returns {Array<{ text: string, stat?: { id: string, figure: string } }>}
 */
export function commoditySegments(text) {
  const s = String(text || '');
  const words = [...s.matchAll(WORD_RE)].map((m) => {
    const start = m.index + m[1].length;
    return { start, end: start + m[2].length, id: WORD_ID.get(m[2].toLowerCase()) };
  });
  if (!words.length) return [{ text: s }];
  const figures = [...s.matchAll(FIGURE_RE)].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
    figure: m[0].trim(),
  }));

  const stats = [];
  let usedTo = 0;
  for (const f of figures) {
    if (f.start < usedTo) continue;
    /* The nearest name before the figure, with nothing breaking the clause. */
    const before = words
      .filter((w) => w.end <= f.start && w.start >= usedTo && f.start - w.end <= MAX_BEFORE)
      .pop();
    const gapOk = (a, b) => !BREAK_RE.test(s.slice(a, b));
    if (before && gapOk(before.end, f.start)) {
      stats.push({ start: before.start, end: f.end, id: before.id, figure: f.figure });
      usedTo = f.end;
      continue;
    }
    const after = words.find((w) => w.start >= f.end && w.start - f.end <= MAX_AFTER);
    if (after && gapOk(f.end, after.start)) {
      stats.push({ start: f.start, end: after.end, id: after.id, figure: f.figure });
      usedTo = after.end;
    }
  }
  if (!stats.length) return [{ text: s }];

  const out = [];
  let at = 0;
  for (const st of stats) {
    if (st.start > at) out.push({ text: s.slice(at, st.start) });
    out.push({ text: s.slice(st.start, st.end), stat: { id: st.id, figure: st.figure } });
    at = st.end;
  }
  if (at < s.length) out.push({ text: s.slice(at) });
  return out;
}

const MONTHS =
  'january|february|march|april|may|june|july|august|september|october|november|december';
const DATE_RE = new RegExp(
  `\\b(?:since|began(?:\\s+on)?|started(?:\\s+on)?|from)\\s+(?:(?:early|mid|late)[- ])?(${MONTHS})\\s+(?:(\\d{1,2}),?\\s+)?(\\d{4})`,
  'i',
);

/**
 * The start of the window a brief measures from ("since the Iran war began
 * on February 28, 2026" -> "2026-02-28"; "since late February 2026" ->
 * "2026-02-01"), or null.
 * @param {string} text
 */
export function windowStart(text) {
  const m = String(text || '').match(DATE_RE);
  if (!m) return null;
  const month = MONTHS.split('|').indexOf(m[1].toLowerCase()) + 1;
  const day = m[2] ? Number(m[2]) : 1;
  const iso = `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}
