/**
 * Semantic family matching (Nov 2026): cosine similarity between the query embedding and
 * each query family's exemplar questions (intent.js QUERY_FAMILIES), through the existing
 * cached gte-small embedder. Used by standard and deep research only, under a short time
 * cap; a quick ping never waits on it.
 *
 * The score is one signal among three (intent.js): a high similarity can raise a family
 * the cue words already found, and only a very close exemplar can suggest one on its own.
 * Nearest-neighbour similarity never decides the analysis by itself.
 *
 * `embed` is injected (text -> number[] | null) so this file has no I/O of its own.
 */
import { QUERY_FAMILIES } from './intent';

/** Cosine similarity of two equal-length vectors; 0 when either is missing. */
export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/* Exemplar vectors live for the life of the server instance: a few dozen short strings,
   embedded once, then read from memory. */
const exemplarCache = new Map();

async function exemplarVector(text, embed) {
  if (exemplarCache.has(text)) return exemplarCache.get(text);
  const p = Promise.resolve(embed(text)).catch(() => null);
  exemplarCache.set(text, p);
  const v = await p;
  if (!v) exemplarCache.delete(text);
  return v;
}

/**
 * Family id -> best cosine to one of its exemplars, or null when embedding is unavailable
 * or slower than `timeoutMs`.
 */
export async function semanticFamilyScores(query, { embed, timeoutMs = 600 } = {}) {
  if (typeof embed !== 'function' || !String(query || '').trim()) return null;
  const work = (async () => {
    const q = await Promise.resolve(embed(String(query))).catch(() => null);
    if (!q) return null;
    const out = {};
    for (const [id, fam] of Object.entries(QUERY_FAMILIES)) {
      const vecs = await Promise.all(fam.exemplars.map((x) => exemplarVector(x, embed)));
      const best = Math.max(0, ...vecs.filter(Boolean).map((v) => cosine(q, v)));
      if (best > 0) out[id] = +best.toFixed(3);
    }
    return Object.keys(out).length ? out : null;
  })();
  let timer = null;
  const cap = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    return await Promise.race([work, cap]);
  } finally {
    clearTimeout(timer);
  }
}

/** For tests: forget the exemplar vectors. */
export function resetSemanticCache() {
  exemplarCache.clear();
}
