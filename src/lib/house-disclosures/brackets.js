/**
 * STOCK Act disclosure amount brackets. Congressional trades are disclosed as a
 * RANGE, never an exact figure — the source has brackets only. The midpoint here
 * is a LABELED ESTIMATE for sorting, never to be rendered as an exact amount.
 *
 * Pure/deterministic — unit-tested in scripts/check-brackets.mjs.
 */

export const AMOUNT_BRACKETS = [
  { label: '$1,001 - $15,000', low: 1001, high: 15000 },
  { label: '$15,001 - $50,000', low: 15001, high: 50000 },
  { label: '$50,001 - $100,000', low: 50001, high: 100000 },
  { label: '$100,001 - $250,000', low: 100001, high: 250000 },
  { label: '$250,001 - $500,000', low: 250001, high: 500000 },
  { label: '$500,001 - $1,000,000', low: 500001, high: 1000000 },
  { label: '$1,000,001 - $5,000,000', low: 1000001, high: 5000000 },
  { label: '$5,000,001 - $25,000,000', low: 5000001, high: 25000000 },
  { label: '$25,000,001 - $50,000,000', low: 25000001, high: 50000000 },
  { label: 'Over $50,000,000', low: 50000001, high: null },
];

/** Pull DOLLAR figures out of a string, in order. Requires a leading `$` so that
 *  date components (04/15/2026 → 04, 15, 2026) in a full transaction line are not
 *  mistaken for amounts. */
function dollarsIn(text) {
  const out = [];
  const re = /\$\s*([\d,]+)/g;
  let m;
  while ((m = re.exec(String(text || '')))) {
    const n = Number(m[1].replace(/,/g, ''));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/**
 * Resolve a filed amount string to a canonical bracket.
 * Returns { low, high, midpoint, label } or null. midpoint = high ? (low+high)/2 : low.
 * Matching is by the low bound (robust to spacing/currency/dash variations); an
 * open-ended "Over $50,000,000" is matched explicitly (its text figure is the
 * bracket's floor minus one, so a numeric match alone would miss it).
 */
export function matchBracket(text) {
  const s = String(text || '');

  // Open-ended top bracket: the filed text reads "Over $50,000,000".
  if (/over/i.test(s) && /\$\s*[\d,]+/.test(s)) {
    const b = AMOUNT_BRACKETS[AMOUNT_BRACKETS.length - 1];
    return { low: b.low, high: b.high, midpoint: b.low, label: b.label };
  }

  const nums = dollarsIn(s);
  if (!nums.length) return null;

  const low = nums[0];
  // Exact low-bound match against the canonical set first.
  let b = AMOUNT_BRACKETS.find((x) => x.low === low);
  // Fallback: the low value falls within a bracket's [low, high] span.
  if (!b) {
    b = AMOUNT_BRACKETS.find((x) => low >= x.low && (x.high == null || low <= x.high));
  }
  if (!b) return null;

  const midpoint = b.high != null ? (b.low + b.high) / 2 : b.low;
  return { low: b.low, high: b.high, midpoint, label: b.label };
}
