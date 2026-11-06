/**
 * Sonar analyst quality scorecard (Phase 4.2). OFFLINE ONLY: uses models, not in CI.
 *
 * Runs chosen cases end to end through runResearch against FROZEN evidence snapshots
 * (eval/sonar/snapshots/<case-id>.json, captured by scripts/sonar-analyst-snapshot.mjs), so
 * scores move with the engine and the prompts, never with the data. Writes
 * eval/sonar/reports/<date>.md with a comparison against the previous report.
 *
 *   ANTHROPIC_API_KEY=... node --no-warnings --import ./scripts/register-sonar-loader.mjs \
 *     scripts/sonar-analyst-quality.mjs
 *     [--benchmarks]               the four regression benchmarks (default when nothing else is given)
 *     [--cases id1,id2]            evaluation case ids (must have snapshots)
 *     [--mode quick|standard|deep] override every case's mode
 *     [--no-judge]                 deterministic scoring only (no judge call)
 *     [--judge-model <id>]         judge model (default SONAR_EVAL_JUDGE_MODEL or claude-opus-5-5)
 *     [--snapshots eval/sonar/snapshots] [--reports eval/sonar/reports]
 *
 * Release routine: run with --benchmarks (Turkey lira, Microsoft AI infrastructure, Palantir
 * dependence, NVIDIA risks) and paste the four scorecards from the report.
 *
 * ENGINE HOOK this script needs in runResearch (src/lib/sonar/engine/engine.js):
 *
 *   opts.evidenceOverride = {
 *     resolution?: object,   // used instead of resolveResearch() (skip the 'resolve' leg)
 *     runners?: object,      // consulted per source BEFORE RUNNERS: evidenceOverride.runners[source]
 *     memory?: array,        // used instead of recallEvidence(); [] means no recall
 *   } | null                 // default null: production behaviour unchanged
 *
 *   resolution = evidenceOverride?.resolution ?? await leg('resolve', ...)
 *   memory     = evidenceOverride ? (evidenceOverride.memory || []) : await recallEvidence(...)
 *   runnerFor  = (source) => evidenceOverride?.runners?.[source] ?? RUNNERS[source]
 *   Every place that calls a runner goes through runnerFor: the planned task loop, the memo
 *   macro_series country-context step (today `RUNNERS.macro_series`), and any retrieval the
 *   analyst wiring adds. Nothing else changes; specialists, director, auditor and red team run
 *   for real on the replayed evidence. Specialist calls must honour opts.signal (the snapshot
 *   script aborts on the `evidence` event so a capture never calls a model).
 *
 * Optional, read if present (scored as "not reported" otherwise):
 *   - routing in the plan event or the run: phase1.routing | run.methodology.routing
 *     ({ lead, supporting, controls }); without it the offline router decision is scored;
 *   - run.researchMetadata.cost ({ usd } or a number) and .usage ({ inputTokens, outputTokens });
 *   - run.audit or run.methodology.audit ({ checks: [{ id, ok }] }).
 *
 * Replay isolation: admin is a blocked client (every query resolves to an error and is
 * listed in the report as a leak), `now` is the snapshot's capturedAt, memory recall is off.
 * SONAR_EVAL_ENGINE_MODULE=<path> swaps the engine module (testing the harness only).
 *
 * Scoring: 8 dimensions, each 0..5. Deterministic checks first (mustNotClaim patterns,
 * numbers traced to evidence or metrics, periods, plan coverage, the audit, budgets), then a
 * judge with a fixed rubric for what code cannot check. A dimension's score is the mean of
 * its deterministic part (scaled to 5) and the judge's score, whichever exist. Cost and
 * latency is deterministic only.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { ROOT, loadEvalCases, planCase } from './lib/sonar-eval-cases.mjs';
import { BENCHMARK_CASES, replayRunners, blockedAdmin } from './lib/sonar-quality.mjs';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const SNAP_DIR = path.resolve(ROOT, opt('--snapshots') || 'eval/sonar/snapshots');
const REPORT_DIR = path.resolve(ROOT, opt('--reports') || 'eval/sonar/reports');
const MODE = opt('--mode');
const NO_JUDGE = args.includes('--no-judge');
const JUDGE_MODEL = opt('--judge-model') || process.env.SONAR_EVAL_JUDGE_MODEL || 'claude-opus-5-5';

export const DIMENSIONS = [
  ['objective', 'Objective understanding'],
  ['dataset', 'Dataset selection'],
  ['accuracy', 'Analytical accuracy'],
  ['grounding', 'Evidence grounding'],
  ['temporal', 'Temporal accuracy'],
  ['crossDomain', 'Cross-domain reasoning'],
  ['uncertainty', 'Uncertainty handling'],
  ['cost', 'Cost and latency'],
];
const JUDGED = DIMENSIONS.map(([k]) => k).filter((k) => k !== 'cost');

/* Cost ceilings per mode (SONAR_RESEARCH_MAX_USD overrides standard and deep, as in the
   orchestrator); latency budgets come from the engine's DEPTH_PROFILES. */
const COST_CEILING = {
  quick: 0.01,
  standard: Number(process.env.SONAR_RESEARCH_MAX_USD_STANDARD) || 0.05,
  deep: Number(process.env.SONAR_RESEARCH_MAX_USD_DEEP) || 0.6,
};

/* ── Deterministic checks ──────────────────────────────────────────────────── */

/* mustNotClaim entries are prose. These patterns fire when an entry names a class of
   overclaim AND the answer contains the matching wording. A hit is a flag quoted in the
   report; the judge rules on every entry as well. */
const CLAIM_PATTERNS = [
  {
    when: /recommend|advice|buy|sell|enter the trade|should (?:our )?fund/i,
    re: /\b(we recommend|you should (?:buy|sell)|(?:a )?(?:strong )?(?:buy|sell) (?:rating|signal)|investors should|consider (?:buying|selling))\b/i,
    label: 'advice',
  },
  {
    when: /price target|exact price|price .* will hit/i,
    re: /\b(price target|target price|will (?:hit|reach|trade at) \$?\d)/i,
    label: 'price target',
  },
  {
    when: /crisis/i,
    re: /(?<!\b(?:no|not|nor|without|short of|rather than|than)\b[^.]{0,25})\bcrisis\b(?! (?:is )?not established)/i,
    label: 'crisis',
  },
  {
    when: /predict|forecast|will (?:keep|rise|fall|rebound|double)|certain/i,
    re: /\b(will (?:certainly|definitely|surely)?\s*(?:rise|fall|rebound|double|collapse|keep (?:rising|falling)))\b/i,
    label: 'forecast as fact',
  },
  {
    when: /undervalued|overvalued|fair value/i,
    re: /\b(is (?:clearly |significantly )?(?:undervalued|overvalued)|fair value (?:is|of) \$?\d)/i,
    label: 'fair-value verdict',
  },
  { when: /devaluation/i, re: /\bdevalu(?:ed|ation)\b/i, label: 'devaluation' },
  {
    when: /motive|insider knowledge|wrongdoing|misconduct|illegal|influence/i,
    re: /\b(insider (?:knowledge|information)|illegal|corrupt\w*|bought influence|in exchange for|because (?:he|she|they) knew)\b/i,
    label: 'motive or misconduct',
  },
  {
    when: /100%|certain|guarantee|no hedging/i,
    re: /\b(100% (?:confident|certain)|guarantee[ds]?|certainly will|without (?:any )?doubt)\b/i,
    label: 'certainty',
  },
  {
    when: /ceiling/i,
    re: /\bceiling\b[^.]{0,60}\b(revenue|sales)\b/i,
    label: 'ceiling as revenue',
  },
  {
    when: /official/i,
    re: /\bofficial (?:threshold|classification)s?\b/i,
    label: 'thresholds as official',
  },
];

const sentences = (t) =>
  String(t || '')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

export function claimFlags(text, mustNotClaim = []) {
  const flags = [];
  for (const entry of mustNotClaim) {
    for (const p of CLAIM_PATTERNS) {
      if (!p.when.test(entry)) continue;
      const hit = sentences(text).find((s) => p.re.test(s));
      if (hit) flags.push({ entry, label: p.label, quote: hit.slice(0, 220) });
    }
  }
  return flags;
}

const YEAR_RE = /^(19|20)\d\d$/;
/** Numbers a text asserts (years and small counts excluded). */
export function numbersIn(text) {
  const out = [];
  for (const m of String(text || '').matchAll(/(?<![\w.])-?\d[\d,]*(?:\.\d+)?%?/g)) {
    const raw = m[0].replace(/,/g, '');
    const n = Number(raw.replace('%', ''));
    if (
      !Number.isFinite(n) ||
      YEAR_RE.test(raw) ||
      (Number.isInteger(n) && Math.abs(n) <= 10 && !raw.includes('%'))
    )
      continue;
    out.push(n);
  }
  return out;
}

/** Share of asserted numbers found in the evidence text or metric values (0.5% or 0.05 tolerance). */
export function numberGrounding(text, evidence = [], metrics = []) {
  const claimed = numbersIn(text);
  if (!claimed.length) return null;
  const pool = new Set();
  for (const e of evidence)
    numbersIn(`${e.title || ''} ${e.text || ''}`).forEach((n) => pool.add(n));
  for (const m of metrics) {
    for (const v of [m.value, m.current, m.change, m.pct, m.previous])
      if (Number.isFinite(Number(v))) pool.add(Number(v));
    numbersIn(`${m.label || ''} ${m.text || ''} ${m.display || ''}`).forEach((n) => pool.add(n));
  }
  const values = [...pool];
  const ok = (n) => values.some((v) => Math.abs(v - n) <= Math.max(0.05, Math.abs(v) * 0.005));
  return claimed.filter(ok).length / claimed.length;
}

const PERIOD_RE =
  /\b((19|20)\d\d|Q[1-4]|FY\s?\d{2,4}|H[12]|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|year[- ]ago|y\/y|month|quarter)/i;
/** Share of numeric findings that carry a period. */
export function periodCoverage(findings = []) {
  const numeric = findings.filter((f) => numbersIn(f).length);
  if (!numeric.length) return null;
  return numeric.filter((f) => PERIOD_RE.test(f)).length / numeric.length;
}

/** Sentences that state a period after the snapshot clock as fact (no forward wording). */
export function futureAsFact(text, capturedAt) {
  const year = new Date(capturedAt).getUTCFullYear();
  const FORWARD =
    /\b(project\w*|forecast\w*|expect\w*|estimate\w*|scenario|if |could|may|might|would|consensus|guidance|plan\w*|target\w*|WEO)\b/i;
  return sentences(text).filter((s) => {
    const years = [...s.matchAll(/\b(20\d\d)\b/g)].map((m) => Number(m[1]));
    return years.some((y) => y > year) && !FORWARD.test(s);
  });
}

/* ── Run, read and score ───────────────────────────────────────────────────── */

const mean = (xs) => {
  const v = xs.filter((x) => x != null && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const clamp01 = (x) => (x == null ? null : Math.max(0, Math.min(1, x)));
const idOf = (x) => (typeof x === 'string' ? x : x?.id || x?.analyst || null);

function claimTextOf(run) {
  return [
    run.executiveConclusion?.text,
    ...(run.keyFindings || []).map((f) => `${f.title || ''}. ${f.explanation || f.text || ''}`),
    ...(run.analysis || []).map((a) => a.text),
    run.brief,
  ]
    .filter(Boolean)
    .join('\n');
}

function routingOf(run, phase1, offline) {
  const r = phase1?.routing || run?.methodology?.routing || run?.routing || null;
  if (r && (r.lead || r.supporting)) {
    return {
      source: 'engine',
      lead: idOf(r.lead),
      supporting: (r.supporting || []).map(idOf),
      controls: r.controls || [],
    };
  }
  return {
    source: 'offline router',
    lead: offline.routing.lead?.id || null,
    supporting: offline.routing.supporting.map((s) => s.id),
    controls: offline.routing.controls,
  };
}

function costOf(run) {
  const m = run?.researchMetadata || {};
  const c = m.cost;
  const usd =
    typeof c === 'number'
      ? c
      : Number.isFinite(c?.usd)
        ? c.usd
        : Number.isFinite(m.costUsd)
          ? m.costUsd
          : null;
  return { usd, usage: m.usage || null };
}

function auditOf(run) {
  const a = run?.audit || run?.methodology?.audit || null;
  const checks = Array.isArray(a?.checks) ? a.checks : [];
  if (!checks.length) return null;
  return {
    passed: checks.filter((c) => c.ok || c.pass || c.status === 'pass').length,
    total: checks.length,
  };
}

async function loadCapabilities() {
  const caps = await import('@/lib/sonar/analysts/dataset-capabilities');
  const reg = await import('@/lib/sonar/analysts/registry');
  return { CAPABILITIES: caps.CAPABILITIES, ANALYSTS: reg.ANALYSTS };
}

/** Did a capability's source return items in the replay? Macro capabilities need their family. */
function capabilityServed(cap, served, CAPABILITIES) {
  const c = CAPABILITIES[cap];
  if (!c) return false;
  if (c.kind === 'macro') {
    return served.some(
      (s) =>
        s.items > 0 &&
        (s.source === 'macro_country' ||
          (s.source === 'macro_series' &&
            (!s.families || s.families.some((f) => (c.families || []).includes(f))))),
    );
  }
  return (c.engineSources || []).some((src) => served.some((s) => s.source === src && s.items > 0));
}

function deterministic(c, ctx) {
  const { run, routing, replayLog, served, snapshot, leaks, CAPABILITIES, ANALYSTS, durationMs } =
    ctx;
  const text = claimTextOf(run);
  const evidence = run.evidence || [];
  const metrics = run.quantitativeMetrics || [];
  const stats = run.researchMetadata?.validation || null;
  const findings = (run.keyFindings || []).map(
    (f) => `${f.title || ''}. ${f.explanation || f.text || ''}`,
  );
  const d = {};
  const notes = {};

  /* 1. Objective: lead and supporting analysts. */
  const supportRecall = c.supporting?.length
    ? c.supporting.filter(
        (s) => routing.supporting.includes(s) || routing.controls.includes(s) || routing.lead === s,
      ).length / c.supporting.length
    : 1;
  d.objective = mean([routing.lead === c.lead ? 1 : 0, supportRecall]);
  notes.objective = `lead ${routing.lead || 'none'} (expected ${c.lead}), supporting [${routing.supporting.join(', ')}] (${routing.source})`;

  /* 2. Dataset selection: mustUse capabilities served with items; replay drift penalised. */
  const unserved = (c.mustUse || []).filter((cap) => !capabilityServed(cap, served, CAPABILITIES));
  const coverage = c.mustUse?.length ? 1 - unserved.length / c.mustUse.length : null;
  const misses = replayLog.filter((l) => l.match !== 'exact').length;
  const drift = replayLog.length ? 1 - misses / replayLog.length : null;
  d.dataset = mean([coverage, drift]);
  notes.dataset = `${unserved.length ? `not served: ${unserved.join(', ')}` : 'all mustUse served'}; replay ${replayLog.length - misses}/${replayLog.length} exact${leaks.length ? `; DB leaks: ${[...new Set(leaks)].join(', ')}` : ''}`;

  /* 3. Analytical accuracy: required computations present among metrics; numeric accuracy. */
  const metricNames = metrics.map((m) =>
    `${m.id || ''} ${m.method || ''} ${m.fn || ''}`.toLowerCase(),
  );
  const missingCompute = (c.mustCompute || []).filter(
    (fn) => !metricNames.some((n) => n.includes(fn.toLowerCase())),
  );
  const computeCoverage = c.mustCompute?.length
    ? 1 - missingCompute.length / c.mustCompute.length
    : null;
  const unsupportedNumbers = (run.researchMetadata?.validationLog || []).filter((l) =>
    (l.problems || []).some((p) => String(p).startsWith('unsupported_numbers')),
  ).length;
  const numericAccuracy = stats?.claims ? 1 - unsupportedNumbers / Math.max(1, stats.claims) : null;
  d.accuracy = mean([computeCoverage, numericAccuracy]);
  notes.accuracy = `${missingCompute.length ? `computations not in metrics: ${missingCompute.join(', ')}` : 'all mustCompute present'}; ${unsupportedNumbers} claim(s) removed for unsupported numbers`;

  /* 4. Evidence grounding: citation coverage, claim support, numbers traced, the audit. */
  const numbers = numberGrounding(text, evidence, metrics);
  const audit = auditOf(run);
  d.grounding = mean([
    stats?.citationCoverage ?? null,
    stats?.claimSupportRate ?? null,
    numbers,
    audit ? audit.passed / audit.total : null,
  ]);
  notes.grounding = `citation ${fmt(stats?.citationCoverage)}, claim support ${fmt(stats?.claimSupportRate)}, numbers traced ${fmt(numbers)}${audit ? `, audit ${audit.passed}/${audit.total}` : ', audit not reported'}`;

  /* 5. Temporal accuracy: numeric findings carry periods; no future period stated as fact. */
  const periods = periodCoverage(findings);
  const future = futureAsFact(text, snapshot.capturedAt);
  d.temporal = mean([periods, future.length ? Math.max(0, 1 - future.length / 3) : 1]);
  notes.temporal = `periods on numeric findings ${fmt(periods)}${future.length ? `; future stated as fact: "${future[0].slice(0, 140)}"` : ''}`;

  /* 6. Cross-domain: each expected supporting specialist's evidence is cited. */
  const specialists = (c.supporting || []).filter((id) => ANALYSTS[id]?.role !== 'control');
  if (specialists.length) {
    const cited = new Set(evidence.map((e) => e.source));
    const covered = specialists.filter((id) => {
      const caps = [...(ANALYSTS[id]?.required || []), ...(ANALYSTS[id]?.preferred || [])];
      return caps.some((cap) => {
        const k = CAPABILITIES[cap];
        if (!k) return false;
        return k.kind === 'macro'
          ? cited.has('macro_series') || cited.has('macro_country')
          : (k.engineSources || []).some((s) => cited.has(s));
      });
    });
    d.crossDomain = covered.length / specialists.length;
    notes.crossDomain = `evidence cited for ${covered.length}/${specialists.length} supporting specialists`;
  } else {
    d.crossDomain = null;
    notes.crossDomain = 'single-specialist case (judge only)';
  }

  /* 7. Uncertainty: limitations, confidence, overclaim flags. */
  const flags = claimFlags(text, c.mustNotClaim || []);
  d.uncertainty = mean([
    (run.limitations || []).length ? 1 : 0,
    run.confidence ? 1 : 0,
    flags.length ? Math.max(0, 1 - flags.length / 2) : 1,
  ]);
  notes.uncertainty = `${(run.limitations || []).length} limitation(s), confidence ${typeof run.confidence === 'object' ? run.confidence?.level || 'set' : run.confidence || 'missing'}${flags.length ? `; flags: ${flags.map((f) => f.label).join(', ')}` : ''}`;

  /* 8. Cost and latency: within the mode's budgets. Replayed retrieval takes no time, so the
     slowest captured call is added back as an estimate of live retrieval. */
  const mode = c.mode;
  const retrievalMs = Math.max(0, ...(snapshot.calls || []).map((k) => k.ms || 0));
  const latency = durationMs + retrievalMs;
  const budgetMs = ctx.depthProfiles?.[mode]?.budgetMs || null;
  const { usd, usage } = costOf(run);
  const latencyScore = budgetMs ? Math.min(1, budgetMs / Math.max(1, latency)) : null;
  const costScore = usd != null ? Math.min(1, COST_CEILING[mode] / Math.max(1e-6, usd)) : null;
  d.cost = mean([latencyScore, costScore]);
  notes.cost = `${(latency / 1000).toFixed(1)}s est. (model ${(durationMs / 1000).toFixed(1)}s + retrieval ${(retrievalMs / 1000).toFixed(1)}s) vs ${budgetMs ? `${budgetMs / 1000}s` : 'n/a'}; cost ${usd != null ? `$${usd.toFixed(4)} vs $${COST_CEILING[mode]}` : 'not reported'}${usage ? `; tokens in ${usage.inputTokens ?? '?'} out ${usage.outputTokens ?? '?'}` : ''}`;

  return { d, notes, flags, latency, usd };
}

const fmt = (x) => (x == null ? 'n/a' : `${Math.round(x * 100)}%`);

/* ── Judge ─────────────────────────────────────────────────────────────────── */

const JUDGE_SYSTEM = `You grade one research answer from Ezana's Sonar research team. You do not research; you only judge the answer against the question, the evidence it was given and the rubric. Score each dimension from 0 to 5:
5 = an expert reviewer would sign it off unchanged; 4 = minor issues; 3 = usable with clear gaps; 2 = significant errors or omissions; 1 = mostly wrong or unsupported; 0 = absent or harmful.
Dimensions:
- objective: answers the question actually asked, with the right scope, subject and lead discipline.
- dataset: uses the evidence the question needs; notes evidence that is missing.
- accuracy: computations and interpretations are correct and use the right definitions (for example both FX conventions, obligations versus ceilings, ex-post real rates).
- grounding: every material claim traces to a cited evidence item (S-id) or computed metric (M-id); no number appears that the evidence or metrics do not contain.
- temporal: every figure carries its period; mixed dates are disclosed; projections are labelled; nothing after the evidence dates is stated as fact.
- crossDomain: integrates the disciplines the question needs and reconciles disagreements explicitly (score 3 if only one discipline is needed and it is handled well).
- uncertainty: confidence matches the evidence; gaps and limitations are stated; no forecast, advice, price target or inferred motive.
Then rule on each listed overclaim (violated true or false, with the shortest quote that shows it) and each trait of a good answer (met true or false).
Reply with JSON only, no prose: {"scores":{"objective":{"score":0,"why":""},"dataset":{...},"accuracy":{...},"grounding":{...},"temporal":{...},"crossDomain":{...},"uncertainty":{...}},"mustNotClaim":[{"claim":"","violated":false,"quote":""}],"traits":[{"trait":"","met":false}]}`;

function judgeInput(c, run, routing) {
  const ev = (run.evidence || [])
    .slice(0, 40)
    .map(
      (e) =>
        `[${e.marker || e.id}] ${e.source} | ${e.title || ''} | period ${e.period || e.date || 'n/a'} | ${String(e.text || '').slice(0, 360)}`,
    );
  const mx = (run.quantitativeMetrics || [])
    .slice(0, 40)
    .map(
      (m) =>
        `[M:${m.id}] ${m.label || m.method || ''} = ${m.value ?? m.display ?? ''} ${m.unit || ''} ${m.period || (m.periods ? JSON.stringify(m.periods) : '')}`,
    );
  return [
    `Question: ${c.question}`,
    `Mode: ${c.mode}. Expected lead: ${c.lead}; expected supporting: ${(c.supporting || []).join(', ') || 'none'}. Team that ran: lead ${routing.lead || 'none'}, supporting ${routing.supporting.join(', ') || 'none'}.`,
    `Evidence dates are as of ${run.researchMetadata?.startedAt?.slice(0, 10) || 'the snapshot date'}.`,
    '',
    'ANSWER',
    claimTextOf(run).slice(0, 12000),
    '',
    `Limitations: ${(run.limitations || []).join(' | ') || 'none'}`,
    `Confidence: ${JSON.stringify(run.confidence ?? null)}`,
    '',
    'EVIDENCE',
    ...ev,
    '',
    'METRICS',
    ...(mx.length ? mx : ['none']),
    '',
    'OVERCLAIMS TO RULE ON',
    ...(c.mustNotClaim || []).map((x) => `- ${x}`),
    '',
    'TRAITS OF A GOOD ANSWER',
    ...(c.goodAnswerTraits || []).map((x) => `- ${x}`),
  ].join('\n');
}

function parseJson(s) {
  const t = String(s || '');
  const i = t.indexOf('{');
  const j = t.lastIndexOf('}');
  if (i < 0 || j <= i) return null;
  try {
    return JSON.parse(t.slice(i, j + 1));
  } catch {
    return null;
  }
}

async function judge(c, run, routing, synthesizeWithFallback) {
  const out = await synthesizeWithFallback({
    system: JUDGE_SYSTEM,
    user: judgeInput(c, run, routing),
    maxTokens: 2000,
    model: JUDGE_MODEL,
    webSearch: { enabled: false },
    chainMs: 120_000,
    minHopMs: 2_000,
  });
  const parsed = parseJson(out?.answer);
  if (!parsed?.scores)
    return {
      ok: false,
      provider: out?.provider || null,
      error: out?.degraded || 'unparseable judge reply',
    };
  return { ok: true, provider: out?.provider || null, ...parsed };
}

/* ── Reports ───────────────────────────────────────────────────────────────── */

const DATA_TAG = 'sonar-quality:data';

function readPreviousReport(excludeFile) {
  if (!existsSync(REPORT_DIR)) return null;
  let best = null;
  for (const f of readdirSync(REPORT_DIR).filter((x) => x.endsWith('.md'))) {
    const full = path.join(REPORT_DIR, f);
    if (full === excludeFile) continue;
    const m = readFileSync(full, 'utf8').match(new RegExp(`<!-- ${DATA_TAG}\\n([\\s\\S]*?)\\n-->`));
    if (!m) continue;
    try {
      const data = JSON.parse(m[1]);
      if (!best || data.generatedAt > best.data.generatedAt) best = { file: f, data };
    } catch {
      /* not a report */
    }
  }
  return best;
}

function reportPath(date) {
  mkdirSync(REPORT_DIR, { recursive: true });
  let file = path.join(REPORT_DIR, `${date}.md`);
  for (let n = 2; existsSync(file); n += 1) file = path.join(REPORT_DIR, `${date}-${n}.md`);
  return file;
}

const cellScore = (x) => (x == null ? 'n/a' : x.toFixed(1));

function renderReport({ results, meta, previous }) {
  const L = [];
  L.push(`# Sonar analyst quality: ${meta.date}`, '');
  L.push(
    `Commit \`${meta.commit}\`, engine ${meta.engine}, judge ${meta.judge}. Evidence replayed from frozen snapshots; scores are 0 to 5.`,
    '',
  );
  L.push(`| Case | Mode | ${DIMENSIONS.map(([, l]) => l).join(' | ')} | Overall |`);
  L.push(`|---|---|${DIMENSIONS.map(() => '---:').join('|')}|---:|`);
  for (const r of results) {
    if (r.skipped) {
      L.push(`| ${r.id} | ${r.mode} | ${DIMENSIONS.map(() => '').join(' | ')} | skipped |`);
      continue;
    }
    L.push(
      `| ${r.id} | ${r.mode} | ${DIMENSIONS.map(([k]) => cellScore(r.scores[k])).join(' | ')} | **${cellScore(r.overall)}** |`,
    );
  }
  const scored = results.filter((r) => !r.skipped);
  if (scored.length) {
    L.push(
      `| **mean** | | ${DIMENSIONS.map(([k]) => cellScore(mean(scored.map((r) => r.scores[k])))).join(' | ')} | **${cellScore(mean(scored.map((r) => r.overall)))}** |`,
    );
  }
  L.push('');

  L.push('## Comparison with the previous report', '');
  if (!previous) L.push('No previous report found; this is the baseline.', '');
  else {
    L.push(
      `Previous: \`${previous.file}\` (${previous.data.generatedAt}, commit \`${previous.data.commit}\`).`,
      '',
    );
    L.push(`| Case | ${DIMENSIONS.map(([, l]) => l).join(' | ')} | Overall |`);
    L.push(`|---|${DIMENSIONS.map(() => '---:').join('|')}|---:|`);
    const delta = (a, b) =>
      a == null || b == null ? 'n/a' : `${a - b >= 0 ? '+' : ''}${(a - b).toFixed(1)}`;
    for (const r of scored) {
      const p = previous.data.results.find((x) => x.id === r.id && !x.skipped);
      if (!p) {
        L.push(`| ${r.id} | ${DIMENSIONS.map(() => 'new').join(' | ')} | new |`);
        continue;
      }
      L.push(
        `| ${r.id} | ${DIMENSIONS.map(([k]) => delta(r.scores[k], p.scores[k])).join(' | ')} | ${delta(r.overall, p.overall)} |`,
      );
    }
    L.push('');
  }

  L.push('## Scorecards', '');
  for (const r of results) {
    L.push(`### ${r.id} (${r.mode})`, '', `> ${r.question}`, '');
    if (r.skipped) {
      L.push(`Skipped: ${r.skipped}`, '');
      continue;
    }
    L.push(
      `Team: ${r.team}. Latency ${(r.latency / 1000).toFixed(1)}s (est.)${r.usd != null ? `, cost $${r.usd.toFixed(4)}` : ''}. Snapshot captured ${r.capturedAt}.`,
      '',
    );
    L.push('| Dimension | Score | Deterministic | Judge |', '|---|---:|---|---|');
    for (const [k, label] of DIMENSIONS) {
      const j = r.judge?.scores?.[k];
      L.push(
        `| ${label} | ${cellScore(r.scores[k])} | ${r.notes[k] || ''} | ${j ? `${j.score}: ${String(j.why || '').replace(/\|/g, '/')}` : 'n/a'} |`,
      );
    }
    L.push('');
    if (r.flags.length) {
      L.push('Deterministic overclaim flags:');
      r.flags.forEach((f) => L.push(`- ${f.label} (${f.entry}): "${f.quote}"`));
      L.push('');
    }
    const violated = (r.judge?.mustNotClaim || []).filter((x) => x.violated);
    if (violated.length) {
      L.push('Judge: overclaims found:');
      violated.forEach((x) => L.push(`- ${x.claim}${x.quote ? `: "${x.quote}"` : ''}`));
      L.push('');
    }
    const unmet = (r.judge?.traits || []).filter((x) => !x.met);
    if (unmet.length) L.push(`Judge: traits not met: ${unmet.map((x) => x.trait).join('; ')}.`, '');
    if (r.judge && !r.judge.ok) L.push(`Judge unavailable: ${r.judge.error}.`, '');
    if (r.judge?.provider && r.judge.provider !== 'anthropic')
      L.push(
        `Judge answered by fallback provider ${r.judge.provider}; scores are not comparable.`,
        '',
      );
    if (r.first) L.push(`First sentences: ${r.first}`, '');
  }
  L.push(
    `<!-- ${DATA_TAG}`,
    JSON.stringify({
      generatedAt: meta.generatedAt,
      commit: meta.commit,
      engine: meta.engine,
      judge: meta.judge,
      results: results.map(({ id, mode, skipped, scores, overall }) => ({
        id,
        mode,
        skipped: skipped || null,
        scores: scores || null,
        overall: overall ?? null,
      })),
    }),
    '-->',
    '',
  );
  return L.join('\n');
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

function selectCases() {
  const ids = (opt('--cases') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  if (args.includes('--benchmarks') || !ids.length) out.push(...BENCHMARK_CASES);
  if (ids.length) {
    const all = loadEvalCases();
    for (const id of ids) {
      const c = all.find((x) => x.id === id) || BENCHMARK_CASES.find((x) => x.id === id);
      if (!c) throw new Error(`unknown case id ${id}`);
      if (!out.includes(c)) out.push(c);
    }
  }
  return out.map((c) => ({ ...c, mode: MODE || c.mode }));
}

function gitCommit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim();
  } catch {
    return 'unknown';
  }
}

async function main() {
  const enginePath = process.env.SONAR_EVAL_ENGINE_MODULE;
  const engine = enginePath
    ? await import(pathToFileURL(path.resolve(enginePath)).href)
    : await import('@/lib/sonar/engine/engine');
  const { synthesizeWithFallback } = await import('@/lib/sonar/llm-providers');
  const { CAPABILITIES, ANALYSTS } = await loadCapabilities();
  const cases = selectCases();
  const results = [];

  for (const c of cases) {
    const file = path.join(SNAP_DIR, `${c.id}.json`);
    if (!existsSync(file)) {
      results.push({
        id: c.id,
        mode: c.mode,
        question: c.question,
        skipped: `no snapshot at ${path.relative(ROOT, file)} (run scripts/sonar-analyst-snapshot.mjs)`,
      });
      continue;
    }
    const snapshot = JSON.parse(readFileSync(file, 'utf8'));
    if (snapshot.mode !== c.mode)
      console.warn(
        `${c.id}: snapshot captured in ${snapshot.mode} mode, running ${c.mode}; the plan may differ (replay misses are scored)`,
      );
    const replayLog = [];
    const leaks = [];
    let phase1 = null;
    const t0 = Date.now();
    let run;
    try {
      // eslint-disable-next-line no-await-in-loop
      run = await engine.runResearch(c.question, {
        admin: blockedAdmin(leaks),
        runId: crypto.randomUUID(),
        depth: c.mode,
        now: new Date(snapshot.capturedAt),
        config: snapshot.config || undefined,
        scope: snapshot.scope || {},
        emit: (type, data) => {
          if (type === 'plan') phase1 = data;
        },
        evidenceOverride: {
          resolution: snapshot.resolution,
          runners: replayRunners(snapshot, replayLog),
          memory: [],
        },
      });
    } catch (e) {
      results.push({
        id: c.id,
        mode: c.mode,
        question: c.question,
        skipped: `run failed: ${e?.message || e}`,
      });
      continue;
    }
    const durationMs = run?.researchMetadata?.durationMs ?? Date.now() - t0;
    if ((phase1?.plan?.tasks?.length || 0) && !replayLog.length) {
      results.push({
        id: c.id,
        mode: c.mode,
        question: c.question,
        skipped:
          'runResearch ignored evidenceOverride (no replayed runner call); add the engine hook in this file header',
      });
      continue;
    }
    /* Which sources returned items, with the macro families asked for. */
    const served = replayLog.map((l) => {
      const call = (snapshot.calls || []).find(
        (k) => k.paramsKey === l.paramsKey && k.source === l.source,
      );
      return { source: l.source, items: l.items, families: call?.params?.families || null };
    });
    // eslint-disable-next-line no-await-in-loop
    const offline = await planCase(c, {
      now: new Date(snapshot.capturedAt),
      orgId: snapshot.scope?.orgId || null,
    });
    const routing = routingOf(run, phase1, offline);
    const det = deterministic(c, {
      run,
      routing,
      replayLog,
      served,
      snapshot,
      leaks,
      CAPABILITIES,
      ANALYSTS,
      durationMs,
      depthProfiles: engine.DEPTH_PROFILES,
    });
    // eslint-disable-next-line no-await-in-loop
    const j = NO_JUDGE
      ? null
      : await judge(c, run, routing, synthesizeWithFallback).catch((e) => ({
          ok: false,
          error: e?.message || 'judge threw',
        }));

    const scores = {};
    for (const [k] of DIMENSIONS) {
      const dPart = det.d[k] == null ? null : clamp01(det.d[k]) * 5;
      const jRaw = JUDGED.includes(k) && j?.ok ? Number(j.scores?.[k]?.score) : null;
      const jPart = Number.isFinite(jRaw) ? Math.max(0, Math.min(5, jRaw)) : null;
      /* A judged overclaim caps uncertainty handling at 2. */
      let s = mean([dPart, jPart]);
      if (k === 'uncertainty' && s != null && (j?.mustNotClaim || []).some((x) => x.violated))
        s = Math.min(s, 2);
      scores[k] = s == null ? null : Math.round(s * 10) / 10;
    }
    const overall = mean(Object.values(scores));
    const team = `lead ${routing.lead || 'none'}${routing.supporting.length ? `, supporting ${routing.supporting.join(', ')}` : ''}${routing.controls.length ? `, controls ${routing.controls.join(', ')}` : ''} (${routing.source})`;
    const first = sentences(run.executiveConclusion?.text || run.brief || '')
      .slice(0, 2)
      .join(' ')
      .slice(0, 400);
    results.push({
      id: c.id,
      mode: c.mode,
      question: c.question,
      capturedAt: snapshot.capturedAt,
      scores,
      overall: overall == null ? null : Math.round(overall * 10) / 10,
      notes: det.notes,
      flags: det.flags,
      judge: j,
      team,
      latency: det.latency,
      usd: det.usd,
      first,
    });
    console.log(
      `${c.id.padEnd(32)} overall ${cellScore(overall)}  ${DIMENSIONS.map(([k]) => `${k}=${cellScore(scores[k])}`).join(' ')}`,
    );
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const file = reportPath(date);
  const previous = readPreviousReport(file);
  const md = renderReport({
    results,
    previous,
    meta: {
      date,
      generatedAt: now.toISOString(),
      commit: gitCommit(),
      engine: engine.ENGINE_VERSION || 'unknown',
      judge: NO_JUDGE ? 'none (deterministic only)' : JUDGE_MODEL,
    },
  });
  writeFileSync(file, md);
  console.log(
    `wrote ${path.relative(ROOT, file)}${previous ? ` (compared with ${previous.file})` : ' (baseline)'}`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
