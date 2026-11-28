/**
 * Sonar for organizations: the Pitch Copilot thesis checklist and the investment committee
 * red team (Nov 28 2026).
 *
 * thesisCompleteness(pitch, report)
 *   A transparent checklist, never a quality score: nine criteria (argument, financial
 *   evidence, valuation method, uncertainty, counterevidence, risks, sources, assumptions,
 *   monitoring), each met, partial or missing, with the field that met it. No percentage.
 *
 * committeeQuestions(pitch, report, { policy })
 *   Questions for the committee, grouped by category, each linked to the exact assumption,
 *   finding or missing evidence that motivated it. Nothing is asked that the pitch or its
 *   linked report does not give a reason for, so the list can never be generic.
 *
 * Neither function approves, rejects, votes or advances a pitch. They prepare humans.
 *
 * Pure and client-safe; unit-tested in scripts/check-org-sonar-intelligence.mjs.
 */

export const QUESTION_CATEGORIES = [
  { id: 'business', label: 'Business model' },
  { id: 'financial', label: 'Financial quality' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'moat', label: 'Competitive advantage' },
  { id: 'capital', label: 'Capital allocation' },
  { id: 'macro', label: 'Industry and macro exposure' },
  { id: 'downside', label: 'Downside scenarios' },
  { id: 'policy', label: 'Investment policy' },
];

const text = (v) => (Array.isArray(v) ? v.filter(Boolean).join(' ') : String(v || '')).trim();
const list = (v) =>
  Array.isArray(v)
    ? v.map((x) => (typeof x === 'string' ? x : x?.text || x?.title || '')).filter(Boolean)
    : text(v)
        .split(/\n+|;\s+|•/)
        .map((s) => s.trim())
        .filter(Boolean);
const words = (s) => text(s).split(/\s+/).filter(Boolean).length;

/** Findings and limitations from a frozen report snapshot (org_sonar_report_versions). */
function reportParts(report) {
  const snap = report?.snapshot || report || {};
  const rep = snap.report || {};
  const findings = (rep.keyFindings || []).map((f) => ({
    id: f.id,
    text: f.text || f.claim || '',
    classification: f.classification || null,
    evidenceIds: f.evidenceIds || f.markers || [],
  }));
  const counter = (rep.counterEvidence || rep.risks || [])
    .map((r) => (typeof r === 'string' ? r : r.text))
    .filter(Boolean);
  const limitations = (snap.run?.limitations || []).filter(Boolean);
  const calcs = (snap.run?.calculations || snap.calculations || []).filter(Boolean);
  return { findings, counter, limitations, calcs, evidence: snap.evidence || [] };
}

const CRITERIA = [
  {
    id: 'argument',
    label: 'Clear investment argument',
    test: (p) =>
      words(p.thesis_short) >= 8
        ? 'met'
        : words(p.thesis_short) || words(p.thesis_full)
          ? 'partial'
          : 'missing',
    field: 'Thesis summary',
  },
  {
    id: 'financials',
    label: 'Supporting financial evidence',
    test: (p, r) =>
      r.calcs.length || r.findings.some((f) => f.classification === 'fact')
        ? 'met'
        : /\b(revenue|margin|cash flow|eps|growth)\b/i.test(text(p.thesis_full))
          ? 'partial'
          : 'missing',
    field: 'Linked report calculations or thesis',
  },
  {
    id: 'valuation',
    label: 'Valuation methodology',
    test: (p) =>
      p.valuation_method || p.target_price != null
        ? p.valuation_method && p.target_price != null
          ? 'met'
          : 'partial'
        : /\b(dcf|multiple|p\/e|ev\/ebitda|comparable)\b/i.test(text(p.thesis_full))
          ? 'partial'
          : 'missing',
    field: 'Valuation method and target price',
  },
  {
    id: 'uncertainty',
    label: 'Treatment of uncertainty',
    test: (p) =>
      p.bull_case && p.bear_case
        ? 'met'
        : p.bull_case ||
            p.bear_case ||
            /\b(scenario|base case|bear case|bull case)\b/i.test(text(p.thesis_full))
          ? 'partial'
          : 'missing',
    field: 'Bull and bear cases',
  },
  {
    id: 'counterevidence',
    label: 'Counterevidence addressed',
    test: (p, r) =>
      r.counter.length || /\b(however|counter|bear|risk to the thesis)\b/i.test(text(p.thesis_full))
        ? r.counter.length
          ? 'met'
          : 'partial'
        : 'missing',
    field: 'Counterevidence in the thesis or linked report',
  },
  {
    id: 'risks',
    label: 'Risks identified',
    test: (p) => (list(p.risks).length >= 2 ? 'met' : list(p.risks).length ? 'partial' : 'missing'),
    field: 'Risks',
  },
  {
    id: 'sources',
    label: 'Source quality',
    test: (p, r) => (r.evidence.length >= 3 ? 'met' : r.evidence.length ? 'partial' : 'missing'),
    field: 'Evidence in the linked report',
  },
  {
    id: 'assumptions',
    label: 'Assumptions documented',
    test: (p) =>
      list(p.assumptions).length
        ? 'met'
        : /\b(assum|we expect|forecast)\w*/i.test(text(p.thesis_full))
          ? 'partial'
          : 'missing',
    field: 'Assumptions',
  },
  {
    id: 'monitoring',
    label: 'Monitoring criteria',
    test: (p) =>
      list(p.monitoring || p.kpis).length
        ? 'met'
        : list(p.catalysts).length
          ? 'partial'
          : 'missing',
    field: 'Monitoring indicators or catalysts',
  },
];

export function thesisCompleteness(pitch = {}, report = null) {
  const r = reportParts(report);
  const rows = CRITERIA.map((c) => ({
    id: c.id,
    label: c.label,
    status: c.test(pitch, r),
    field: c.field,
  }));
  return {
    rows,
    met: rows.filter((x) => x.status === 'met').length,
    partial: rows.filter((x) => x.status === 'partial').length,
    missing: rows.filter((x) => x.status === 'missing').map((x) => x.label),
    total: rows.length,
    note: 'A checklist of what the pitch records, not a grade. The committee judges the argument.',
  };
}

/**
 * Committee questions. Every question carries `motive` ({ kind: 'assumption' | 'finding' |
 * 'missing' | 'risk' | 'policy' | 'limitation', text }) so a reader sees why it is asked.
 */
export function committeeQuestions(pitch = {}, report = null, { policy = null } = {}) {
  const r = reportParts(report);
  const sym = pitch.ticker || 'the company';
  const out = [];
  const add = (category, question, motive) => out.push({ category, question, motive });

  for (const a of list(pitch.assumptions).slice(0, 4))
    add(
      /margin|cash|revenue|growth|earn/i.test(a) ? 'financial' : 'business',
      `What evidence supports the assumption that ${a.replace(/\.$/, '')}, and what would show it is wrong?`,
      { kind: 'assumption', text: a },
    );
  if (pitch.target_price != null && !pitch.valuation_method)
    add(
      'valuation',
      `How was the ${sym} target price of ${pitch.target_price} derived, and how sensitive is it to the discount rate and terminal growth?`,
      { kind: 'missing', text: 'Target price recorded without a valuation method.' },
    );
  if (pitch.valuation_method)
    add(
      'valuation',
      `Which single input moves the ${pitch.valuation_method} value of ${sym} the most, and what happens to the upside if it is 20% less favourable?`,
      { kind: 'assumption', text: `Valuation method: ${pitch.valuation_method}` },
    );
  for (const risk of list(pitch.risks).slice(0, 3))
    add(
      'downside',
      `If "${risk.replace(/\.$/, '')}" materialises, what is the downside, and what would trigger a position review?`,
      { kind: 'risk', text: risk },
    );
  for (const c of list(pitch.catalysts).slice(0, 2))
    add(
      'business',
      `What is the timeline for "${c.replace(/\.$/, '')}", and what happens to the thesis if it slips?`,
      { kind: 'assumption', text: c },
    );
  for (const f of r.findings
    .filter((x) => x.classification === 'interpretation' || x.classification === 'inference')
    .slice(0, 2))
    add(
      'financial',
      `This conclusion is interpretive, not calculated: "${f.text}". What data would confirm it?`,
      { kind: 'finding', text: f.text },
    );
  for (const c of r.counter.slice(0, 2))
    add('moat', `How does the thesis answer this counterevidence: "${c}"?`, {
      kind: 'finding',
      text: c,
    });
  for (const l of r.limitations.slice(0, 2))
    add('macro', `The research could not cover: "${l}". Does that gap change the recommendation?`, {
      kind: 'limitation',
      text: l,
    });
  if (!pitch.bear_case)
    add('downside', `What does the bear case for ${sym} look like in numbers?`, {
      kind: 'missing',
      text: 'No bear case recorded.',
    });
  if (
    !list(pitch.capital_allocation || []).length &&
    /buyback|dividend|acquisition|capex/i.test(text(pitch.thesis_full))
  )
    add(
      'capital',
      `The thesis mentions capital returns or investment; how has management allocated capital over the last three years?`,
      { kind: 'assumption', text: 'Capital allocation referenced in the thesis.' },
    );
  for (const o of (policy?.observations || []).filter((x) => x.concern))
    add(
      'policy',
      `${o.label}: ${o.scenario?.detail || o.current.detail} How would the committee address this recorded rule?`,
      { kind: 'policy', text: o.scenario?.detail || o.current.detail },
    );

  const grouped = QUESTION_CATEGORIES.map((c) => ({
    ...c,
    questions: out.filter((q) => q.category === c.id),
  })).filter((g) => g.questions.length);
  return {
    count: out.length,
    groups: grouped,
    note: 'Questions prepared from the pitch and its linked research. Sonar does not vote, approve or reject; the committee decides.',
  };
}

/** Bull, base and bear as recorded, side by side, with open questions. Never a verdict. */
export function decisionPreparation(pitch = {}, report = null) {
  const r = reportParts(report);
  return {
    bull: text(pitch.bull_case) || null,
    base: text(pitch.base_case || pitch.thesis_short) || null,
    bear: text(pitch.bear_case) || null,
    valuation: { method: pitch.valuation_method || null, targetPrice: pitch.target_price ?? null },
    evidence: r.findings
      .filter((f) => f.classification === 'fact')
      .map((f) => f.text)
      .slice(0, 6),
    dissent: r.counter.slice(0, 4),
    monitoring: list(pitch.monitoring || pitch.catalysts).slice(0, 5),
    note: 'Prepared for discussion. The vote is the committee’s.',
  };
}
