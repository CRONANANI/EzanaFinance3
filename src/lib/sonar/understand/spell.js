/**
 * Deterministic spell pass. A lower-case token that is neither a stopword nor
 * in the domain lexicon is corrected to the best lexicon candidate within
 * Damerau-Levenshtein distance 1 (tokens of 5 or fewer characters) or 2
 * (longer), scored by distance, a frequency prior and bigram context. Never
 * touches an all-caps token, a $TICKER, a number, a quoted phrase or a token
 * with internal dots (U.S.).
 */
import { BIGRAMS, FREQ, LEXICON, STOPWORDS } from '@/lib/sonar/understand/lexicons';

/** Damerau-Levenshtein, optimal string alignment. */
export function dl(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

const matchCase = (src, w) =>
  src[0] && src[0] === src[0].toUpperCase() && src[0] !== src[0].toLowerCase()
    ? w[0].toUpperCase() + w.slice(1)
    : w;

const protectedToken = (raw) =>
  /^\$/.test(raw) ||
  /^\d/.test(raw) ||
  /^[A-Z][A-Z0-9.&]{0,5}$/.test(raw) ||
  /^["']/.test(raw) ||
  /\./.test(raw);

export function correct(rawTokens) {
  const out = [...rawTokens];
  const corrections = [];
  rawTokens.forEach((raw, i) => {
    if (protectedToken(raw)) return;
    const w = raw.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length < 4 || STOPWORDS.has(w) || LEXICON.has(w)) return;
    const maxD = w.length <= 5 ? 1 : 2;
    let best = null;
    for (const cand of LEXICON) {
      if (Math.abs(cand.length - w.length) > maxD) continue;
      const dist = dl(w, cand);
      if (dist > maxD || dist === 0) continue;
      const prev = out[i - 1]?.toLowerCase();
      const next = out[i + 1]?.toLowerCase();
      const ctx = (BIGRAMS.get(`${prev} ${cand}`) || 0) + (BIGRAMS.get(`${cand} ${next}`) || 0);
      const score = -dist * 2 + Math.log1p(FREQ.get(cand) || 0) * 0.3 + ctx;
      if (!best || score > best.score) best = { word: cand, score };
    }
    if (best) {
      out[i] = matchCase(raw, best.word);
      corrections.push({ from: raw, to: out[i] });
    }
  });
  return { tokens: out, corrections };
}
