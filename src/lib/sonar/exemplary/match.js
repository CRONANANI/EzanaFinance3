/**
 * Matching a ping to an exemplary brief. Pure and deterministic; no I/O.
 *
 * An exemplary brief answers ONE question. It may be served for that
 * question however it is typed ("huangs", "effect" for "affect", "stepping
 * down" for "resignation"), and for nothing else: "why did Jensen Huang
 * resign?" names the same event but asks something this brief does not
 * answer, so it must fall through to the live pipeline.
 *
 * Two gates, both required:
 *   1. concepts: every concept group of the brief has at least one of its
 *      words in the ping (the person AND the event, for example).
 *   2. similarity: the ping's content words overlap the brief's question, or
 *      one of its listed variants, by at least SERVE_AT (Jaccard on stemmed,
 *      alias-folded tokens with stop words removed).
 * A ping that passes gate 1 and scores between SEMANTIC_FROM and SERVE_AT is
 * "borderline": the server may settle it with an embedding comparison
 * (index.js); this module never serves it on its own.
 */

const SERVE_AT = 0.72;
const SEMANTIC_FROM = 0.4;

const STOP = new Set(
  `a an the of in on for about to and or with at by from into as is are was were be been will would
   could should can may might do does did has have had it its this that these those there their
   me my we our you your i please tell show give explain what how
   s now today currently going go`
    .split(/\s+/)
    .filter(Boolean),
);

/* Words folded to one form so paraphrases and common misspellings meet. */
const ALIAS = {
  effect: 'affect',
  effects: 'affect',
  affects: 'affect',
  affected: 'affect',
  impact: 'affect',
  impacts: 'affect',
  mean: 'affect',
  means: 'affect',
  happen: 'affect',
  happens: 'affect',
  resignation: 'resign',
  resigns: 'resign',
  resigned: 'resign',
  resigning: 'resign',
  stepping: 'resign',
  steps: 'resign',
  step: 'resign',
  stepped: 'resign',
  down: 'resign',
  quits: 'resign',
  quitting: 'resign',
  quit: 'resign',
  departure: 'resign',
  departs: 'resign',
  depart: 'resign',
  leaving: 'resign',
  leaves: 'resign',
  leave: 'resign',
  exit: 'resign',
  exits: 'resign',
  nvda: 'nvidia',
  huangs: 'huang',
  semiconductor: 'chip',
  semiconductors: 'chip',
  semis: 'chip',
  chips: 'chip',
  chipmaker: 'chip',
  chipmakers: 'chip',
  sector: 'industry',
  stocks: 'stock',
  shares: 'stock',
};

const stem = (t) => {
  if (ALIAS[t]) return ALIAS[t];
  if (t.length > 4 && t.endsWith('ies')) return `${t.slice(0, -3)}y`;
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) {
    const base = t.slice(0, -1);
    return ALIAS[base] || base;
  }
  return t;
};

/** The content words of a ping: lower-cased, possessives dropped, folded, stop words out. */
function contentTokens(text) {
  const out = new Set();
  for (const raw of String(text || '')
    .toLowerCase()
    .replace(/[’']s\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')) {
    if (!raw || STOP.has(raw)) continue;
    const t = stem(raw);
    if (t && !STOP.has(t)) out.add(t);
  }
  return out;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/** True when every concept group of the brief is named in the ping. */
function hasConcepts(tokens, concepts = {}) {
  return Object.values(concepts).every((words) =>
    (words || []).some((w) => tokens.has(stem(String(w).toLowerCase()))),
  );
}

/**
 * Score one ping against one brief.
 * @returns {{ concepts: boolean, score: number, tier: 'serve'|'borderline'|'none' }}
 */
export function scoreBrief(query, brief) {
  const tokens = contentTokens(query);
  const concepts = hasConcepts(tokens, brief.concepts);
  if (!concepts) return { concepts, score: 0, tier: 'none' };
  let score = 0;
  for (const text of [brief.question, ...(brief.variants || [])]) {
    score = Math.max(score, jaccard(tokens, contentTokens(text)));
  }
  const tier = score >= SERVE_AT ? 'serve' : score >= SEMANTIC_FROM ? 'borderline' : 'none';
  return { concepts, score, tier };
}

/** The best brief for a ping among `briefs`, or null when none passes the concept gate. */
export function bestBrief(query, briefs) {
  let best = null;
  for (const brief of briefs || []) {
    const s = scoreBrief(query, brief);
    if (s.tier === 'none') continue;
    if (!best || s.score > best.score) best = { brief, ...s };
  }
  return best;
}
