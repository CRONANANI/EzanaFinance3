/**
 * Sonar analyst team orchestration (Nov 2026).
 *
 * A coordinated pipeline inside the research engine, not free-running agents:
 *   1. planTeam: the router picks a lead and up to two (standard) or three (deep) supporting
 *      specialists; their required capabilities become required evidence for the planner.
 *   2. Shared retrieval runs once (the engine's tasks). scopeEvidence gives each specialist
 *      only the items whose source maps to its capabilities, each marked current or stale.
 *   3. runSpecialists: one model call per specialist, in parallel, with the lens, its skill
 *      sections, its rules and the standard output contract. Every finding passes the
 *      engine's claim validator; failures are removed or downgraded and logged.
 *   4. directorBlock: the validated findings feed the existing synthesis call (the Research
 *      Director), so standard runs gain specialists without another writing pass.
 *   5. Deep only: the red team challenges the director's draft, and a short director pass
 *      resolves each point (rebutted, incorporated, or listed as a limitation).
 *
 * Models come from tiers (SONAR_ANALYST_FAST_MODEL / SONAR_ANALYST_STRONG_MODEL, falling back
 * to the engine's models, passed in by the caller). Cost is estimated before calling and the
 * lowest-scoring supporting analyst is dropped first when the plan would exceed the ceiling.
 * Nothing here names a model, cost or internal id to the reader: the team view carries titles.
 */
import { ANALYSTS } from './registry.js';
import { routeAnalysts } from './analyst-router.js';
import {
  CAPABILITIES,
  engineSourcesFor,
  macroFamiliesFor,
  isStale,
} from './dataset-capabilities.js';
import { loadSkill } from './skills.js';
import { MACRO_LENS } from '../macro/playbook.js';
import { validateClaim, parseResearchJson } from '../engine/findings.js';

/* ── Planning ─────────────────────────────────────────────────────────────────────── */

/** Specialists whose methodology the org's research methodology shapes. */
export const METHODOLOGY_ANALYSTS = new Set(['valuation', 'portfolio-analyst', 'equity-research']);

/**
 * Route the team and say what evidence it needs.
 * @returns {{ routing, required: string[], preferred: string[], sources: string[], families: string[] }}
 */
export function planTeam({ spec, classification, route, orgId = null, available = null, mode }) {
  const routing = routeAnalysts({
    spec,
    classification: { ...(classification || {}), mode: mode || classification?.mode || 'standard' },
    route: route || {},
    ctx: { orgId, available },
  });
  const ids = teamIds(routing);
  const required = [...new Set(ids.flatMap((id) => ANALYSTS[id]?.required || []))];
  const preferred = [...new Set(ids.flatMap((id) => ANALYSTS[id]?.preferred || []))].filter(
    (c) => !required.includes(c),
  );
  return {
    routing,
    required,
    preferred,
    sources: engineSourcesFor(required),
    preferredSources: engineSourcesFor(preferred).filter(
      (s) => !engineSourcesFor(required).includes(s),
    ),
    families: macroFamiliesFor([...required, ...preferred]),
  };
}

export function teamIds(routing) {
  if (!routing?.lead) return [];
  return [routing.lead.id, ...(routing.supporting || []).map((s) => s.id)];
}

/* ── Evidence scoping and freshness ───────────────────────────────────────────────── */

/* Reverse maps: engine source -> capabilities, macro family -> capabilities. */
const BY_SOURCE = new Map();
const BY_FAMILY = new Map();
for (const [id, c] of Object.entries(CAPABILITIES)) {
  for (const s of c.engineSources || []) {
    if (!BY_SOURCE.has(s)) BY_SOURCE.set(s, []);
    BY_SOURCE.get(s).push(id);
  }
  for (const f of c.families || []) {
    if (!BY_FAMILY.has(f)) BY_FAMILY.set(f, []);
    BY_FAMILY.get(f).push(id);
  }
}

/** The capability an evidence item serves (macro rows by family), or null. */
export function capabilityOf(item) {
  const fam = item?.data?.family;
  if (fam && BY_FAMILY.has(fam)) return BY_FAMILY.get(fam)[0];
  return BY_SOURCE.get(item?.source)?.[0] || null;
}

/** The observation period of an item, as a period string the freshness check reads. */
function periodOf(item) {
  return item?.data?.period || item?.period?.to || item?.date || null;
}

/** Each item marked stale or current for its capability (unknown capability: not judged). */
export function markFreshness(marked, { now = new Date() } = {}) {
  return marked.map((e) => {
    const cap = capabilityOf(e);
    const p = periodOf(e);
    const stale = cap && p ? isStale(cap, String(p).slice(0, 10), { now }) : false;
    return { ...e, capability: cap, stale };
  });
}

/**
 * The evidence one specialist reads: items whose source (and, for macro rows, family) maps to
 * its capabilities. The same item can go to several analysts; it was fetched once. An analyst
 * whose capabilities matched nothing reads the top items so it can say what is missing.
 */
export function scopeEvidence(marked, capabilities, { fallback = 8 } = {}) {
  const caps = new Set(capabilities || []);
  const sources = new Set(engineSourcesFor([...caps]));
  const families = new Set(macroFamiliesFor([...caps]));
  const macroCaps = [...caps].some((c) => CAPABILITIES[c]?.kind === 'macro');
  const out = marked.filter((e) => {
    if (e.source === 'macro_series' || e.data?.metric === 'macro_series') {
      if (!macroCaps) return false;
      const fam = e.data?.family;
      return !fam || families.has(fam);
    }
    return sources.has(e.source);
  });
  return out.length ? out : marked.slice(0, fallback);
}

/* ── Prompts ──────────────────────────────────────────────────────────────────────── */

/** The standard contract every specialist returns (its skill adds fields). */
export const STANDARD_CONTRACT = `Return ONLY one JSON object, no prose around it:
{"analyst":"<id>","question":"<restated>","conclusion":"1 to 3 sentences answering your assignment","confidence":"high | moderate | low","confidenceReason":"...","findings":[{"claim":"...","label":"fact | calculation | interpretation | hypothesis","refs":["S3","M:metric_id"],"period":"2026-09"}],"counterevidence":["..."],"dataGaps":["..."],"handoffs":[{"analyst":"<id>","why":"..."}]}
Plus any fields your output contract below adds. Every number must come from a cited record [S#] or a computed metric [M:id], with its period. Never write a number neither supplies.`;

const MACRO_DOMAINS = new Set([
  'country',
  'macro',
  'commodity',
  'geopolitics',
  'market_performance',
]);
function touchesEconomies(spec, analyst) {
  return (
    analyst?.group === 'macro' ||
    analyst?.group === 'alternative' ||
    (spec?.domains || []).some((d) => MACRO_DOMAINS.has(d.id) && d.score >= 0.3)
  );
}

export function evidenceLines(items) {
  return items
    .map((e) =>
      `[${e.marker}] (${e.category || e.source}; ${e.period?.label || e.date || 'undated'}${e.stale ? '; not current' : ''}) ${e.title}. ${e.text}`.slice(
        0,
        700,
      ),
    )
    .join('\n');
}

export function metricLines(metrics) {
  return (metrics || [])
    .map(
      (m) =>
        `[M:${m.id}] ${m.label} = ${
          m.unit === 'ratio'
            ? `${(m.value * 100).toFixed(1)}%`
            : m.unit === 'percent'
              ? `${Number(m.value).toFixed(1)}%`
              : typeof m.value === 'object'
                ? JSON.stringify(m.value).slice(0, 200)
                : m.value
        }${m.period?.label ? ` (${m.period.label})` : ''} (method: ${m.method})`,
    )
    .join('\n');
}

/** Org methodology, as the specialist and the director read it (the loader's camelCase shape). */
export function methodologyBlock(methodology) {
  if (!methodology || methodology.isDefault) return '';
  const m = methodology;
  const methods = m.valuationMethods || m.valuation_methods || [];
  const sections = m.requiredSections || m.required_sections || [];
  const horizon = m.horizonMonths ?? m.horizon_months;
  const overrides = m.assumptionOverrides || m.assumption_overrides || {};
  const format = m.outputFormat || m.output_format;
  const parts = [
    methods.length
      ? `Preferred valuation methods: ${methods.join(', ').replace(/_/g, ' ')}.`
      : null,
    sections.length
      ? `Required report sections: ${sections.join(', ').replace(/_/g, ' ')}. Write "not available in Ezana data" for a section the evidence cannot fill.`
      : null,
    horizon ? `Horizon: ${horizon} months.` : null,
    m.scenariosRequired || m.scenarios_required ? 'Scenarios are required.' : null,
    Object.keys(overrides).length
      ? `Assumption overrides (label each use "per your fund's methodology"): ${Object.entries(
          overrides,
        )
          .filter(([, v]) => v != null && v !== '')
          .map(
            ([k, v]) =>
              `${k
                .replace(/([A-Z])/g, ' $1')
                .replace(/_/g, ' ')
                .toLowerCase()} ${v}`,
          )
          .join('; ')}.`
      : null,
    format ? `Output format: ${String(format).replace(/_/g, ' ')}.` : null,
  ].filter(Boolean);
  return parts.length ? `\n\nThe organization's research methodology:\n${parts.join('\n')}` : '';
}

export function specialistSystem({ analyst, mode, spec }) {
  const skill = loadSkill(analyst.skill, { mode: mode === 'deep' ? 'deep' : 'standard' });
  return [
    `You are Sonar's ${analyst.title}, one specialist on a research team. You answer only your assignment; the Research Director integrates the team's work. Findings only: no advice, no price targets in Ezana's voice, no motive or misconduct inferred from disclosures. No em dashes.`,
    touchesEconomies(spec, analyst) ? MACRO_LENS : null,
    skill,
    analyst.rules?.length
      ? `Rules the auditor checks:\n${analyst.rules.map((r) => `- ${r}`).join('\n')}`
      : null,
    STANDARD_CONTRACT,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function specialistUser({ assignment, spec, items, metrics, today, methodology }) {
  return `Today is ${today}.
Research question: ${spec.question}
The reader asked: "${String(spec.rawQuery || '').slice(0, 400)}"
Your assignment (${assignment.role}): ${assignment.task}

Evidence (cite as [S#]; "not current" items must be downgraded or labelled with their period):
${evidenceLines(items) || '(none)'}

Computed metrics (cite as M:id):
${metricLines(metrics) || '(none)'}${METHODOLOGY_ANALYSTS.has(assignment.analyst) ? methodologyBlock(methodology) : ''}`;
}

/* ── Validation ───────────────────────────────────────────────────────────────────── */

const LABEL_TO_CLASS = {
  fact: 'verified_fact',
  calculation: 'calculated_result',
  interpretation: 'analytical_interpretation',
  hypothesis: 'hypothesis',
};
const CLASS_TO_LABEL = Object.fromEntries(Object.entries(LABEL_TO_CLASS).map(([k, v]) => [v, k]));

/* Deterministic forms of registry rules, where a rule is checkable in text. */
const RULE_CHECKS = [
  {
    when: /both (quote )?conventions/i,
    test: (t) =>
      !/\b(lost|weaken|depreciat)/i.test(t) ||
      /dollar costs|more in local/i.test(t) ||
      !/%/.test(t),
    id: 'both_conventions',
  },
  {
    when: /ex-post/i,
    test: (t) => !/real (policy )?rate/i.test(t) || /ex-post/i.test(t),
    id: 'ex_post',
  },
  {
    when: /motive|intent|misconduct|wrongdoing|influence/i,
    test: (t) =>
      !/\b(insider|corrupt|bribe|illegal|improper|knew in advance|to influence)\b/i.test(t),
    id: 'no_motive',
  },
  {
    when: /ranges?/i,
    test: (t) => !/\b(bought|sold|purchased) (exactly )?\$\d[\d,.]*(?!\s*(to|and|-))/i.test(t),
    id: 'ranges',
  },
  {
    when: /ceiling/i,
    test: (t) => !/\bceiling\b.*\brevenue\b(?!.*\bnot\b)/i.test(t),
    id: 'ceiling_not_revenue',
  },
];

/** The rule checks that apply to an analyst (by its registry rules). */
export function ruleChecksFor(analyst) {
  const rules = analyst?.rules || [];
  return RULE_CHECKS.filter((c) => rules.some((r) => c.when.test(r)));
}

/**
 * Validate a specialist's parsed JSON: the contract shape, every finding through the engine's
 * claim validator, and the analyst's checkable rules. Returns the surviving output and a log.
 */
export function validateSpecialist(parsed, { analyst, marked, metrics }) {
  const log = [];
  if (!parsed || typeof parsed !== 'object' || typeof parsed.conclusion !== 'string') {
    return {
      ok: false,
      output: null,
      log: [{ problem: 'contract', detail: 'not the JSON contract' }],
    };
  }
  const byMarker = new Map(marked.map((e) => [e.marker, e]));
  const metricsById = new Map((metrics || []).map((m) => [m.id, m]));
  const checks = ruleChecksFor(analyst);
  const findings = [];
  for (const f of Array.isArray(parsed.findings) ? parsed.findings : []) {
    const text = String(f?.claim || '').trim();
    if (!text) continue;
    const refs = (Array.isArray(f.refs) ? f.refs : []).map((r) => String(r).replace(/[[\]]/g, ''));
    const v = validateClaim(
      {
        text,
        classification: LABEL_TO_CLASS[f.label] || 'analytical_interpretation',
        evidence: refs.filter((r) => /^S\d+$/.test(r)),
        metrics: refs.filter((r) => /^M:/.test(r)),
      },
      { byMarker, metricsById },
    );
    const ruleFail = checks.find((c) => !c.test(text));
    if (v.action === 'removed' || ruleFail) {
      log.push({
        claim: text.slice(0, 120),
        action: 'removed',
        problems: ruleFail ? [...v.problems, `rule:${ruleFail.id}`] : v.problems,
      });
      continue;
    }
    if (v.action === 'downgraded')
      log.push({ claim: text.slice(0, 120), action: 'downgraded', problems: v.problems });
    findings.push({
      claim: text.replace(/\s*\u2014\s*/g, ', '),
      label: CLASS_TO_LABEL[v.classification] || 'interpretation',
      refs,
      period: f.period ? String(f.period).slice(0, 20) : null,
    });
  }
  const conclusionV = validateClaim(
    {
      text: parsed.conclusion,
      classification: 'analytical_interpretation',
      evidence: findings.flatMap((f) => f.refs.filter((r) => /^S\d+$/.test(r))),
      metrics: findings.flatMap((f) => f.refs.filter((r) => /^M:/.test(r))),
    },
    { byMarker, metricsById },
  );
  const conclusionOk =
    conclusionV.action !== 'removed' || conclusionV.problems.every((p) => p === 'no_evidence');
  if (!conclusionOk)
    log.push({ claim: 'conclusion', action: 'removed', problems: conclusionV.problems });
  const conf = ['high', 'moderate', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low';
  return {
    ok: findings.length > 0 || conclusionOk,
    output: {
      conclusion: conclusionOk
        ? String(parsed.conclusion)
            .replace(/\s*\u2014\s*/g, ', ')
            .slice(0, 700)
        : null,
      /* A conclusion with nothing surviving under it is reported at low confidence. */
      confidence: findings.length ? conf : 'low',
      findings,
      counterevidence: (parsed.counterevidence || [])
        .filter((x) => typeof x === 'string')
        .slice(0, 5),
      dataGaps: (parsed.dataGaps || []).filter((x) => typeof x === 'string').slice(0, 8),
      handoffs: (parsed.handoffs || [])
        .filter((h) => h && ANALYSTS[h.analyst] && ANALYSTS[h.analyst].role !== 'control')
        .slice(0, 2),
    },
    log,
  };
}

/* ── Cost and budgets ─────────────────────────────────────────────────────────────── */

/* Approximate list prices per million tokens (input, output), for the pre-call ceiling. */
const PRICES = [
  [/haiku/i, 1, 5],
  [/sonnet/i, 3, 15],
  [/opus/i, 15, 75],
];
function priceOf(model) {
  return PRICES.find(([re]) => re.test(String(model || ''))) || PRICES[1];
}
export function callCostUsd(model, inputChars, outputTokens) {
  const [, pin, pout] = priceOf(model);
  return (Math.ceil(inputChars / 4) * pin + outputTokens * pout) / 1e6;
}

/** The run's cost ceiling for a mode, in US dollars. */
export function costCeilingUsd(mode, env = process.env) {
  const defaults = { standard: 0.05, deep: 0.6 };
  const raw = env.SONAR_RESEARCH_MAX_USD;
  if (raw) {
    try {
      const j = JSON.parse(raw);
      if (typeof j === 'number') return j;
      if (j && typeof j[mode] === 'number') return j[mode];
    } catch {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return defaults[mode] ?? defaults.standard;
}

/**
 * Drop the lowest-scoring supporting analysts until the estimated cost fits the ceiling.
 * `reserveUsd` is what the director and controls will spend. Returns the kept assignments
 * and the dropped ids.
 */
export function fitBudget(assignments, { routing, estimate, ceiling, reserveUsd = 0 }) {
  const kept = [...assignments];
  const dropped = [];
  const scoreOf = (id) => routing?.supporting?.find((s) => s.id === id)?.score ?? 1;
  let total = reserveUsd + kept.reduce((s, a) => s + estimate(a), 0);
  while (total > ceiling) {
    const support = kept.filter((a) => a.role === 'supporting');
    if (!support.length) break;
    const worst = support.sort((x, y) => scoreOf(x.analyst) - scoreOf(y.analyst))[0];
    kept.splice(kept.indexOf(worst), 1);
    dropped.push(worst.analyst);
    total = reserveUsd + kept.reduce((s, a) => s + estimate(a), 0);
  }
  return { kept, dropped, estimatedUsd: Number(total.toFixed(4)) };
}

/* ── Execution ────────────────────────────────────────────────────────────────────── */

const titleOf = (id) => ANALYSTS[id]?.title || 'Analyst';

/**
 * Run the routed specialists in parallel. A specialist that fails or times out is reported
 * as missing; the run continues. In deep mode one handoff may add one more analyst.
 * @returns {Promise<{ specialists, log, dropped, estimatedUsd }>}
 */
export async function runSpecialists({
  routing,
  spec,
  marked,
  metrics,
  mode,
  deadlineAt,
  emit = () => {},
  methodology = null,
  synth,
  models,
  today,
  minHopMs = 2_000,
}) {
  const tier = (a) => (a.tier?.[mode] === 'strong' ? models.strong : models.fast);
  const fresh = marked;
  const prepared = (routing.assignments || []).map((asg) => {
    const analyst = ANALYSTS[asg.analyst];
    const items = scopeEvidence(fresh, asg.capabilities);
    const system = specialistSystem({ analyst, mode, spec });
    const user = specialistUser({ assignment: asg, spec, items, metrics, today, methodology });
    const maxTokens = analyst.maxOutputTokens?.[mode] || 700;
    return {
      ...asg,
      analyst: asg.analyst,
      profile: analyst,
      items,
      system,
      user,
      maxTokens,
      model: tier(analyst),
    };
  });
  const ceiling = costCeilingUsd(mode);
  const directorTokens = ANALYSTS['research-director'].maxOutputTokens[mode] || 1100;
  const reserveUsd =
    callCostUsd(models.strong, 12_000 + fresh.length * 500, directorTokens) +
    (mode === 'deep' ? 2 * callCostUsd(models.strong, 10_000, 1200) : 0);
  const { kept, dropped, estimatedUsd } = fitBudget(prepared, {
    routing,
    ceiling,
    reserveUsd,
    estimate: (p) => callCostUsd(p.model, p.system.length + p.user.length, p.maxTokens),
  });

  const runOne = async (p) => {
    emit('analyst', { id: p.analyst, title: titleOf(p.analyst), role: p.role, status: 'started' });
    try {
      const out = await synth({
        system: p.system,
        user: p.user,
        maxTokens: p.maxTokens,
        model: p.model,
        fallbackModel: models.fast,
        webSearch: { enabled: false },
        deadlineAt,
        minHopMs,
        reserveMs: 0,
      });
      const parsed = parseResearchJson(out?.answer);
      const v = validateSpecialist(parsed, { analyst: p.profile, marked: fresh, metrics });
      const status = v.ok ? 'done' : 'failed';
      emit('analyst', { id: p.analyst, title: titleOf(p.analyst), role: p.role, status });
      return {
        id: p.analyst,
        title: titleOf(p.analyst),
        role: p.role,
        reason: reasonOf(routing, p.analyst),
        status: v.ok ? 'done' : 'missing',
        ...(v.output || {
          conclusion: null,
          confidence: null,
          findings: [],
          counterevidence: [],
          dataGaps: [],
          handoffs: [],
        }),
        evidenceMarkers: p.items.map((e) => e.marker),
        log: v.log,
        model: out?.model || p.model,
      };
    } catch {
      emit('analyst', { id: p.analyst, title: titleOf(p.analyst), role: p.role, status: 'failed' });
      return {
        id: p.analyst,
        title: titleOf(p.analyst),
        role: p.role,
        reason: reasonOf(routing, p.analyst),
        status: 'missing',
        conclusion: null,
        confidence: null,
        findings: [],
        counterevidence: [],
        dataGaps: [],
        handoffs: [],
        evidenceMarkers: p.items.map((e) => e.marker),
        log: [{ problem: 'call_failed' }],
      };
    }
  };

  const specialists = await Promise.all(kept.map(runOne));

  /* Deep only: one handoff may add one analyst not already running. */
  if (mode === 'deep' && Date.now() < deadlineAt - 30_000) {
    const running = new Set(specialists.map((s) => s.id));
    const ask = specialists.flatMap((s) => s.handoffs || []).find((h) => !running.has(h.analyst));
    if (ask) {
      const analyst = ANALYSTS[ask.analyst];
      const asg = {
        analyst: ask.analyst,
        role: 'supporting',
        task: `Handoff: ${String(ask.why || '').slice(0, 200)}. Contribute only what the team does not cover.`,
        capabilities: [...analyst.required, ...analyst.preferred],
      };
      const items = scopeEvidence(fresh, asg.capabilities);
      const p = {
        ...asg,
        profile: analyst,
        items,
        system: specialistSystem({ analyst, mode, spec }),
        user: specialistUser({ assignment: asg, spec, items, metrics, today, methodology }),
        maxTokens: analyst.maxOutputTokens?.[mode] || 700,
        model: tier(analyst),
      };
      const extra = await runOne(p);
      extra.reason = "Added at another analyst's request.";
      specialists.push(extra);
    }
  }

  return { specialists, dropped, estimatedUsd };
}

function reasonOf(routing, id) {
  const s = [routing?.lead, ...(routing?.supporting || [])].find((x) => x?.id === id);
  const why = s?.reasons || s?.why || null;
  if (Array.isArray(why) && why.length) return plainReason(why);
  if (typeof why === 'string') return why;
  return id === routing?.lead?.id
    ? 'Leads on the core of the question.'
    : 'Adds evidence the lead does not cover.';
}

/* Router reasons are terse ("domain country", "theme currency", "operations exposure",
   "objective"); say them plainly, without internal vocabulary. */
const DOMAIN_WORDS = {
  company_financials: 'reported financials',
  congress_trading: 'congressional trading',
  market_performance: 'market performance',
  analyst_views: 'analyst views',
  institutional: 'institutional ownership',
};
export function plainReason(reasons) {
  const words = [];
  for (const raw of reasons.map(String)) {
    let m;
    if ((m = /^domain (.+)$/.exec(raw))) words.push(DOMAIN_WORDS[m[1]] || m[1].replace(/_/g, ' '));
    else if ((m = /^(?:related )?theme (.+)$/.exec(raw))) words.push(m[1]);
    else if ((m = /^operations (.+)$/.exec(raw))) words.push(m[1].replace(/_/g, ' '));
    else if (raw === 'objective') words.push("the question's objective");
  }
  const uniq = [...new Set(words)].slice(0, 3);
  return uniq.length ? `Chosen for ${uniq.join('; ')}.` : 'Chosen for this question.';
}

/* ── Director ─────────────────────────────────────────────────────────────────────── */

/** The director's added instructions (skill sections without its own output contract). */
export function directorSystemAddendum(mode) {
  const skill = loadSkill('research-direction', {
    sections:
      mode === 'deep'
        ? [
            'objective',
            'procedure',
            'mandatoryChecks',
            'commonMistakes',
            'interpretation',
            'missingData',
          ]
        : ['objective', 'procedure', 'mandatoryChecks', 'missingData'],
  });
  return `

You are the Chief Research Director. Specialists have already analysed the evidence; their validated findings follow the sources. Write the report in the format above:
- Answer first. Integrate rather than concatenate.
- Resolve disagreements explicitly: state both views and which evidence favours which.
- Keep the fact / calculation / interpretation / hypothesis labels.
- Carry the specialists' data gaps into the limitations.
- Never introduce a number no specialist, record or metric supplied.
${skill}`;
}

/** The specialists' validated work, as the director reads it. */
export function directorBlock(specialists) {
  const done = specialists.filter((s) => s.status === 'done');
  const missing = specialists.filter((s) => s.status !== 'done');
  const lines = done.map(
    (s) =>
      `### ${s.title} (${s.role}; confidence ${s.confidence})\nConclusion: ${s.conclusion || 'none'}\n${s.findings
        .map(
          (f) =>
            `- [${f.label}] ${f.claim} ${f.refs.map((r) => `[${r}]`).join('')}${f.period ? ` (${f.period})` : ''}`,
        )
        .join(
          '\n',
        )}${s.counterevidence.length ? `\nCounterevidence: ${s.counterevidence.join('; ')}` : ''}${
        s.dataGaps.length ? `\nData gaps: ${s.dataGaps.join('; ')}` : ''
      }`,
  );
  if (missing.length)
    lines.push(`Specialists with no usable findings: ${missing.map((s) => s.title).join(', ')}.`);
  return lines.length ? `\n\nSpecialist findings (validated):\n${lines.join('\n\n')}` : '';
}

/* ── Red team (deep) ──────────────────────────────────────────────────────────────── */

export const RED_TEAM_KINDS = [
  'alternative',
  'missing_evidence',
  'base_rate',
  'fragility',
  'falsifier',
  'downgrade',
];

export function redTeamSystem() {
  return `You are Sonar's Independent Red-Team Analyst. Challenge the draft report below: alternative explanations, missing evidence, base rates, scenario fragility, falsifiers and confidence downgrades. Each point is cited to the evidence [S#] or a metric [M:id], or labelled hypothesis. Findings only; no em dashes.

${loadSkill('red-team-review', { mode: 'standard' })}

Return ONLY JSON: {"verdict":"holds | weakened | refuted | unclear","points":[{"kind":"alternative | missing_evidence | base_rate | fragility | falsifier | downgrade","text":"...","refs":["S3"]}]}. At most 6 points.`;
}

export function parseRedTeam(text) {
  const j = parseResearchJson(text);
  if (!j || !Array.isArray(j.points)) return null;
  return {
    verdict: ['holds', 'weakened', 'refuted', 'unclear'].includes(j.verdict)
      ? j.verdict
      : 'unclear',
    points: j.points
      .filter((p) => p && typeof p.text === 'string' && p.text.trim())
      .slice(0, 6)
      .map((p) => ({
        kind: RED_TEAM_KINDS.includes(p.kind) ? p.kind : 'alternative',
        text: p.text.replace(/\s*\u2014\s*/g, ', ').slice(0, 500),
        refs: (Array.isArray(p.refs) ? p.refs : [])
          .map(String)
          .filter((r) => /^(S\d+|M:.+)$/.test(r)),
      })),
  };
}

/** The director's final pass: each red-team point rebutted, incorporated or a limitation. */
export function resolutionSystem() {
  return `You are the Chief Research Director answering the red team's challenge to your draft. For EACH point, choose: "rebutted" (cite the evidence that answers it), "incorporated" (one sentence the report adds, cited), or "limitation" (one sentence for the limitations). Never introduce a number no record or metric supplied. No em dashes.
Return ONLY JSON: {"resolutions":[{"point":0,"resolution":"rebutted | incorporated | limitation","note":"...","refs":["S3"]}]}`;
}

export function applyResolutions(redTeam, parsed) {
  const res = Array.isArray(parsed?.resolutions) ? parsed.resolutions : [];
  return {
    ...redTeam,
    points: redTeam.points.map((p, i) => {
      const r = res.find((x) => Number(x?.point) === i);
      const resolution = ['rebutted', 'incorporated', 'limitation'].includes(r?.resolution)
        ? r.resolution
        : 'limitation';
      return {
        ...p,
        resolution,
        note:
          typeof r?.note === 'string'
            ? r.note.replace(/\s*\u2014\s*/g, ', ').slice(0, 400)
            : p.text,
        noteRefs: (Array.isArray(r?.refs) ? r.refs : []).map(String),
      };
    }),
  };
}

/* ── The reader's view ────────────────────────────────────────────────────────────── */

/** report.team: titles, reasons, conclusions, findings, audit, red team, methodology. */
export function teamView({
  routing,
  specialists,
  audit,
  redTeam = null,
  metrics = [],
  marked = [],
  mode,
}) {
  const lead = routing?.lead
    ? {
        id: routing.lead.id,
        title: titleOf(routing.lead.id),
        reason: reasonOf(routing, routing.lead.id),
      }
    : null;
  const supporting = specialists
    .filter((s) => s.role === 'supporting')
    .map((s) => ({ id: s.id, title: s.title, reason: s.reason }));
  const usedMetricIds = new Set(
    specialists.flatMap((s) =>
      s.findings.flatMap((f) => f.refs.filter((r) => r.startsWith('M:')).map((r) => r.slice(2))),
    ),
  );
  const calcs = metrics
    .filter((m) => usedMetricIds.has(m.id) || usedMetricIds.size === 0)
    .slice(0, 12);
  return {
    mode,
    lead,
    supporting,
    specialists: specialists.map((s) => ({
      id: s.id,
      title: s.title,
      role: s.role,
      reason: s.reason,
      status: s.status,
      conclusion: s.conclusion,
      confidence: s.confidence,
      findings: s.findings,
    })),
    audit: audit ? { passed: audit.passed, total: audit.total, checks: audit.checks } : null,
    redTeam,
    methodology: {
      analysts: specialists.filter((s) => s.status === 'done').map((s) => s.title),
      calculations: calcs.map((m) => ({ id: m.id, label: m.label, method: m.method })),
      freshness: marked
        .filter((e) => e.capability)
        .slice(0, 16)
        .map((e) => ({
          label: e.title,
          period: e.period?.label || e.date || null,
          stale: Boolean(e.stale),
        })),
      gaps: [...new Set(specialists.flatMap((s) => s.dataGaps || []))].slice(0, 12),
    },
  };
}

/* ── Engine calculations the team cites (quant.js) ───────────────────────────────── */

const pctUnit = (u) => /%|percent/i.test(String(u || ''));
const asMetric = (q, label, value, unit = 'percent') =>
  q && q.value != null && Number.isFinite(Number(value))
    ? {
        id: q.id,
        label,
        value: Number(value),
        unit,
        method: q.method,
        period: q.periods?.length ? { label: q.periods.filter(Boolean).join(' to ') } : null,
        inputs: q.inputs || [],
        warnings: q.warnings || [],
      }
    : null;

/** The point about 12 months before the last one in a history ([{period, value}]). */
function yearBefore(history) {
  const h = (history || []).filter((p) => p && Number.isFinite(Number(p.value)));
  if (h.length < 2) return null;
  const last = String(h[h.length - 1].period);
  const y = Number(last.slice(0, 4)) - 1;
  const target = `${y}${last.slice(4)}`;
  return [...h].reverse().find((p) => String(p.period) <= target) || null;
}

/**
 * Metrics the specialists cite as M:id, computed by the quantitative engine from the
 * structured macro evidence: the exchange-rate move in both conventions, the ex-post real
 * rate, and the real effective rate against its own history. Pure; `quant` is quant.js.
 */
export function teamMetrics(marked, quant) {
  if (!quant) return [];
  const out = [];
  const byFam = (f) => marked.filter((e) => e.data?.family === f && e.data?.value != null);
  const fx = byFam('fx_usd').find(
    (e) => Array.isArray(e.data.history) && e.data.history.length > 12,
  );
  if (fx) {
    const h = fx.data.history.map((p) => ({ period: String(p.period), value: Number(p.value) }));
    const old = yearBefore(h);
    const now = h[h.length - 1];
    if (old && now) {
      const q = quant.bothConventionsFx(old, now, { id: 'fx_both_1y', inputs: [fx.marker] });
      out.push(
        asMetric(
          { ...q, id: 'fx_dollar_dearer_1y' },
          'Dollar dearer in local currency over a year',
          q?.value?.dollarDearerPct,
        ),
      );
      out.push(
        asMetric(
          { ...q, id: 'fx_value_lost_1y' },
          'Value the currency lost against the dollar over a year',
          q?.value?.valueLostPct,
        ),
      );
    }
  }
  const pol = byFam('policy_rate')[0];
  const infl =
    byFam('inflation_monthly').find((e) => pctUnit(e.data.unit) || e.data.derived) ||
    byFam('inflation_annual')[0];
  if (pol && infl) {
    const q = quant.realRateExPost(
      { value: Number(pol.data.value), period: pol.data.period },
      { value: Number(infl.data.value), period: infl.data.period },
      { id: 'real_rate_ex_post', inputs: [pol.marker, infl.marker] },
    );
    out.push(
      asMetric(
        q,
        'Ex-post real policy rate (policy rate minus latest annual inflation)',
        typeof q?.value === 'object' ? q.value?.value : q?.value,
        'pp',
      ),
    );
  }
  const reer = byFam('fx_effective').find(
    (e) => Array.isArray(e.data.history) && e.data.history.length >= 24,
  );
  if (reer) {
    const q = quant.percentileVsHistory(
      reer.data.history.map((p) => ({ period: String(p.period), value: Number(p.value) })),
      10,
      { id: 'reer_percentile_10y', inputs: [reer.marker] },
    );
    out.push(
      asMetric(
        q,
        'Real effective exchange rate, percentile of its own 10-year history',
        typeof q?.value === 'object' ? q.value?.percentile : q?.value,
        'percentile',
      ),
    );
  }
  return out.filter(Boolean);
}
