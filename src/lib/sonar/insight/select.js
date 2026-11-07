/**
 * Insight scoring and selection (Nov 2026). A key finding has to add something to the
 * answer: an observation with a comparison, an interpretation, why it matters, and its
 * evidence. Every candidate (the model's validated findings and the deterministic ones in
 * derived.js) is gated, scored and either kept as a key finding, moved to supporting facts
 * (a true but descriptive fact that belongs in a chart, a KPI or the evidence), or rejected.
 *
 * Hard gates run first, and a high score never rescues a candidate that fails one:
 *   removed by the claim validator, entity mismatch   -> rejected
 *   cites only background or irrelevant records       -> supporting
 *   restates the executive answer, a KPI, a chart
 *   title, the ranking, or a stronger finding        -> supporting
 *
 * Score (initial design weights, to be calibrated against the regression set; never shown
 * to readers):
 *   relevance to the question 30%, incremental insight 25%, evidence quality 20%,
 *   comparative or analytical depth 15%, decision usefulness 10%.
 *
 * There is no quota: the strongest findings that clear the bar are kept, up to a cap per
 * depth (quick 3, standard 5, deep 6). Two or three good findings beat six repetitive ones.
 * At most one "not established" finding is kept, and it goes last. Pure.
 */
import {
  signature,
  similarity,
  restates,
  isRankRestatement,
  figuresOf,
  RESTATE_THRESHOLD,
} from './redundancy';
import { RELEVANCE_WEIGHT } from './relevance';
import { measuresOf } from './intent';

export const SELECT_VERSION = 'select-v1';

export const INSIGHT_WEIGHTS = {
  relevance: 0.3,
  incremental: 0.25,
  evidence: 0.2,
  depth: 0.15,
  usefulness: 0.1,
};

export const DEPTH_CAPS = { quick: 3, standard: 5, deep: 6 };
export const KEEP_SCORE = 0.5;

const CLASS_QUALITY = {
  verified_fact: 1,
  calculated_result: 0.95,
  analytical_interpretation: 0.75,
  hypothesis: 0.5,
  unknown: 0.6,
};

/* Insight kinds that answer each objective directly. */
const OBJECTIVE_INSIGHTS = {
  ranking: ['concentration'],
  concentration: ['concentration', 'missing_history'],
  trend: ['trend_pace', 'depreciation_pace', 'missing_history'],
  risk_assessment: [
    'nominal_vs_real',
    'policy_vs_inflation',
    'depreciation_pace',
    'inflation_fx',
    'missing_evidence',
  ],
  macro_vulnerability: ['missing_evidence', 'policy_vs_inflation', 'nominal_vs_real'],
};

const DEPTH_RE =
  /\b(than|versus|vs\.?|compared|against|relative|while|despite|whereas|share|percent of|% of|ratio|spread|percentile|pace|annualised|annualized|faster|slower|accelerat\w*|decelerat\w*|concentrat\w*|gap|outpac\w*|lagg\w*|since|over (?:the )?(?:year|three|five|\d+))\b/i;
const USE_RE =
  /\b(means|suggests|implies|matters|so that|which (?:leaves|raises|lowers|erodes|limits)|risk|exposure|cannot|uncertain\w*|depends|signal|pattern)\b/i;

const textOf = (c) =>
  [c?.title, c?.explanation, c?.text, c?.comparison, c?.implication].filter(Boolean).join(' ');

/** Relevance of a candidate to the question: 0..1, with the reasons. */
export function relevanceOf(c, intent) {
  if (!intent) return { value: 0.7, reasons: ['no_intent'] };
  const t = textOf(c).toLowerCase();
  const reasons = [];
  let v = 0.4;
  const terms = intent.focusTerms || [];
  const hits = terms.filter((w) => t.includes(w)).length;
  if (terms.length) v += 0.35 * Math.min(1, hits / Math.max(2, Math.ceil(terms.length / 2)));
  if (c.insight && (OBJECTIVE_INSIGHTS[intent.primary] || []).includes(c.insight)) {
    v += 0.35;
    reasons.push('answers_objective');
  } else if (
    c.insight &&
    intent.objectives.some((o) => (OBJECTIVE_INSIGHTS[o] || []).includes(c.insight))
  ) {
    v += 0.2;
    reasons.push('answers_secondary');
  }
  /* A finding about another measure (price on a production question) is context. */
  const asked = intent.measure;
  const own = measuresOf(t);
  /* A finding built for the question's own objective (inflation and the policy rate on a
     currency question) is not "another measure", it is one of the question's dimensions. */
  const answers = reasons.includes('answers_objective') || reasons.includes('answers_secondary');
  if (asked && own.length && !own.includes(asked) && !answers) {
    v -= 0.3;
    reasons.push(`other_measure:${own[0]}`);
  }
  return { value: Math.max(0, Math.min(1, v)), reasons };
}

/** Evidence quality: classification, citations and the relevance of what is cited. */
export function evidenceOf(c, byMarker = new Map()) {
  const q = CLASS_QUALITY[c.classification] ?? 0.6;
  const cited = (c.markers || [])
    .map((m) => byMarker.get(String(m).replace(/[[\]]/g, '')))
    .filter(Boolean);
  const rel = cited.length
    ? Math.max(...cited.map((e) => RELEVANCE_WEIGHT[e.relevance] ?? 0.8))
    : (c.metrics || []).length || c.derived
      ? 0.9
      : c.classification === 'unknown'
        ? 0.8
        : 0.3;
  const downgraded = c.validation?.action === 'downgraded' ? 0.15 : 0;
  return { value: Math.max(0, q * 0.6 + rel * 0.4 - downgraded), cited };
}

/**
 * Score one candidate against the question and everything already on the page.
 * refs: [{ kind: 'conclusion'|'kpi'|'chart'|'bullet', value: string }]
 */
export function scoreCandidate(
  c,
  { intent = null, refs = [], kept = [], byMarker = new Map() } = {},
) {
  const rel = relevanceOf(c, intent);
  const ev = evidenceOf(c, byMarker);
  let pageDup = restates(c, refs);
  const sig = signature(c);
  /* A finding that quotes figures already on the page but computes a new one from them
     (the policy rate and inflation tiles, and the spread between them) adds information:
     it is not a restatement, though the overlap still costs some of its incremental score. */
  if (pageDup.restates && c.insight) {
    const onPage = new Set(refs.flatMap((r) => [...figuresOf(r.value)]));
    const novel = [...figuresOf(c.comparison || '')].filter((x) => !onPage.has(x));
    if (novel.length) pageDup = { ...pageDup, restates: false, score: pageDup.score * 0.5 };
  }
  const peerDup = kept.reduce((m, k) => Math.max(m, similarity(sig, signature(k)).score), 0);
  const incremental = Math.max(0, 1 - Math.max(pageDup.score, peerDup));
  const t = textOf(c);
  const depth =
    c.insight && c.insight !== 'missing_evidence' && c.insight !== 'missing_history'
      ? 1
      : DEPTH_RE.test(t)
        ? 0.75
        : 0.25;
  const usefulness = (c.implication ? 0.5 : 0) + (c.caveat ? 0.2 : 0) + (USE_RE.test(t) ? 0.3 : 0);
  const parts = {
    relevance: rel.value,
    incremental,
    evidence: ev.value,
    depth,
    usefulness: Math.min(1, usefulness),
  };
  const score = Object.entries(INSIGHT_WEIGHTS).reduce((s, [k, w]) => s + w * parts[k], 0);
  return {
    score: +score.toFixed(3),
    parts,
    reasons: rel.reasons,
    restates: pageDup.restates ? pageDup.of : peerDup >= RESTATE_THRESHOLD ? 'finding' : null,
    cited: ev.cited,
  };
}

/**
 * Select the key findings.
 * @param {object[]} candidates  validated findings (model and derived), each with id, title,
 *   explanation, classification, markers, metrics, validation, optional insight /
 *   implication / caveat / gap
 * @param {{ intent, conclusion, kpis, charts, bullets, leader, evidence, depth }} ctx
 *   conclusion: the executive answer text; kpis/charts/bullets: strings on the page;
 *   leader: the ranking's first row label; evidence: marked records (with relevance).
 * -> { keyFindings, supporting, rejected, diagnostics }
 */
export function selectFindings(candidates = [], ctx = {}) {
  const {
    intent = null,
    conclusion = '',
    kpis = [],
    charts = [],
    bullets = [],
    leader = null,
    evidence = [],
    depth = 'standard',
  } = ctx;
  const byMarker = new Map((evidence || []).map((e) => [e.marker, e]));
  const refs = [
    conclusion ? { kind: 'conclusion', value: conclusion } : null,
    ...kpis.map((v) => ({ kind: 'kpi', value: v })),
    ...charts.map((v) => ({ kind: 'chart', value: v })),
    ...bullets.map((v) => ({ kind: 'bullet', value: v })),
  ].filter(Boolean);
  const cap = ctx.cap || DEPTH_CAPS[depth] || DEPTH_CAPS.standard;
  const supporting = [];
  const rejected = [];
  const diagnostics = [];

  /* Gates. */
  const eligible = [];
  for (const c of candidates || []) {
    if (!c || !(c.title || c.explanation || c.text)) continue;
    const problems = c.validation?.problems || [];
    if (c.validation?.action === 'removed' || problems.includes('entity_mismatch')) {
      rejected.push(c);
      diagnostics.push({ id: c.id, decision: 'rejected', gate: 'grounding' });
      continue;
    }
    if (isRankRestatement(c, leader)) {
      supporting.push({ ...c, placement: 'ranking' });
      diagnostics.push({ id: c.id, decision: 'supporting', gate: 'restates_ranking' });
      continue;
    }
    const cited = (c.markers || [])
      .map((m) => byMarker.get(String(m).replace(/[[\]]/g, '')))
      .filter(Boolean);
    if (
      cited.length &&
      !c.metrics?.length &&
      cited.every((e) => e.relevance === 'background' || e.relevance === 'irrelevant')
    ) {
      supporting.push({ ...c, placement: 'evidence' });
      diagnostics.push({ id: c.id, decision: 'supporting', gate: 'background_evidence' });
      continue;
    }
    eligible.push(c);
  }

  /* Greedy selection: score against the page and what is already kept, best first. */
  const kept = [];
  const pool = eligible.map((c) => ({ c, s: scoreCandidate(c, { intent, refs, byMarker }) }));
  let gapKept = false;
  while (pool.length) {
    for (const p of pool) p.s = scoreCandidate(p.c, { intent, refs, kept, byMarker });
    pool.sort((a, b) => b.s.score - a.s.score);
    const { c, s } = pool.shift();
    const isGap = c.gap || c.classification === 'unknown';
    const record = { id: c.id, score: s.score, parts: s.parts, reasons: s.reasons };
    if (s.restates) {
      supporting.push({
        ...c,
        placement: s.restates === 'kpi' ? 'kpi' : s.restates === 'chart' ? 'chart' : 'evidence',
      });
      diagnostics.push({ ...record, decision: 'supporting', gate: `restates_${s.restates}` });
      continue;
    }
    /* A finding about another measure (a price on a production question) is context: true
       and useful beside the answer, but not a key finding unless it is strongly relevant. */
    if (s.reasons.some((r) => r.startsWith('other_measure')) && s.parts.relevance < 0.5) {
      supporting.push({ ...c, placement: 'context' });
      diagnostics.push({ ...record, decision: 'supporting', gate: 'other_measure' });
      continue;
    }
    if (isGap && gapKept) {
      supporting.push({ ...c, placement: 'limitations' });
      diagnostics.push({ ...record, decision: 'supporting', gate: 'one_gap_finding' });
      continue;
    }
    if (s.score < KEEP_SCORE || kept.length >= cap) {
      supporting.push({ ...c, placement: 'evidence' });
      diagnostics.push({
        ...record,
        decision: 'supporting',
        gate: s.score < KEEP_SCORE ? 'below_bar' : 'cap',
      });
      continue;
    }
    kept.push({ ...c, insightScore: undefined });
    if (isGap) gapKept = true;
    diagnostics.push({ ...record, decision: 'key' });
  }
  /* A "not established" finding reads last. */
  const keyFindings = [
    ...kept.filter((k) => !(k.gap || k.classification === 'unknown')),
    ...kept.filter((k) => k.gap || k.classification === 'unknown'),
  ].map(({ insightScore, ...rest }) => rest);
  return {
    keyFindings,
    supporting,
    rejected,
    diagnostics: {
      version: SELECT_VERSION,
      candidates: (candidates || []).length,
      kept: keyFindings.length,
      supporting: supporting.length,
      rejected: rejected.length,
      decisions: diagnostics,
    },
  };
}

/**
 * The finding's kind as the reader sees it. An interpretation is never labelled verified
 * because its inputs were.
 */
export function findingKind(f) {
  if (!f) return null;
  if (f.gap || f.classification === 'unknown')
    return { id: 'unavailable', label: 'Not established' };
  if (f.classification === 'verified_fact')
    return { id: 'observation', label: 'Verified observation' };
  if (f.classification === 'calculated_result') return { id: 'calculated', label: 'Calculated' };
  if (f.classification === 'hypothesis') return { id: 'hypothesis', label: 'Hypothesis' };
  return { id: 'interpretation', label: 'Qualified interpretation' };
}
