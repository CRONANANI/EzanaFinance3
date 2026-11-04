/**
 * Sonar research engine: structured synthesis and claim validation
 * (engine v3, Section 6).
 *
 * The model no longer writes a brief with citations sprinkled in. It returns
 * structured findings, each with a claim classification and the evidence
 * markers and metric ids it rests on. Every claim is then validated against
 * the records it cites:
 *
 *   references  every cited marker and metric exists
 *   numbers     every figure in the claim appears in a cited record or metric
 *               (to the claim's own precision)
 *   dates       every year in the claim appears in a cited record's text,
 *               date or period, or in a cited metric's period
 *   entities    a named entity appears in at least one cited record
 *   negatives   a "did not / has not / never" claim needs a negative source
 *   overreach   causal or conduct language is downgraded or removed unless a
 *               cited record says the same
 *
 * A failing claim is qualified (downgraded) or removed, never silently kept.
 * The report is assembled from what survives. The existing grounding guard
 * (groundingGuard.js) still runs on the rendered text as a second net.
 *
 * Pure apart from the synthesis call. Validation is unit-tested.
 */
import { numbersOf } from './evidence';
import { findUnsupportedNegatives, stripCoverageNotes } from '@/lib/sonar/groundingGuard';

export const CLASSIFICATIONS = [
  'verified_fact',
  'calculated_result',
  'analytical_interpretation',
  'hypothesis',
  'unknown',
];

export const SYNTHESIS_PROMPT_VERSION = 'synth-v1';

export const SYNTHESIS_SYSTEM = `You are Ezana Sonar, a financial and geopolitical research analyst. You receive a research question, a research plan, numbered evidence records [S1]..[Sn] and calculated metrics [M:id]. Return ONLY one JSON object, no prose around it, matching:
{
  "executiveConclusion": { "text": string, "classification": string, "evidence": [markers], "metrics": [metric ids] },
  "keyFindings": [ { "title": string, "explanation": string, "classification": string, "evidence": [markers], "metrics": [metric ids], "entities": [names or tickers], "period": string|null } ],
  "analysis": [ { "text": string, "classification": string, "evidence": [markers], "metrics": [metric ids] } ],
  "limitations": [string],
  "followOnResearch": [string],
  "confidence": "high" | "medium" | "low"
}
Classifications:
- verified_fact: stated directly by a cited record.
- calculated_result: a cited metric [M:id] or arithmetic on cited records; name the metric.
- analytical_interpretation: your reasoning across several cited findings; say so in the wording ("this suggests").
- hypothesis: a possible explanation that needs verification; word it as such ("one possibility").
- unknown: something the records cannot establish; state what is missing.
Rules:
- Answer the question asked. The executive conclusion answers it directly in two to four sentences.
- Three to six key findings, most important first. Each cites at least one marker or metric.
- Copy every number exactly as a cited record or metric states it (same unit and rounding). Never compute a new figure unless it is a cited metric. Never invent a figure, date, name or source.
- Write dates and periods exactly as the records give them. Anything dated before today has already happened.
- Congressional trade amounts are ranges; write them as ranges. Estimated portfolio values are estimates; say so.
- Never imply causation from timing, and never imply improper conduct, conflicts of interest or inside knowledge.
- Findings only: no buy, sell or hold call and no price target in Ezana's voice. A named firm's published rating, attributed, is a finding.
- Never ask the reader a question. Never mention web search.
- Limitations: what the records cannot establish for this question (for example, a disclosure that does not split spend by issue). Be specific; never claim a dataset has no record of the subject itself.
- No em dashes.`;

/** The user message: question, plan summary, evidence and metrics. */
export function synthesisInput({ spec, plan, marked, metrics, today }) {
  const ev = marked
    .map((e) =>
      `[${e.marker}] (${e.category}; ${e.period?.label || e.date || 'undated'}) ${e.title}. ${e.text}`.slice(
        0,
        700,
      ),
    )
    .join('\n');
  const ms = metrics
    .map(
      (m) =>
        `[M:${m.id}] ${m.label} = ${m.unit === 'ratio' ? `${(m.value * 100).toFixed(1)}%` : m.unit === 'percent' ? `${m.value.toFixed(1)}%` : m.value} (method: ${m.method})`,
    )
    .join('\n');
  return `Today is ${today}.
Research question: ${spec.question}
The reader asked: "${String(spec.rawQuery).slice(0, 300)}"
Objective: ${spec.objective.primary}. Domains: ${spec.domains
    .slice(0, 5)
    .map((d) => d.id)
    .join(
      ', ',
    )}. Time horizon: ${spec.timeHorizon.kind}${spec.timeHorizon.months ? ` ${spec.timeHorizon.months} months` : ''}.
Ranking required: ${spec.ranking.required}. Comparison required: ${spec.comparison.required}.
Sources searched: ${plan.tasks.map((t) => t.source).join(', ')}.

Evidence:
${ev || '(none)'}

Metrics:
${ms || '(none)'}`;
}

/** Parse the model's JSON, tolerating code fences and leading prose. */
export function parseResearchJson(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

const YEAR_RE = /\b(19[5-9]\d|20[0-4]\d)\b/g;
const CAUSAL_RE =
  /\b(caused|causes|because of|led to|leads to|drove|drives|driven by|resulted in|results in|in response to|due to)\b/i;
const CONDUCT_RE =
  /\b(insider (?:knowledge|information|trading)|conflicts? of interest|illegal|illegally|corrupt\w*|wrongdoing|front-?run\w*|unethical|improper\w*|bribe\w*)\b/i;

function decimalsOf(text) {
  const m = String(text).match(/\.(\d+)/);
  return m ? m[1].length : 0;
}

function unitMult(text) {
  const t = String(text).toLowerCase();
  if (/(b|billion)\b/.test(t)) return 1e9;
  if (/(m|million)\b/.test(t)) return 1e6;
  if (/(k|thousand)\b/.test(t)) return 1e3;
  if (/(t|trillion)\b/.test(t)) return 1e12;
  return 1;
}

/** Whether `n` (a number parsed from a claim) is stated by one of `allowed`. */
export function numberSupported(n, allowed) {
  if (!n.pct && Number.isInteger(n.value) && n.value >= 1950 && n.value <= 2049)
    return true; /* a year: checked separately */
  /* Half a unit of the claim's own precision ("$1.5M" allows +-$50K), but
     never more than 5% of the value: "$2M" is not a fair rounding of $1.5M. */
  const halfUnit = 0.5 * Math.pow(10, -decimalsOf(n.text)) * unitMult(n.text);
  return allowed.some((a) => {
    const candidates = [a.value];
    if (a.ratio) candidates.push(a.value * 100);
    return candidates.some((v) => {
      const tol = Math.max(Math.min(halfUnit, Math.abs(v) * 0.05), Math.abs(v) * 0.005);
      return Math.abs(v - n.value) <= tol;
    });
  });
}

/**
 * Validate one claim.
 * @returns {{ action: 'kept'|'downgraded'|'removed', classification: string, problems: string[], evidenceIds: string[] }}
 */
export function validateClaim(claim, { byMarker, metricsById }) {
  const text = [claim.title, claim.explanation, claim.text].filter(Boolean).join(' ');
  const problems = [];
  let cls = CLASSIFICATIONS.includes(claim.classification)
    ? claim.classification
    : 'analytical_interpretation';

  const cited = (claim.evidence || [])
    .map((m) => byMarker.get(String(m).replace(/[[\]]/g, '')))
    .filter(Boolean);
  const mets = (claim.metrics || [])
    .map((id) => metricsById.get(String(id).replace(/^M:/, '')))
    .filter(Boolean);
  const unknownRefs =
    (claim.evidence || []).length - cited.length + (claim.metrics || []).length - mets.length;
  if (unknownRefs > 0) problems.push('unknown_reference');

  if (cls === 'unknown') {
    return { action: 'kept', classification: cls, problems, evidenceIds: cited.map((e) => e.id) };
  }
  if (!cited.length && !mets.length) {
    return {
      action: 'removed',
      classification: cls,
      problems: [...problems, 'no_evidence'],
      evidenceIds: [],
    };
  }
  if (cls === 'calculated_result' && !mets.length && cited.length < 1) {
    return {
      action: 'removed',
      classification: cls,
      problems: [...problems, 'calculation_without_inputs'],
      evidenceIds: [],
    };
  }

  /* Numbers: every figure must be stated by a cited record or metric. */
  const allowed = [
    ...cited.flatMap((e) => [...e.numbers, ...numbersOf(JSON.stringify(e.data?.row || ''))]),
    ...mets.map((m) => ({ value: m.value, ratio: m.unit === 'ratio' })),
  ];
  const claimNums = numbersOf(text.replace(/\[S\d+\]/g, '')).filter(
    (n) => !/^[-+]?\d$/.test(n.text),
  );
  const unsupported = claimNums.filter((n) => !numberSupported(n, allowed));
  if (unsupported.length)
    problems.push(`unsupported_numbers:${unsupported.map((n) => n.text).join('|')}`);

  /* Dates: every year must appear in a cited record or metric period. */
  const hay = [
    ...cited.map((e) => `${e.title} ${e.text} ${e.date || ''} ${JSON.stringify(e.period || '')}`),
    ...mets.map((m) => JSON.stringify(m.period || '')),
  ].join(' ');
  const years = [...new Set(text.match(YEAR_RE) || [])];
  const badYears = years.filter((y) => !hay.includes(y));
  if (badYears.length) problems.push(`unsupported_dates:${badYears.join('|')}`);

  /* Entities: something the claim names must appear in what it cites. */
  const ents = (claim.entities || []).filter(Boolean);
  if (ents.length && cited.length) {
    const h =
      hay.toLowerCase() +
      ' ' +
      cited
        .flatMap((e) => e.entities)
        .join(' ')
        .toLowerCase();
    if (!ents.some((x) => h.includes(String(x).toLowerCase()))) problems.push('entity_mismatch');
  }

  /* Negative claims need a negative source. */
  if (
    findUnsupportedNegatives(
      text,
      cited.map((e) => `${e.title}. ${e.text}`),
    ).length
  ) {
    problems.push('unsupported_negative');
  }

  /* Overreach. */
  const conduct = CONDUCT_RE.test(text) && !CONDUCT_RE.test(hay);
  const causal = CAUSAL_RE.test(text) && !CAUSAL_RE.test(hay);
  if (conduct) problems.push('conduct_language');
  if (causal) problems.push('causal_language');

  const fatal = problems.some((p) =>
    /^(unsupported_numbers|unsupported_dates|entity_mismatch|unsupported_negative|conduct_language)/.test(
      p,
    ),
  );
  if (fatal)
    return {
      action: 'removed',
      classification: cls,
      problems,
      evidenceIds: cited.map((e) => e.id),
    };
  if (causal && (cls === 'verified_fact' || cls === 'calculated_result')) {
    return {
      action: 'downgraded',
      classification: 'analytical_interpretation',
      problems,
      evidenceIds: cited.map((e) => e.id),
    };
  }
  if (cls === 'verified_fact' && !cited.length && mets.length) {
    return { action: 'downgraded', classification: 'calculated_result', problems, evidenceIds: [] };
  }
  return { action: 'kept', classification: cls, problems, evidenceIds: cited.map((e) => e.id) };
}

/**
 * Validate a parsed research object. Returns the surviving report and the
 * validation record.
 */
export function validateResearch(parsed, { marked, metrics }) {
  const byMarker = new Map(marked.map((e) => [e.marker, e]));
  const metricsById = new Map(metrics.map((m) => [m.id, m]));
  const ctx = { byMarker, metricsById };
  const log = [];
  const check = (claim, kind, i) => {
    const v = validateClaim(claim, ctx);
    log.push({
      kind,
      index: i,
      action: v.action,
      problems: v.problems,
      classification: v.classification,
    });
    if (v.action === 'removed') return null;
    return {
      ...claim,
      id: `${kind}_${i + 1}`,
      classification: v.classification,
      evidenceIds: v.evidenceIds,
      markers: (claim.evidence || []).filter((m) => byMarker.has(String(m).replace(/[[\]]/g, ''))),
      metrics: (claim.metrics || [])
        .map((m) => String(m).replace(/^M:/, ''))
        .filter((m) => metricsById.has(m)),
      validation: { action: v.action, problems: v.problems },
    };
  };
  const conclusion = parsed?.executiveConclusion
    ? check(parsed.executiveConclusion, 'conclusion', 0)
    : null;
  const keyFindings = (parsed?.keyFindings || [])
    .map((f, i) => check(f, 'finding', i))
    .filter(Boolean);
  const analysis = (parsed?.analysis || []).map((a, i) => check(a, 'analysis', i)).filter(Boolean);
  const claims = log.length;
  const kept = log.filter((l) => l.action !== 'removed').length;
  const cited = [...(conclusion ? [conclusion] : []), ...keyFindings, ...analysis];
  const stats = {
    claims,
    kept,
    removed: claims - kept,
    downgraded: log.filter((l) => l.action === 'downgraded').length,
    claimSupportRate: claims ? kept / claims : 0,
    citationCoverage: cited.length
      ? cited.filter((c) => c.evidenceIds.length || c.metrics.length).length / cited.length
      : 0,
  };
  return {
    executiveConclusion: conclusion,
    keyFindings,
    analysis,
    limitations: (parsed?.limitations || [])
      .map(String)
      .map(stripCoverageNotes)
      .filter(Boolean)
      .slice(0, 6),
    followOnResearch: (parsed?.followOnResearch || []).map(String).slice(0, 5),
    confidence: ['high', 'medium', 'low'].includes(parsed?.confidence)
      ? parsed.confidence
      : 'medium',
    validation: { log, stats },
  };
}

/**
 * The deterministic report: used when synthesis fails or every claim is
 * removed. Findings quote the strongest records and metrics directly, so
 * the answer is partial but true.
 */
export function deterministicResearch({ spec, marked, metrics }) {
  const top = marked.slice(0, 5);
  const fmt = (m) =>
    m.unit === 'ratio'
      ? `${(m.value * 100).toFixed(1)}%`
      : m.unit === 'percent'
        ? `${m.value.toFixed(1)}%`
        : String(m.value);
  return {
    executiveConclusion: top.length
      ? {
          id: 'conclusion_1',
          text: `${top[0].title}. ${top[0].text}`,
          classification: 'verified_fact',
          evidenceIds: [top[0].id],
          markers: [top[0].marker],
          metrics: [],
          validation: { action: 'kept', problems: [] },
        }
      : null,
    keyFindings: [
      ...top.slice(1).map((e, i) => ({
        id: `finding_${i + 1}`,
        title: e.title,
        explanation: e.text,
        classification: 'verified_fact',
        evidenceIds: [e.id],
        markers: [e.marker],
        metrics: [],
        entities: e.entities.slice(0, 4),
        validation: { action: 'kept', problems: [] },
      })),
      ...metrics.slice(0, 3).map((m, i) => ({
        id: `metric_finding_${i + 1}`,
        title: m.label,
        explanation: `${m.label}: ${fmt(m)}. Method: ${m.method}.`,
        classification: 'calculated_result',
        evidenceIds: m.inputs,
        markers: [],
        metrics: [m.id],
        entities: [],
        validation: { action: 'kept', problems: [] },
      })),
    ],
    analysis: [],
    limitations: [
      'This report quotes the records directly because the analysis step did not complete in time. It answers only what those records state.',
    ],
    followOnResearch: [],
    confidence: 'low',
    validation: {
      log: [],
      stats: {
        claims: 0,
        kept: 0,
        removed: 0,
        downgraded: 0,
        claimSupportRate: 1,
        citationCoverage: 1,
      },
    },
    deterministic: true,
    question: spec.question,
  };
}

/** Prose for the legacy brief surface: conclusion then findings, with [S#]. */
export function renderBrief(report) {
  const cite = (c) =>
    c.markers?.length
      ? ` ${c.markers.map((m) => `[${String(m).replace(/[[\]]/g, '')}]`).join('')}`
      : '';
  const parts = [];
  if (report.executiveConclusion)
    parts.push(`${report.executiveConclusion.text}${cite(report.executiveConclusion)}`);
  const f = report.keyFindings.map((k) => `${k.title}: ${k.explanation}${cite(k)}`);
  if (f.length) parts.push(f.join(' '));
  return parts.join('\n\n');
}
