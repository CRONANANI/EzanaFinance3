/**
 * Sonar research engine: the evidence model, scoring and packing
 * (engine v3, Section 4.3).
 *
 * Every evidence item, whatever produced it, becomes one shape with a stable
 * id, its source and category, reporting date or period, retrieval time, the
 * entities it names, any structured data and the numbers it states. Each item
 * is scored on nine components against the research spec, and the prompt is
 * packed greedily by marginal value (score minus redundancy) under item and
 * character budgets. No corpus is forced in: an irrelevant dataset simply
 * scores low and is left out, with the reason recorded.
 *
 * Pure and client-safe. Unit-tested in scripts/check-sonar-engine.mjs.
 */
import { SOURCES } from './domains';

/* FNV-1a, 32 bit, base 36: a stable short id without a crypto import. */
export function hashId(s) {
  let h = 0x811c9dc5;
  const str = String(s);
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

const STOP = new Set(
  'a an the and or but of to in on at by for with from into over under about as is are was were be been being do does did has have had will would should could can may might what which who whom whose how why when where this that these those it its their there here most more than then also very just any all some each other such not no'.split(
    ' ',
  ),
);

/** Content terms of a text, lower case, no stopwords. */
export function termsOf(text) {
  return [
    ...new Set(
      String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9$%. ]+/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2 && !STOP.has(t)),
    ),
  ];
}

/** Numbers a text states, normalised to plain values (3.2B -> 3200000000). */
export function numbersOf(text) {
  const out = [];
  const re =
    /(-?\$?\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\$?\s?\d+(?:\.\d+)?)\s?(%|percent|[KMBT]\b|thousand|million|billion|trillion)?/gi;
  for (const m of String(text || '').matchAll(re)) {
    const raw = m[1].replace(/[$,\s]/g, '');
    let v = Number(raw);
    if (!Number.isFinite(v)) continue;
    const unit = String(m[2] || '').toLowerCase();
    const mult = {
      k: 1e3,
      thousand: 1e3,
      m: 1e6,
      million: 1e6,
      b: 1e9,
      billion: 1e9,
      t: 1e12,
      trillion: 1e12,
    }[unit];
    if (mult) v *= mult;
    out.push({ value: v, pct: unit === '%' || unit === 'percent', text: m[0].trim() });
  }
  return out;
}

/**
 * Normalise a producer's raw item into the evidence shape.
 * @param {object} raw { title, snippet|text, url, date, period, data, entities, similarity, kind }
 * @param {{ source: string, retrievedAt?: string, historical?: object }} ctx
 */
export function toEvidence(
  raw,
  { source, retrievedAt = new Date().toISOString(), historical = null },
) {
  const meta = SOURCES[source] || { category: 'supporting_research', reliability: 0.5 };
  const text = String(raw.text || raw.snippet || '').trim();
  const title = String(raw.title || '').trim();
  const key = `${source}|${raw.url || ''}|${title}|${text.slice(0, 160)}`;
  return {
    id: `ev_${hashId(key)}`,
    source,
    category: raw.category || meta.category,
    reliability: raw.reliability ?? meta.reliability,
    kind: raw.kind || (raw.data ? 'aggregate' : raw.url ? 'article' : 'record'),
    title,
    text,
    url: typeof raw.url === 'string' && /^https?:\/\//.test(raw.url) ? raw.url : null,
    date: raw.date ? String(raw.date).slice(0, 10) : null,
    period: raw.period || null,
    retrievedAt,
    entities: [...new Set((raw.entities || []).map(String))],
    data: raw.data ?? null,
    numbers: numbersOf(`${title} ${text}`),
    similarity: Number.isFinite(raw.similarity) ? raw.similarity : null,
    historical,
  };
}

export const SCORE_WEIGHTS = {
  relevance: 0.22,
  entityMatch: 0.2,
  objectiveMatch: 0.12,
  reliability: 0.12,
  temporal: 0.08,
  specificity: 0.1,
  completeness: 0.04,
  recency: 0.06,
  relationship: 0.06,
};

/* The metric each source speaks to (for objective match). */
const SOURCE_METRIC = {
  lobbying_leaders: 'lobbying_spend',
  lobbying_company: 'lobbying_spend',
  congress_sector: 'trade_count',
  congress_company: 'trade_count',
  politician_dossier: 'trade_count',
  contracts_history: 'contract_obligations',
  institutional_13f: 'holdings_value',
  revenue_geo: 'revenue_by_region',
  price_performance: 'price_change',
  commodity_series: 'price_change',
  market_snapshot: 'price_change',
  analysts: 'analyst_targets',
};

const daysBetween = (a, b) => Math.abs(new Date(a) - new Date(b)) / 864e5;

/**
 * Score one evidence item against the spec. Returns the components and the
 * weighted total, so the selection can be explained.
 * @param {object} e   toEvidence() output
 * @param {object} spec
 * @param {{ subjectTerms?: string[], universe?: string[], now?: Date, weights?: object }} ctx
 */
export function scoreEvidence(
  e,
  spec,
  { subjectTerms = [], universe = [], now = new Date(), weights = SCORE_WEIGHTS } = {},
) {
  const hay = `${e.title} ${e.text} ${e.entities.join(' ')}`.toLowerCase();
  const qTerms = termsOf(spec.rawQuery || spec.question);
  const hit = qTerms.filter((t) => hay.includes(t)).length;
  const lexical = qTerms.length ? hit / qTerms.length : 0;
  const relevance = Math.min(1, Math.max(lexical, e.similarity ?? 0) + (e.similarity ? 0.1 : 0));

  const wordRe = (t) =>
    new RegExp(
      `(^|[^a-z0-9])${t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`,
    );
  const subj = subjectTerms.filter(Boolean);
  const entityMatch = subj.some((t) => wordRe(t).test(hay))
    ? 1
    : universe.some((t) => t && wordRe(t).test(hay))
      ? 0.7
      : e.kind === 'aggregate'
        ? 0.5
        : 0;

  const metric = SOURCE_METRIC[e.source];
  const objectiveMatch = metric && (spec.metrics || []).includes(metric) ? 1 : metric ? 0.5 : 0.3;

  const h = spec.timeHorizon || {};
  const ref = e.period?.to || e.date;
  const age = ref ? daysBetween(ref, now) : null;
  const windowDays = (h.months || 12) * 30.5;
  const temporal =
    age == null
      ? 0.6
      : age <= windowDays
        ? 1
        : Math.max(0, 1 - (age - windowDays) / (windowDays * 2));
  const recency = age == null ? (e.kind === 'aggregate' ? 0.8 : 0.4) : Math.pow(0.5, age / 180);

  const specificity =
    e.data || e.numbers.length >= 2 ? 1 : e.numbers.length ? 0.7 : e.text.length > 80 ? 0.5 : 0.2;
  const completeness =
    [e.url || e.kind !== 'article', e.date || e.period, e.text.length > 40].filter(Boolean).length /
    3;
  const relationship = (spec.relationships || []).length && e.entities.length >= 2 ? 1 : 0;

  const components = {
    relevance,
    entityMatch,
    objectiveMatch,
    reliability: e.reliability,
    temporal,
    specificity,
    completeness,
    recency,
    relationship,
  };
  let score = 0;
  for (const [k, w] of Object.entries(weights)) score += w * (components[k] ?? 0);
  /* Historical evidence (research memory) never outranks fresh evidence of
     the same strength: it is a candidate, discounted. */
  if (e.historical) score *= 0.85;
  return { score: Number(score.toFixed(4)), components };
}

function redundancy(a, b) {
  /* Records about different entities are not redundant, however alike their
     wording (template-built rows share most of their words). */
  if (a.entities.length && b.entities.length && !a.entities.some((x) => b.entities.includes(x))) {
    return a.source === b.source ? 0.1 : 0;
  }
  const ta = new Set(termsOf(`${a.title} ${a.text}`));
  const tb = termsOf(`${b.title} ${b.text}`);
  const inter = tb.filter((t) => ta.has(t)).length;
  const jac = inter / Math.max(1, ta.size + tb.length - inter);
  return (a.source === b.source ? 0.25 : 0) + 0.75 * jac;
}

/**
 * Select the strongest, most diverse evidence under the budgets.
 * @param {Array<{ evidence: object, score: number, components: object }>} scored
 * @param {{ maxItems?: number, maxChars?: number, minScore?: number, lambda?: number }} opts
 * @returns {{ selected: Array, decisions: Array<{ id, source, score, selected, reason }> }}
 */
export function packEvidence(
  scored,
  { maxItems = 12, maxChars = 6000, minScore = 0.3, lambda = 0.35 } = {},
) {
  const pool = [...scored].sort((a, b) => b.score - a.score);
  const selected = [];
  const decisions = [];
  let chars = 0;
  const remaining = new Set(pool);
  while (remaining.size && selected.length < maxItems) {
    let best = null;
    let bestVal = -Infinity;
    for (const c of remaining) {
      const red = selected.length
        ? Math.max(...selected.map((s) => redundancy(s.evidence, c.evidence)))
        : 0;
      const val = c.score - lambda * red;
      if (val > bestVal) {
        bestVal = val;
        best = { c, red };
      }
    }
    remaining.delete(best.c);
    const len = best.c.evidence.text.length + best.c.evidence.title.length;
    if (best.c.score < minScore) {
      decisions.push({
        id: best.c.evidence.id,
        source: best.c.evidence.source,
        score: best.c.score,
        selected: false,
        reason: 'below_min_score',
      });
      continue;
    }
    if (best.red > 0.7) {
      decisions.push({
        id: best.c.evidence.id,
        source: best.c.evidence.source,
        score: best.c.score,
        selected: false,
        reason: 'redundant',
      });
      continue;
    }
    if (chars + len > maxChars && selected.length) {
      decisions.push({
        id: best.c.evidence.id,
        source: best.c.evidence.source,
        score: best.c.score,
        selected: false,
        reason: 'char_budget',
      });
      continue;
    }
    chars += len;
    const top = Object.entries(best.c.components)
      .sort((a, b) => b[1] * (SCORE_WEIGHTS[b[0]] || 0) - a[1] * (SCORE_WEIGHTS[a[0]] || 0))
      .slice(0, 3)
      .map(([k]) => k);
    selected.push({ ...best.c, why: top });
    decisions.push({
      id: best.c.evidence.id,
      source: best.c.evidence.source,
      score: best.c.score,
      selected: true,
      reason: `top:${top.join(',')}`,
    });
  }
  for (const c of remaining) {
    decisions.push({
      id: c.evidence.id,
      source: c.evidence.source,
      score: c.score,
      selected: false,
      reason: 'item_budget',
    });
  }
  return { selected, decisions };
}

/** Markers for the prompt and the UI: S1..Sn in packed order. */
export function withMarkers(selected) {
  return selected.map((s, i) => ({
    ...s.evidence,
    marker: `S${i + 1}`,
    score: s.score,
    why: s.why,
  }));
}
