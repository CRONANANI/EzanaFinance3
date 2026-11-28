/**
 * Sonar 6.1 (Nov 28 2026): deterministic noisy variants of a benchmark question, for the
 * robustness half of the query-equivalence benchmark. No randomness: the same question
 * always yields the same variants, so a result can be reproduced.
 *
 *   lower      lower case, punctuation removed
 *   casual     a conversational opener ("hey can u tell me")
 *   filler     a trailing filler ("pls", "thanks")
 *   typo       two adjacent letters swapped in the longest lower-case word of 7+ letters
 *              (never a name: capitalised words, tickers and numbers are left alone)
 */
export function noisyVariants(q) {
  const out = [];
  const lower = String(q)
    .toLowerCase()
    .replace(/[?!.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  out.push(['lower', lower]);
  out.push([
    'casual',
    `hey can u tell me ${String(q).charAt(0).toLowerCase()}${String(q).slice(1)}`,
  ]);
  out.push(['filler', `${String(q).replace(/[?.!]\s*$/, '')} pls`]);
  const words = String(q).split(/(\s+)/);
  let idx = -1;
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (/^[a-z]{7,}$/.test(w) && (idx < 0 || w.length > words[idx].length)) idx = i;
  }
  if (idx >= 0) {
    const w = words[idx];
    const k = Math.floor(w.length / 2);
    words[idx] = w.slice(0, k - 1) + w[k] + w[k - 1] + w.slice(k + 1);
    out.push(['typo', words.join('')]);
  }
  return out;
}
