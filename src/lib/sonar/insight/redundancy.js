/**
 * Cross-component redundancy (Nov 2026): does a claim say again what the executive answer,
 * a KPI tile, a chart title or another finding already says? Structured first (the same
 * figures, the same entities, the same metric ids), then wording. Pure.
 *
 * A high score only marks a pair for the caller to act on: a finding that restates the
 * answer moves to supporting facts, it is never silently lost. Some repetition is useful
 * (a citation, a figure the reader needs nearby); this flags repeated conclusions.
 *
 * An optional `semantic(a, b)` similarity (0..1, from embeddings) raises a borderline pair
 * for the structured check; it never removes anything on its own.
 */

const STOP = new Set(
  'the a an of in on for to and or is are was were has have had its it this that these those by with from at as than then be been being over under into per about after before more most less least first second third ranks rank ranked ranking leads leading led top'.split(
    ' ',
  ),
);

/** Figures in a text, normalized: "13,791.9" -> 13791.9, "44%" -> 44. */
export function figuresOf(text) {
  const out = new Set();
  for (const m of String(text || '').matchAll(/[-−]?\d[\d,]*(?:\.\d+)?/g)) {
    const v = Number(m[0].replace(/[,−]/g, (c) => (c === '−' ? '-' : '')));
    /* Years and single digits say little about sameness. */
    if (!Number.isFinite(v) || (Number.isInteger(v) && v >= 1900 && v <= 2100)) continue;
    if (Math.abs(v) < 10 && Number.isInteger(v)) continue;
    out.add(+v.toFixed(1));
  }
  return out;
}

/** Proper names in a text (a capitalised run not at the start of a sentence counts too). */
export function namesOf(text) {
  const out = new Set();
  for (const m of String(text || '').matchAll(
    /\b([A-Z][a-zA-Z.&'-]+(?:\s+[A-Z][a-zA-Z.&'-]+)*)/g,
  )) {
    const n = m[1].toLowerCase();
    if (!STOP.has(n) && n.length > 1) out.add(n);
  }
  return out;
}

export function tokensOf(text) {
  return new Set(
    (
      String(text || '')
        .toLowerCase()
        .match(/[a-z][a-z'-]+/g) || []
    )
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map((w) => w.replace(/(ies|es|s)$/, (s) => (s === 'ies' ? 'y' : ''))),
  );
}

const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
};
const overlap = (a, b) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / Math.min(a.size, b.size);
};

/** A claim's comparable parts. `c` is a string or a finding-like object. */
export function signature(c) {
  const text =
    typeof c === 'string'
      ? c
      : [c?.title, c?.explanation, c?.text, c?.label, c?.value, c?.comparison]
          .filter(Boolean)
          .join(' ');
  return {
    text,
    figures: figuresOf(text),
    names: namesOf(text),
    tokens: tokensOf(text),
    metrics: new Set((typeof c === 'object' && c?.metrics) || []),
    insight: (typeof c === 'object' && c?.insight) || null,
  };
}

/**
 * Similarity of two claims in 0..1 and why. Same insight kind or two shared figures with a
 * shared name count as structurally the same claim.
 */
export function similarity(a, b, { semantic = null } = {}) {
  const A = a?.figures ? a : signature(a);
  const B = b?.figures ? b : signature(b);
  const fig = overlap(A.figures, B.figures);
  const sharedFigures = [...A.figures].filter((x) => B.figures.has(x)).length;
  const names = overlap(A.names, B.names);
  const words = jaccard(A.tokens, B.tokens);
  const metric = overlap(A.metrics, B.metrics);
  let score = 0.35 * fig + 0.2 * names + 0.35 * words + 0.1 * metric;
  const reasons = [];
  if (sharedFigures >= 2 && names > 0) {
    score = Math.max(score, 0.75);
    reasons.push('same_figures');
  }
  if (A.insight && A.insight === B.insight) {
    score = Math.max(score, 0.9);
    reasons.push('same_insight');
  }
  if (metric >= 1 && A.metrics.size && A.metrics.size === B.metrics.size) {
    score = Math.max(score, 0.7);
    reasons.push('same_metrics');
  }
  if (typeof semantic === 'function' && score >= 0.3 && score < 0.6) {
    const s = Number(semantic(A.text, B.text));
    /* Embedding similarity only escalates to the structured threshold when names or
       figures already agree; wording alone never makes two claims the same. */
    if (s >= 0.9 && (names > 0 || fig > 0)) {
      score = 0.6;
      reasons.push('semantic');
    }
  }
  return { score: +score.toFixed(3), reasons };
}

export const RESTATE_THRESHOLD = 0.6;

/**
 * Does `claim` restate any of `refs` ({ kind, value } items: conclusion, kpi, chart,
 * finding)? -> { restates: bool, of: kind|null, score }
 */
export function restates(claim, refs = [], opts = {}) {
  const sig = signature(claim);
  let best = { restates: false, of: null, score: 0, reasons: [] };
  for (const r of refs) {
    if (!r?.value) continue;
    const s = similarity(sig, signature(r.value), opts);
    if (s.score > best.score)
      best = { restates: false, of: r.kind, score: s.score, reasons: s.reasons };
  }
  best.restates = best.score >= RESTATE_THRESHOLD;
  return best;
}

/**
 * A ranking restatement: the claim names the leader in ranking words and adds no
 * comparison beyond the order. "The United States ranks first in crude oil production."
 */
export function isRankRestatement(claim, leader) {
  if (!leader) return false;
  const text =
    typeof claim === 'string' ? claim : `${claim?.title || ''} ${claim?.explanation || ''}`;
  const t = text.toLowerCase();
  if (!t.includes(String(leader).toLowerCase())) return false;
  const rankWords =
    /\b(ranks? first|leads?|largest|biggest|top (?:producer|spot)|number one|followed by|1\.\s)/i;
  const analysis =
    /\b(share|concentrat\w*|percent of|% of|compared|versus|than (?:in|a year|the)|since|grew|fell|rose|declin\w*|chang\w*|while|despite|whereas)\b/i;
  return rankWords.test(t) && !analysis.test(t);
}
