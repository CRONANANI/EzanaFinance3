/**
 * The Hive insights, pure (tested by scripts/check-ezana-api-hive.mjs).
 *
 * Cross-venue matching: the same question listed on Polymarket and Kalshi.
 * Titles are normalized (lower-case, punctuation stripped, stop-words and
 * one-letter tokens removed) and compared by trigram similarity, the same
 * measure as Postgres pg_trgm's similarity(): each word is padded with two
 * spaces in front and one behind, cut into 3-character grams, and the score
 * is shared grams over all distinct grams of the two titles (0 to 1).
 */

const STOP = new Set(
  'a an and are as at be before by does election elections for from has have how in into is it its of on or over than that the their this to under vs was what when which who will with within won wins win winner winners s'.split(
    ' ',
  ),
);

/** Lower-case, strip punctuation, drop stop-words and one-letter tokens. */
export function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 1 && !STOP.has(w))
    .join(' ');
}

/** pg_trgm-style trigrams of an already-normalized string. */
export function trigrams(norm) {
  const out = new Set();
  for (const w of String(norm).split(' ')) {
    if (!w) continue;
    const padded = `  ${w} `;
    for (let i = 0; i + 3 <= padded.length; i += 1) out.add(padded.slice(i, i + 3));
  }
  return out;
}

/** pg_trgm similarity of two trigram sets (0 to 1). */
export function trigramSimilarity(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const g of small) if (big.has(g)) shared += 1;
  return shared / (a.size + b.size - shared);
}

const YEAR = /^(19|20)\d\d$/;

/**
 * What a title is matched on: its words (for similarity) plus two guards.
 * Years don't count toward similarity ("House 2026" and "U.S. House" are
 * the same race), but two titles that both name years must share one.
 * Codes with digits (districts like "sc 01", "tx 23") must be equal when both
 * titles carry them, so SC-01 never pairs with SC-07.
 */
export function titleKey(title) {
  const toks = normalizeTitle(title).split(' ').filter(Boolean);
  const years = new Set(toks.filter((t) => YEAR.test(t)));
  const codes = new Set(toks.filter((t) => /\d/.test(t) && !YEAR.test(t)));
  /* District codes keep their state: "CA-15" and "TX-15" are different races. */
  for (const m of String(title || '').matchAll(/\b([A-Za-z]{2})-(\d{1,2})\b/g)) {
    codes.add(`${m[1].toLowerCase()}${m[2].padStart(2, '0')}`);
  }
  const words = toks.filter((t) => !YEAR.test(t));
  return { grams: trigrams(words.join(' ')), years, codes };
}

const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const overlaps = (a, b) => [...a].some((x) => b.has(x));

/** Whether two titleKeys may match at all (the year and code guards). */
export function compatible(a, b) {
  if (a.years.size && b.years.size && !overlaps(a.years, b.years)) return false;
  if (a.codes.size && b.codes.size && !sameSet(a.codes, b.codes)) return false;
  return true;
}

/** Candidate floor: pairs below this are never considered. */
export const CROSS_VENUE_FLOOR = 0.6;

/**
 * Pair Polymarket events with Kalshi events by title similarity. Each event
 * joins at most one pair (best score first). Events: { key, title, ... }.
 * Returns [{ poly, kalshi, similarity }] with similarity >= minSimilarity
 * (never below CROSS_VENUE_FLOOR), best first.
 */
export function matchEvents(polyEvents, kalshiEvents, minSimilarity = 0.75) {
  const bar = Math.max(CROSS_VENUE_FLOOR, minSimilarity);
  const prep = (e) => ({ e, t: titleKey(e.title) });
  const P = polyEvents.map(prep).filter((x) => x.t.grams.size);
  const K = kalshiEvents.map(prep).filter((x) => x.t.grams.size);
  const cands = [];
  for (const p of P) {
    for (const k of K) {
      if (!compatible(p.t, k.t)) continue;
      const s = trigramSimilarity(p.t.grams, k.t.grams);
      if (s >= bar) cands.push({ p: p.e, k: k.e, s });
    }
  }
  cands.sort((x, y) => y.s - x.s || String(x.p.key).localeCompare(String(y.p.key)));
  const usedP = new Set();
  const usedK = new Set();
  const out = [];
  for (const c of cands) {
    if (usedP.has(c.p.key) || usedK.has(c.k.key)) continue;
    usedP.add(c.p.key);
    usedK.add(c.k.key);
    out.push({ poly: c.p, kalshi: c.k, similarity: Math.round(c.s * 1000) / 1000 });
  }
  return out;
}

const normLabel = (s) => normalizeTitle(s);

/**
 * What to compare inside a matched pair. When both events list an outcome
 * with the same (normalized) label, compare that outcome on each venue,
 * picking the shared outcome the venues price highest; otherwise compare
 * each venue's leading outcome. Outcomes: [{ id, outcome, probability }].
 */
export function compareOutcomes(polyOutcomes, kalshiOutcomes) {
  const byLabel = new Map();
  for (const o of kalshiOutcomes || []) {
    const l = normLabel(o.outcome);
    if (l && Number.isFinite(o.probability) && !byLabel.has(l)) byLabel.set(l, o);
  }
  let best = null;
  for (const p of polyOutcomes || []) {
    const k = byLabel.get(normLabel(p.outcome));
    if (!k || !Number.isFinite(p.probability)) continue;
    const weight = p.probability + k.probability;
    if (!best || weight > best.weight) best = { poly: p, kalshi: k, weight };
  }
  if (best) return { matched_on: 'outcome', poly: best.poly, kalshi: best.kalshi };
  const lead = (list) =>
    (list || [])
      .filter((o) => Number.isFinite(o.probability))
      .sort((a, b) => b.probability - a.probability)[0] || null;
  const p = lead(polyOutcomes);
  const k = lead(kalshiOutcomes);
  return p && k ? { matched_on: 'leader', poly: p, kalshi: k } : null;
}
