/**
 * Deterministic spell pass. A lower-case token that is neither a stopword nor
 * in the domain lexicon is corrected to the best lexicon candidate within
 * Damerau-Levenshtein distance 1 (tokens of 5 or fewer characters) or 2
 * (longer), scored by distance, a frequency prior and bigram context. Never
 * touches an all-caps token, a $TICKER, a number, a quoted phrase or a token
 * with internal dots (U.S.).
 */
import { BIGRAMS, FREQ, GEO_LEXICON, LEXICON, STOPWORDS } from '@/lib/sonar/understand/lexicons';
import { REAL_WORDS } from '@/lib/sonar/understand/real-words';

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

/* A demonym or adjective built on a place name ("Indian" on India,
   "Canadian" on Canada, "German" on Germany, "Mexican" on Mexico) is a real
   word, not a typo. The token is still read as the place, so the country
   resolves, but it is returned as a reading rather than a correction, and
   the UI never offers "Search instead for" the words the visitor typed
   correctly. The stem drops one trailing vowel or y from the place name;
   what follows the stem must be a demonym ending. */
/* "e" covers Argentine (Argentina), added Oct 27. */
const DEMONYM_TAIL = /^(?:n|an|ian|ese|ish|i|e)?$/;
export function isDerivedPlaceWord(word, candidate) {
  if (!GEO_LEXICON.has(candidate)) return false;
  const stem = candidate.replace(/[aeiouy]$/, '');
  return stem.length >= 4 && word.startsWith(stem) && DEMONYM_TAIL.test(word.slice(stem.length));
}

export function correct(rawTokens) {
  const out = [...rawTokens];
  const corrections = [];
  const readings = [];
  rawTokens.forEach((raw, i) => {
    if (protectedToken(raw)) return;
    const w = raw.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length < 4 || STOPWORDS.has(w) || LEXICON.has(w)) return;
    /* A real English word is not a typo (Oct 27): leave it as typed. The set
       holds only the real words this pass would otherwise rewrite. */
    if (REAL_WORDS.has(w)) return;
    const maxD = w.length <= 5 ? 1 : 2;
    let best = null;
    for (const cand of LEXICON) {
      if (Math.abs(cand.length - w.length) > maxD) continue;
      /* Oct 27: a correction keeps the first letter. Real typos almost always
         do ("lyout", "canda", "compnies"); without this, real words were
         snapped to the nearest finance term (winning->mining, fourth->south,
         running->ranking, hiring->mining), turning a question about India's
         election into a mining-industry ping. */
      if (cand[0] !== w[0]) continue;
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
      if (isDerivedPlaceWord(w, best.word)) readings.push({ from: raw, to: out[i] });
      else corrections.push({ from: raw, to: out[i] });
    }
  });
  return { tokens: out, corrections, readings };
}
