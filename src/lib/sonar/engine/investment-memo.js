/**
 * Sonar research engine: the investment risk assessment (deep research,
 * Nov 2026).
 *
 * A question like "What are the biggest risks to NVIDIA's growth over the
 * next three years?" is answered the way a senior equity analyst would
 * brief a managing director: a thesis that answers the central question,
 * then the material risks ranked by priority, each with the investment
 * question it raises, the evidence (dated and cited), what it means, and
 * what would change the view; bull, base and bear cases framed as
 * assumptions, never forecasts; and the transmission chain from a leading
 * indicator to the company's results, each link marked supported or not
 * yet supported.
 *
 * The model returns JSON. Every claim in it goes through the same validator
 * as any research finding (findings.js validateClaim): numbers, years and
 * names must be stated by the records a claim cites, causal and conduct
 * language needs a source that says the same, and anything that fails is
 * downgraded or removed. Scenario assumptions and "what would change my
 * view" triggers may not carry a figure no record states.
 *
 * Pure apart from the synthesis call. Unit-tested in
 * scripts/check-sonar-deep.mjs.
 */
import { numbersOf } from './evidence';
import { CLASSIFICATIONS, numberSupported, validateClaim } from './findings';
import { stripCoverageNotes } from '@/lib/sonar/groundingGuard';

export const MEMO_PROMPT_VERSION = 'memo-v1';

export const MEMO_SYSTEM = `You are Ezana Sonar acting as a senior equity research analyst briefing a managing director on a multi-year investment risk assessment. You receive the question, numbered evidence records [S1]..[Sn] and calculated metrics [M:id]. Return ONLY one JSON object, no prose around it, matching:
{
  "centralQuestion": string,
  "executiveConclusion": { "text": string, "classification": string, "evidence": [markers], "metrics": [metric ids] },
  "risks": [
    {
      "title": string,
      "priority": "high" | "medium" | "low",
      "question": string,
      "assessment": { "text": string, "classification": string, "evidence": [markers], "metrics": [metric ids] },
      "evidence": [ { "text": string, "classification": string, "evidence": [markers], "metrics": [metric ids], "period": string|null } ],
      "implication": { "text": string, "classification": string, "evidence": [markers], "metrics": [metric ids] },
      "watch": [string]
    }
  ],
  "scenarios": [ { "case": "bull" | "base" | "bear", "assumptions": [string], "outcome": { "text": string, "classification": "hypothesis", "evidence": [markers], "metrics": [metric ids] } } ],
  "chain": [ { "from": string, "to": string, "mechanism": string, "evidence": [markers] } ],
  "dataGaps": [string],
  "limitations": [string],
  "followOnResearch": [string],
  "confidence": "high" | "medium" | "low"
}
How to think:
- Do not explain what the company does or that its market is growing; the reader knows. Answer the central question: what could make growth, earnings power or valuation disappoint materially over the horizon asked.
- Separate a risk to the market's demand from a risk to the company's ability to capture that demand.
- Three to six risks, most material first. Each risk: the investment question it raises, an assessment, two to four pieces of dated evidence, the implication for revenue, margins or valuation, and two or three developments that would change the view.
- Cover every angle the reader asked for (listed below). If the records cannot support an angle, say what is missing in dataGaps instead of guessing.
- Scenarios: bull, base and bear, each a short list of qualitative assumptions (direction and driver, e.g. "hyperscaler capital spending keeps rising") and an outcome classified hypothesis. They are illustrations for testing the thesis, not forecasts or price targets.
- chain: the transmission mechanism from a leading indicator to the company's results (for example customer capital spending to orders to revenue to margins), three to five links. Cite a record for a link only if the record supports it.
- dataGaps: specific data an analyst would want that the records do not contain (for example customer concentration from the latest 10-Q, segment margins, export licensing status).
Classifications:
- verified_fact: stated directly by a cited record.
- calculated_result: a cited metric [M:id] or arithmetic on cited records; name the metric.
- analytical_interpretation: your reasoning across cited findings; word it as such ("this suggests").
- hypothesis: a possibility that needs verification; word it as such.
- unknown: something the records cannot establish; say what is missing.
Rules:
- Copy every number exactly as a cited record or metric states it (same unit and rounding). Never compute a new figure unless it is a cited metric. Never invent a figure, date, name, customer, product or source. Scenario assumptions and watch items carry no figures unless a record states them.
- Name the period of every figure. Reported results, 13F holdings, contracts and market data have different dates; never present them as one point in time. 13F data is delayed and long-only. A contract ceiling is not money spent.
- Never imply causation from timing, and never imply improper conduct.
- Findings only: no buy, sell or hold call and no price target in Ezana's voice. A named firm's published rating, attributed, is a finding.
- Never ask the reader a question. Never mention web search. No em dashes.`;

/** The user message: question, angles, evidence and metrics. */
export function memoInput({ spec, plan, marked, metrics, today }) {
  const ev = marked
    .map((e) =>
      `[${e.marker}] (${e.category}; ${e.period?.label || e.date || 'undated'}) ${e.title}. ${e.text}`.slice(
        0,
        900,
      ),
    )
    .join('\n');
  const ms = metrics
    .map(
      (m) =>
        `[M:${m.id}] ${m.label} = ${m.unit === 'ratio' ? `${(m.value * 100).toFixed(1)}%` : m.unit === 'percent' ? `${m.value.toFixed(1)}%` : m.value}${m.period?.label ? ` (${m.period.label})` : ''} (method: ${m.method})`,
    )
    .join('\n');
  const horizon = spec.timeHorizon?.months
    ? `${Math.round(spec.timeHorizon.months / 12) || 1} year(s)`
    : 'unspecified';
  return `Today is ${today}.
Central question: ${spec.question}
The reader asked: "${String(spec.rawQuery).slice(0, 400)}"
Subject: ${spec.subject?.label || 'n/a'}${spec.subject?.id ? ` (${spec.subject.id})` : ''}. Horizon: ${horizon}.
Angles the reader asked for: ${(spec.angles || []).map((a) => a.label).join(', ') || 'none named'}.
Sources searched: ${plan.tasks.map((t) => t.source).join(', ')}.

Evidence:
${ev || '(none)'}

Metrics:
${ms || '(none)'}`;
}

/** Numbers in a free-text line (an assumption or a trigger) that no record states. */
export function unsupportedFigures(text, allowed) {
  return numbersOf(String(text || '').replace(/\[S\d+\]/g, ''))
    .filter((n) => !/^[-+]?\d$/.test(n.text))
    .filter((n) => !numberSupported(n, allowed));
}

const PRIORITY = ['high', 'medium', 'low'];

/**
 * Validate a parsed memo. Returns the surviving memo in the report shape the
 * engine and UI read (executiveConclusion, keyFindings, analysis,
 * limitations, followOnResearch, confidence, validation) plus the memo
 * fields (format, centralQuestion, risks, scenarios, chain, dataGaps).
 */
export function validateMemo(parsed, { marked, metrics }) {
  const byMarker = new Map(marked.map((e) => [e.marker, e]));
  const metricsById = new Map(metrics.map((m) => [m.id, m]));
  const ctx = { byMarker, metricsById };
  const allowedAll = [
    ...marked.flatMap((e) => e.numbers || []),
    ...metrics.map((m) => ({ value: m.value, ratio: m.unit === 'ratio' })),
  ];
  const log = [];
  const check = (claim, kind, i, forceClass = null) => {
    if (!claim || !String(claim.text || '').trim()) return null;
    const c = forceClass ? { ...claim, classification: forceClass } : claim;
    const v = validateClaim(c, ctx);
    log.push({
      kind,
      index: i,
      action: v.action,
      problems: v.problems,
      classification: v.classification,
    });
    if (v.action === 'removed') return null;
    return {
      ...c,
      id: `${kind}_${i + 1}`,
      classification: v.classification,
      evidenceIds: v.evidenceIds,
      markers: (c.evidence || []).filter((m) => byMarker.has(String(m).replace(/[[\]]/g, ''))),
      metrics: (c.metrics || [])
        .map((m) => String(m).replace(/^M:/, ''))
        .filter((m) => metricsById.has(m)),
      validation: { action: v.action, problems: v.problems },
    };
  };
  const cleanLines = (lines, max) =>
    (Array.isArray(lines) ? lines : [])
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .filter((x) => !unsupportedFigures(x, allowedAll).length)
      .slice(0, max);

  const conclusion = check(parsed?.executiveConclusion, 'conclusion', 0);

  const risks = (Array.isArray(parsed?.risks) ? parsed.risks : [])
    .slice(0, 6)
    .map((r, i) => {
      const assessment = check(r?.assessment, `risk${i + 1}_assessment`, 0);
      const evidence = (Array.isArray(r?.evidence) ? r.evidence : [])
        .slice(0, 5)
        .map((e, j) => check(e, `risk${i + 1}_evidence`, j))
        .filter(Boolean);
      const implication = check(r?.implication, `risk${i + 1}_implication`, 0);
      if (!assessment && !evidence.length) return null;
      return {
        id: `risk_${i + 1}`,
        rank: i + 1,
        title: String(r?.title || `Risk ${i + 1}`).slice(0, 140),
        priority: PRIORITY.includes(r?.priority) ? r.priority : 'medium',
        question: String(r?.question || '').slice(0, 300),
        assessment,
        evidence,
        implication,
        watch: cleanLines(r?.watch, 4),
      };
    })
    .filter(Boolean)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const scenarios = (Array.isArray(parsed?.scenarios) ? parsed.scenarios : [])
    .filter((s) => ['bull', 'base', 'bear'].includes(s?.case))
    .map((s, i) => {
      const outcome = s.outcome?.text
        ? (() => {
            /* An outcome is a hypothesis by definition, and may not carry a
               figure no record states (no forecast in Ezana's voice). */
            const bad = unsupportedFigures(s.outcome.text, allowedAll);
            log.push({
              kind: 'scenario',
              index: i,
              action: bad.length ? 'removed' : 'kept',
              problems: bad.length
                ? [`unsupported_numbers:${bad.map((n) => n.text).join('|')}`]
                : [],
              classification: 'hypothesis',
            });
            return bad.length
              ? null
              : {
                  text: String(s.outcome.text),
                  classification: 'hypothesis',
                  markers: (s.outcome.evidence || []).filter((m) =>
                    byMarker.has(String(m).replace(/[[\]]/g, '')),
                  ),
                };
          })()
        : null;
      const assumptions = cleanLines(s.assumptions, 6);
      if (!outcome && !assumptions.length) return null;
      return { case: s.case, assumptions, outcome };
    })
    .filter(Boolean)
    .sort(
      (a, b) => ['bull', 'base', 'bear'].indexOf(a.case) - ['bull', 'base', 'bear'].indexOf(b.case),
    );

  const chain = (Array.isArray(parsed?.chain) ? parsed.chain : [])
    .slice(0, 6)
    .map((l) => {
      const markers = (l?.evidence || [])
        .map((m) => String(m).replace(/[[\]]/g, ''))
        .filter((m) => byMarker.has(m));
      const text = `${l?.from || ''} ${l?.to || ''} ${l?.mechanism || ''}`;
      if (!l?.from || !l?.to || unsupportedFigures(text, allowedAll).length) return null;
      return {
        from: String(l.from).slice(0, 80),
        to: String(l.to).slice(0, 80),
        mechanism: String(l.mechanism || '').slice(0, 200),
        markers,
        status: markers.length ? 'supported' : 'needs_evidence',
      };
    })
    .filter(Boolean);

  /* The legacy surfaces (brief, feedback, telemetry) read keyFindings. */
  const keyFindings = risks
    .map((r) => {
      const base = r.assessment || r.evidence[0];
      return base
        ? {
            ...base,
            id: `finding_${r.rank}`,
            title: r.title,
            explanation: base.text,
            entities: base.entities || [],
            period: base.period || null,
          }
        : null;
    })
    .filter(Boolean);

  const claims = log.length;
  const kept = log.filter((l) => l.action !== 'removed').length;
  const cited = [
    ...(conclusion ? [conclusion] : []),
    ...risks.flatMap((r) => [r.assessment, ...r.evidence, r.implication].filter(Boolean)),
  ];
  return {
    format: 'investment_memo',
    centralQuestion: String(parsed?.centralQuestion || '').slice(0, 300),
    executiveConclusion: conclusion,
    keyFindings,
    analysis: [],
    risks,
    scenarios,
    chain,
    dataGaps: (parsed?.dataGaps || []).map(String).filter(Boolean).slice(0, 8),
    limitations: (parsed?.limitations || [])
      .map(String)
      .map(stripCoverageNotes)
      .filter(Boolean)
      .slice(0, 6),
    followOnResearch: (parsed?.followOnResearch || []).map(String).slice(0, 5),
    confidence: ['high', 'medium', 'low'].includes(parsed?.confidence)
      ? parsed.confidence
      : 'medium',
    validation: {
      log,
      stats: {
        claims,
        kept,
        removed: claims - kept,
        downgraded: log.filter((l) => l.action === 'downgraded').length,
        claimSupportRate: claims ? kept / claims : 0,
        citationCoverage: cited.length
          ? cited.filter((c) => c.evidenceIds?.length || c.metrics?.length).length / cited.length
          : 0,
      },
    },
  };
}

/* Which memo section each source's records belong to, for the fallback. */
const SECTION_OF = {
  company_financials: ['financials', 'Financial performance'],
  product_segments: ['financials', 'Financial performance'],
  market_snapshot: ['valuation', 'Market expectations'],
  analysts: ['valuation', 'Market expectations'],
  holder_positioning: ['ownership', 'Institutional positioning'],
  institutional_13f: ['ownership', 'Institutional positioning'],
  peer_financials: ['competition', 'Competitive landscape'],
  revenue_geo: ['geopolitics', 'Geographic and geopolitical exposure'],
  sanctions: ['geopolitics', 'Geographic and geopolitical exposure'],
  contracts_history: ['contracts', 'Government contracts'],
  lobbying_company: ['policy', 'Policy and lobbying'],
};

/**
 * The fallback when the written assessment does not complete: the records,
 * grouped by the memo's sections and quoted, with no assessment of its own.
 */
export function deterministicMemo({ spec, marked, metrics }) {
  const groups = new Map();
  for (const e of marked) {
    const [id, title] = SECTION_OF[e.source] || [];
    if (!id) continue;
    const g = groups.get(id) || { id, title, items: [] };
    if (g.items.length < 3) g.items.push(e);
    groups.set(id, g);
  }
  const fact = (e, kind, i) => ({
    id: `${kind}_${i + 1}`,
    text: `${e.title}. ${e.text}`,
    classification: 'verified_fact',
    evidenceIds: [e.id],
    markers: [e.marker],
    metrics: [],
    validation: { action: 'kept', problems: [] },
  });
  const risks = [...groups.values()].map((g, i) => ({
    id: `risk_${i + 1}`,
    rank: i + 1,
    title: g.title,
    priority: 'medium',
    question: '',
    assessment: null,
    evidence: g.items.map((e, j) => fact(e, `risk${i + 1}_evidence`, j)),
    implication: null,
    watch: [],
  }));
  const first = marked[0];
  return {
    format: 'investment_memo',
    centralQuestion: spec.question,
    executiveConclusion: first ? fact(first, 'conclusion', 0) : null,
    keyFindings: risks.map((r) => ({
      ...r.evidence[0],
      id: `finding_${r.rank}`,
      title: r.title,
      explanation: r.evidence[0].text,
      entities: [],
    })),
    analysis: [],
    risks,
    scenarios: [],
    chain: [],
    dataGaps: [],
    limitations: [
      'The written assessment did not complete in time, so this report groups and quotes the records without ranking the risks. Run the research again for the full assessment.',
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
    metricsUsed: metrics.length,
  };
}

/** Prose for the legacy brief surface: the conclusion, then the risks in order. */
export function renderMemoBrief(memo) {
  const cite = (c) =>
    c?.markers?.length
      ? ` ${c.markers.map((m) => `[${String(m).replace(/[[\]]/g, '')}]`).join('')}`
      : '';
  const parts = [];
  if (memo.executiveConclusion)
    parts.push(`${memo.executiveConclusion.text}${cite(memo.executiveConclusion)}`);
  const lines = memo.risks.map((r) => {
    const body = r.assessment || r.evidence[0];
    return `${r.rank}. ${r.title}${body ? `: ${body.text}${cite(body)}` : ''}`;
  });
  if (lines.length) parts.push(lines.join('\n'));
  return parts.join('\n\n');
}

export { CLASSIFICATIONS };
