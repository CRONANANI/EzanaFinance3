/**
 * Sonar model-quality benchmark (Nov 28 2026).
 *
 * Question: which Claude model should fill each Sonar role? Each case is one of the
 * existing Sonar benchmark questions. Its evidence is captured once and frozen; every
 * cell (a model routing) then replays that same evidence, so the deterministic half of
 * the run (retrieval, metrics, valuation arithmetic, charts) is identical across cells
 * and only the LLM synthesis differs. The scorers here are pure: they read a finished
 * run plus the usage the provider recorded and return numbers. Nothing here calls a
 * model; /api/admin/sonar/model-bench does the running.
 */
import { MODELS, resolveModelRouting, callCostUsd } from '@/lib/sonar/model-routing';

export const MODEL_BENCH_VERSION = 'model-bench-v1';

/* ---------------------------------------------------------------- cases ---------- */

/* Patterns are regex sources (strings) so a case serializes into the results row.
   objectives: what a correct answer must address (any one pattern per objective).
   caveats: limits an honest answer states. forbidden: claims no answer may make. */
const CONDUCT =
  '\\b(insider (?:knowledge|information|trading)|conflicts? of interest|illegal|corrupt\\w*|wrongdoing)\\b';

export const MODEL_BENCH_CASES = [
  {
    id: 'congress_institutional_ownership',
    category: 'Congressional institutional ownership',
    source: 'semantic/pelosi-own-breadth',
    depth: 'standard',
    query: 'Can you tell me what stocks Nancy Pelosi owns that are most owned by investment firms?',
    objectives: [
      { id: 'holdings', label: 'Names Pelosi-disclosed holdings', any: ['\\b[A-Z]{2,5}\\b'] },
      {
        id: 'institutional',
        label: 'Ranks them by institutional (13F) ownership',
        any: ['13f', 'institution', 'investment firms?', 'holders?', 'funds?'],
      },
      {
        id: 'ranking',
        label: 'Gives an ordering or a measure (holder count, value, share)',
        any: ['most', 'top', 'rank', '\\d+\\s*(?:holders|firms|funds|institutions)', '%'],
      },
    ],
    caveats: [
      'disclos',
      'lag|delay|45 days|quarter',
      'range|ranges|between \\$',
      'spouse|paul pelosi',
    ],
    forbidden: [CONDUCT],
  },
  {
    id: 'multi_dataset_screen',
    category: 'Multi-dataset screening',
    source: 'bench-v1/defense_congress',
    depth: 'standard',
    query: 'Which defense stocks are members of Congress trading?',
    objectives: [
      {
        id: 'names',
        label: 'Names defense tickers',
        any: ['\\b(LMT|RTX|NOC|GD|LHX|HII|BA|LDOS|PLTR|KTOS|AXON)\\b'],
      },
      {
        id: 'members',
        label: 'Names members of Congress',
        any: ['\\b(Rep\\.|Sen\\.|Representative|Senator)'],
      },
      {
        id: 'direction',
        label: 'Says buy or sell',
        any: ['\\b(purchas|bought|buy|sold|sale|sell)'],
      },
    ],
    caveats: ['disclos', 'lag|delay|45 days', 'range|ranges|between \\$'],
    forbidden: [CONDUCT],
  },
  {
    id: 'company_fundamentals',
    category: 'Company fundamental analysis',
    source: 'semantic/aapl-fundamentals',
    depth: 'standard',
    query: 'Give me a fundamental analysis of Apple.',
    objectives: [
      {
        id: 'growth',
        label: 'Revenue or earnings growth',
        any: ['revenue', 'sales', 'earnings', 'eps'],
      },
      {
        id: 'margins',
        label: 'Margins or profitability',
        any: ['margin', 'profitab', 'return on'],
      },
      {
        id: 'balance',
        label: 'Balance sheet or cash flow',
        any: ['cash flow', 'free cash', 'debt', 'balance sheet', 'buyback'],
      },
      {
        id: 'valuation',
        label: 'Valuation context',
        any: ['p/e', 'price.to.earnings', 'multiple', 'valuation'],
      },
    ],
    caveats: ['as of|fiscal|quarter|ttm|trailing', 'not (?:investment|financial) advice|risk'],
    forbidden: [],
  },
  {
    id: 'government_contract_exposure',
    category: 'Government contract exposure',
    source: 'semantic/palantir-gov-dependence',
    depth: 'standard',
    query: 'How dependent is Palantir on government revenue?',
    objectives: [
      {
        id: 'share',
        label: 'States the government share of revenue',
        any: ['government', 'public sector'],
      },
      { id: 'number', label: 'Quantifies it', any: ['\\d+(?:\\.\\d+)?\\s*%', '\\$\\s?\\d'] },
      {
        id: 'contracts',
        label: 'Uses contract or award records',
        any: ['contract', 'award', 'agenc', 'army', 'dod|defense'],
      },
      { id: 'commercial', label: 'Contrasts with commercial revenue', any: ['commercial'] },
    ],
    caveats: ['award|obligat|ceiling', 'fiscal|quarter|as of'],
    forbidden: [],
  },
  {
    id: 'macro_research',
    category: 'Macroeconomic research',
    source: 'bench-v1/brazil_outlook',
    depth: 'standard',
    query: 'Brazilian economy outlook for the next 2 years',
    objectives: [
      { id: 'growth', label: 'GDP growth', any: ['gdp', 'growth'] },
      {
        id: 'inflation',
        label: 'Inflation and policy rate',
        any: ['inflation', 'selic', 'interest rate', 'central bank'],
      },
      { id: 'fiscal', label: 'Fiscal position', any: ['fiscal', 'deficit', 'debt'] },
      { id: 'currency', label: 'Currency', any: ['real\\b', 'brl', 'currency', 'exchange rate'] },
    ],
    caveats: ['forecast|projection|estimate', 'risk|uncertain'],
    forbidden: [],
  },
  {
    id: 'valuation',
    category: 'Valuation',
    source: 'semantic/msft-dcf',
    depth: 'standard',
    query: 'Run a DCF on Microsoft.',
    objectives: [
      { id: 'fcf', label: 'Free cash flow base', any: ['free cash flow', 'fcf'] },
      { id: 'discount', label: 'Discount rate', any: ['wacc', 'discount rate', 'cost of capital'] },
      { id: 'terminal', label: 'Terminal value or growth', any: ['terminal'] },
      {
        id: 'value',
        label: 'Intrinsic value per share against price',
        any: ['per share', 'intrinsic', 'fair value'],
      },
    ],
    caveats: ['assum', 'sensitiv|scenario|range'],
    forbidden: [],
  },
  {
    id: 'deep_research',
    category: 'Deep Research',
    source: 'bench-v1/nvidia_three_year_risks',
    depth: 'deep',
    query:
      "What are the biggest risks to NVIDIA's growth over the next three years? Analyze its financial performance, institutional ownership, government contracts, industry exposure, and competitive landscape.",
    objectives: [
      {
        id: 'financials',
        label: 'Financial performance',
        any: ['revenue', 'margin', 'data center'],
      },
      {
        id: 'ownership',
        label: 'Institutional ownership',
        any: ['institution', '13f', 'holders?'],
      },
      { id: 'contracts', label: 'Government contracts', any: ['contract', 'award', 'government'] },
      {
        id: 'industry',
        label: 'Industry exposure (customers, hyperscalers, capex)',
        any: ['hyperscaler', 'capex', 'customer concentration', 'cloud'],
      },
      {
        id: 'competition',
        label: 'Competitive landscape',
        any: ['amd', 'custom (?:silicon|chips)|asic|tpu|trainium', 'compet'],
      },
      { id: 'policy', label: 'Export controls or China', any: ['export', 'china'] },
    ],
    caveats: ['uncertain|risk', 'as of|fiscal|quarter'],
    forbidden: [CONDUCT],
  },
];

/* ---------------------------------------------------------------- cells ---------- */

/* Pin every role to one model: the per-model comparison at a fixed depth. */
function pinned(model) {
  const r = resolveModelRouting({ profile: 'A', env: {} });
  const out = {};
  for (const k of Object.keys(r)) if (k !== 'profile') out[k] = r[k] == null ? null : model;
  return out;
}

/**
 * The cells a case runs. Standard cases compare the four models one at a time plus the
 * B/C standard routing (Sonnet 5.5 writes, Haiku 5.5 specialists). The deep case runs
 * the three candidate configurations against the current one. Quick runs are compared
 * on two cases (Haiku 4.5 against Haiku 5.5; every candidate uses Haiku 5.5 for quick).
 * `current` reads production's env so it is exactly what users get today; A/B/C ignore
 * env role overrides so they are clean.
 */
export function cellsFor(c, env = {}) {
  const current = {
    id: 'current',
    label: 'Current production',
    routing: resolveModelRouting({ profile: 'current', env }),
  };
  if (c.depth === 'deep') {
    return [
      current,
      { id: 'A', label: 'A: Sonnet 5.5 Deep', routing: resolveModelRouting({ profile: 'A' }) },
      {
        id: 'B',
        label: 'B: Opus 5.5 Deep Director',
        routing: resolveModelRouting({ profile: 'B' }),
      },
      {
        id: 'C',
        label: 'C: Sonnet 5.5 Deep Director + selective Opus',
        routing: resolveModelRouting({ profile: 'C' }),
      },
    ];
  }
  const cells = [
    {
      id: 'model:haiku45',
      label: 'Haiku 4.5',
      routing: { profile: 'model:haiku45', ...pinned(MODELS.haiku45) },
    },
    {
      id: 'model:haiku55',
      label: 'Haiku 5.5 (config A standard)',
      routing: { profile: 'model:haiku55', ...pinned(MODELS.haiku55) },
    },
    {
      id: 'model:sonnet55',
      label: 'Sonnet 5.5',
      routing: { profile: 'model:sonnet55', ...pinned(MODELS.sonnet55) },
    },
    {
      id: 'model:opus55',
      label: 'Opus 5.5',
      routing: { profile: 'model:opus55', ...pinned(MODELS.opus55) },
    },
    {
      id: 'BC',
      label: 'B/C standard: Sonnet 5.5 writer, Haiku 5.5 specialists',
      routing: resolveModelRouting({ profile: 'B' }),
    },
    current,
  ];
  if (c.id === 'congress_institutional_ownership' || c.id === 'macro_research') {
    cells.push(
      { id: 'quick:current', label: 'Quick, current', depth: 'quick', routing: current.routing },
      {
        id: 'quick:haiku55',
        label: 'Quick, Haiku 5.5 (A/B/C)',
        depth: 'quick',
        routing: resolveModelRouting({ profile: 'A' }),
      },
    );
  }
  return cells;
}

/* ---------------------------------------------------------------- scoring -------- */

/** Every reader-facing sentence of a run, joined (the text the scorers read). */
export function runText(run) {
  if (!run) return '';
  const parts = [run.headline, run.summary, run.executiveConclusion, run.brief];
  for (const f of run.keyFindings || [])
    parts.push(f.title, f.explanation, f.comparison, f.implication, f.caveat);
  for (const a of run.analysis || [])
    parts.push(typeof a === 'string' ? a : a?.text || a?.body || a?.title);
  for (const t of run.takeaways || []) parts.push(typeof t === 'string' ? t : t?.text);
  for (const l of run.limitations || []) parts.push(typeof l === 'string' ? l : l?.text);
  for (const s of run.memo?.sections || []) parts.push(s.title, s.body, s.text);
  return parts.filter((x) => typeof x === 'string' && x.trim()).join('\n');
}

const re = (src) => new RegExp(src, 'i');
const NUM = /(?<![\w.])-?\$?\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![\w.])-?\$?\d+(?:\.\d+)?/g;

/* A number counts as traced when it appears in the frozen evidence or the computed
   metrics, allowing the usual restatements: rounding, %, $ and B/M/K scaling. */
function numberForms(v) {
  const n = Math.abs(v);
  const out = new Set([n]);
  for (const s of [1e3, 1e6, 1e9, 1e12]) {
    out.add(n / s);
    out.add(n * s);
  }
  out.add(n * 100);
  out.add(n / 100);
  return [...out];
}
function parseNum(tok) {
  const v = Number(String(tok).replace(/[$,]/g, ''));
  return Number.isFinite(v) ? v : null;
}
function traced(v, pool) {
  if (Math.abs(v) < 10 && Number.isInteger(v)) return true; /* counts, ordinals, years-from-now */
  if (v >= 1900 && v <= 2100 && Number.isInteger(v)) return true; /* years */
  for (const p of pool)
    for (const f of numberForms(p)) {
      const tol = Math.max(Math.abs(f) * 0.01, 0.051);
      if (Math.abs(f - Math.abs(v)) <= tol) return true;
    }
  return false;
}

function evidencePool(run) {
  const nums = [];
  const push = (s) => {
    for (const m of String(s ?? '').matchAll(NUM)) {
      const v = parseNum(m[0]);
      if (v != null) nums.push(Math.abs(v));
    }
  };
  for (const e of run?.evidence || []) {
    push(e.text);
    push(e.title);
    push(e.period);
  }
  const walk = (o, depth = 0) => {
    if (o == null || depth > 6) return;
    if (typeof o === 'number') nums.push(Math.abs(o));
    else if (typeof o === 'string') push(o);
    else if (Array.isArray(o)) o.forEach((x) => walk(x, depth + 1));
    else if (typeof o === 'object') Object.values(o).forEach((x) => walk(x, depth + 1));
  };
  walk(run?.quantitativeMetrics);
  walk(run?.valuation);
  walk(run?.supportingFacts);
  return nums;
}

/**
 * Deterministic scores for one run. Returns:
 *   completed, partial, deterministicFallback, timedOut
 *   objectives { met, total, missing[] }, caveats { met, total }, forbidden hits
 *   citations { findings, cited, valid, invalid, coverage }
 *   numbers { total, traced, untraced[] (first 12), fidelity }
 *   unsupported { count, examples[] }: findings with no valid citation, and sentences
 *     carrying an untraced number
 *   fingerprint: hash of the deterministic half (evidence ids + metrics) to prove every
 *     cell of a case saw the same evidence
 */
export function scoreRun(run, c) {
  const text = runText(run);
  const lower = text.toLowerCase();
  const completed = Boolean(run && !run.failed && text.length > 80);
  const meta = run?.researchMetadata || {};
  const objectivesMissing = [];
  let met = 0;
  for (const o of c.objectives || []) {
    if (o.any.some((p) => re(p).test(text))) met += 1;
    else objectivesMissing.push(o.id);
  }
  const caveatsMet = (c.caveats || []).filter((p) => re(p).test(lower)).length;
  const forbiddenHits = (c.forbidden || []).filter((p) => re(p).test(text)).length;

  /* Citations: every key finding should cite evidence markers that exist. */
  const markers = new Set((run?.evidence || []).map((e) => String(e.marker ?? e.id)));
  const findings = run?.keyFindings || [];
  let cited = 0;
  let valid = 0;
  let invalid = 0;
  const unsupportedExamples = [];
  for (const f of findings) {
    const ev = (f.evidence || []).map(String);
    if (ev.length) cited += 1;
    const good = ev.filter((m) => markers.has(m) || markers.has(m.replace(/^\[|\]$/g, '')));
    valid += good.length;
    invalid += ev.length - good.length;
    if (!good.length && unsupportedExamples.length < 6)
      unsupportedExamples.push(f.title || '(untitled finding)');
  }
  /* Inline markers in prose, e.g. [3] or [E3]. */
  for (const m of text.matchAll(/\[(E?\d+)\]/g)) {
    if (markers.has(m[1]) || markers.has(m[1].replace(/^E/, ''))) valid += 1;
    else invalid += 1;
  }

  /* Numeric fidelity. */
  const pool = evidencePool(run);
  const nums = [];
  for (const m of text.matchAll(NUM)) {
    const v = parseNum(m[0]);
    if (v != null) nums.push({ tok: m[0], v, at: m.index });
  }
  const untraced = nums.filter((n) => !traced(n.v, pool));
  const untracedSentences = new Set();
  for (const n of untraced) {
    const start = text.lastIndexOf('\n', n.at) + 1;
    const end = text.indexOf('\n', n.at);
    untracedSentences.add(text.slice(start, end < 0 ? undefined : end).slice(0, 160));
  }
  const unsupportedFindings =
    findings.length -
    findings.filter((f) => (f.evidence || []).some((m) => markers.has(String(m)))).length;

  const fp = fingerprint(run);
  return {
    completed,
    partial: Boolean(meta.partial),
    deterministicFallback: Boolean(run?.methodology?.deterministic),
    timedOut:
      Boolean(meta.aborted) ||
      (meta.trace || []).some((t) => !t.ok && /timeout|abort/i.test(t.note || '')),
    failedLegs: (meta.trace || []).filter((t) => !t.ok).map((t) => t.leg),
    durationMs: meta.durationMs ?? null,
    objectives: { met, total: (c.objectives || []).length, missing: objectivesMissing },
    caveats: { met: caveatsMet, total: (c.caveats || []).length },
    forbiddenHits,
    citations: {
      findings: findings.length,
      cited,
      valid,
      invalid,
      coverage: findings.length ? round(cited / findings.length) : 0,
      validity: valid + invalid ? round(valid / (valid + invalid)) : null,
    },
    numbers: {
      total: nums.length,
      traced: nums.length - untraced.length,
      untraced: untraced.slice(0, 12).map((n) => n.tok),
      fidelity: nums.length ? round((nums.length - untraced.length) / nums.length) : null,
    },
    unsupported: {
      findingsWithoutValidCitation: unsupportedFindings,
      sentencesWithUntracedNumbers: untracedSentences.size,
      examples: [...unsupportedExamples, ...[...untracedSentences].slice(0, 4)],
    },
    textChars: text.length,
    fingerprint: fp,
  };
}

function round(x, d = 3) {
  return Math.round(x * 10 ** d) / 10 ** d;
}

/* FNV-1a over evidence ids and computed metrics: same value means same deterministic half. */
export function fingerprint(run) {
  const s = JSON.stringify({
    ev: (run?.evidence || []).map((e) => e.id).sort(),
    m: run?.quantitativeMetrics || null,
    v: run?.valuation ? Object.keys(run.valuation).sort() : null,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

/* ---------------------------------------------------------------- usage / cost --- */

/* Legs that belong to the deterministic half: their model calls (query understanding)
   are not what is being compared and are reported apart. */
const DETERMINISTIC_LEGS = new Set(['understand', 'resolve']);

/**
 * Sums recorded provider calls into cost and token totals, split into the synthesis
 * (the part under test) and the deterministic half, with per-role and per-model rows.
 * Flags any call whose served model differs from the requested one (the silent Haiku
 * fallback), so a mislabelled cell cannot pass.
 */
export function summarizeUsage(calls = []) {
  const zero = () => ({
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    webSearches: 0,
    usd: 0,
    ms: 0,
  });
  const total = zero();
  const synthesis = zero();
  const deterministic = zero();
  const byLeg = {};
  const byModel = {};
  const mismatches = [];
  let failures = 0;
  let timeouts = 0;
  let unpriced = 0;
  for (const c of calls) {
    if (!c.ok) {
      failures += 1;
      if (c.status === 'timeout') timeouts += 1;
    }
    const served = c.served || c.requested;
    const usd = callCostUsd({ ...c, model: served });
    if (usd == null && c.ok) unpriced += 1;
    if (c.ok && c.requested && served && !sameModel(c.requested, served))
      mismatches.push({
        leg: c.label || null,
        requested: c.requested,
        served,
        fellBackFrom: c.fellBackFrom || null,
      });
    const leg = c.label || 'unlabelled';
    const add = (b) => {
      b.calls += 1;
      b.inputTokens += c.inputTokens || 0;
      b.outputTokens += c.outputTokens || 0;
      b.cacheReadTokens += c.cacheReadTokens || 0;
      b.cacheWriteTokens += c.cacheWriteTokens || 0;
      b.webSearches += c.webSearches || 0;
      b.usd += usd || 0;
      b.ms += c.ms || 0;
    };
    add(total);
    add(DETERMINISTIC_LEGS.has(leg) ? deterministic : synthesis);
    add((byLeg[leg] ||= zero()));
    add((byModel[served || 'unknown'] ||= zero()));
  }
  const r = (b) => ({ ...b, usd: round(b.usd, 5) });
  return {
    total: r(total),
    synthesis: r(synthesis),
    deterministic: r(deterministic),
    byLeg: Object.fromEntries(Object.entries(byLeg).map(([k, v]) => [k, r(v)])),
    byModel: Object.fromEntries(Object.entries(byModel).map(([k, v]) => [k, r(v)])),
    failures,
    timeouts,
    unpriced,
    modelMismatches: mismatches,
  };
}

/* claude-haiku-4-5 vs claude-haiku-4-5-20251001: the API may answer with a dated id. */
function sameModel(a, b) {
  const norm = (x) => String(x).replace(/-\d{8}$/, '');
  return norm(a) === norm(b);
}

/* ---------------------------------------------------------------- aggregation ---- */

/**
 * Side-by-side table from result rows ({ caseId, cellId, score, usage, judge? }).
 * One row per cell, averaged across cases and trials.
 */
export function aggregate(rows) {
  const byCell = {};
  for (const r of rows) (byCell[r.cellId] ||= []).push(r);
  const mean = (xs) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const pct = (xs, p) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(p * s.length))];
  };
  return Object.entries(byCell).map(([cellId, rs]) => {
    const sc = rs.map((r) => r.score);
    const lat = sc.map((s) => s.durationMs).filter((x) => x != null);
    const judged = rs.filter((r) => r.judge && Number.isFinite(r.judge.overall));
    return {
      cellId,
      label: rs[0].cellLabel || cellId,
      runs: rs.length,
      completionRate: mean(sc.map((s) => (s.completed ? 1 : 0))),
      partialRate: mean(sc.map((s) => (s.partial ? 1 : 0))),
      timeoutRate: mean(sc.map((s) => (s.timedOut ? 1 : 0))),
      recoveredPartials: sc.filter((s) => s.partial && s.completed).length,
      objectiveCompletion: mean(
        sc.map((s) => (s.objectives.total ? s.objectives.met / s.objectives.total : 0)),
      ),
      caveatRate: mean(sc.map((s) => (s.caveats.total ? s.caveats.met / s.caveats.total : 0))),
      forbiddenHits: sc.reduce((a, s) => a + s.forbiddenHits, 0),
      citationCoverage: mean(sc.map((s) => s.citations.coverage)),
      citationValidity: mean(sc.map((s) => s.citations.validity).filter((x) => x != null)),
      numericFidelity: mean(sc.map((s) => s.numbers.fidelity).filter((x) => x != null)),
      unsupportedPerRun: mean(
        sc.map(
          (s) =>
            s.unsupported.findingsWithoutValidCitation + s.unsupported.sentencesWithUntracedNumbers,
        ),
      ),
      judgeOverall: judged.length ? mean(judged.map((r) => r.judge.overall)) : null,
      judgeInsight: judged.length ? mean(judged.map((r) => r.judge.insight)) : null,
      judgeFinancial: judged.length ? mean(judged.map((r) => r.judge.financial)) : null,
      latencyP50Ms: pct(lat, 0.5),
      latencyP90Ms: pct(lat, 0.9),
      usdPerRun: mean(rs.map((r) => r.usage?.total?.usd || 0)),
      synthesisUsdPerRun: mean(rs.map((r) => r.usage?.synthesis?.usd || 0)),
      inputTokensPerRun: mean(rs.map((r) => r.usage?.total?.inputTokens || 0)),
      outputTokensPerRun: mean(rs.map((r) => r.usage?.total?.outputTokens || 0)),
      modelMismatches: rs.reduce((a, r) => a + (r.usage?.modelMismatches?.length || 0), 0),
    };
  });
}

/* ---------------------------------------------------------------- judge ---------- */

/**
 * Prompt for the optional blind rubric judge. The judge sees the question, the expected
 * objectives, an evidence digest and an anonymized answer; never the model or the cell.
 * Limitation, stated in the report: an Opus judge may prefer Opus-style prose, so the
 * judge score is a secondary signal next to the deterministic ones.
 */
export function judgePrompt(c, run) {
  const evidence = (run?.evidence || [])
    .slice(0, 40)
    .map((e) => `[${e.marker ?? e.id}] ${e.title || ''}: ${String(e.text || '').slice(0, 300)}`)
    .join('\n');
  const system =
    'You grade financial research answers against the evidence they were given. Be strict and concrete. Reply with JSON only.';
  const user = `QUESTION: ${c.query}

WHAT A COMPLETE ANSWER ADDRESSES:
${(c.objectives || []).map((o) => `- ${o.label}`).join('\n')}

EVIDENCE THE ANSWER HAD (frozen):
${evidence || '(none)'}

ANSWER TO GRADE:
${runText(run).slice(0, 12000)}

Score 1 to 5 (5 best):
- correctness: claims are right and follow from the evidence
- objective: the research question is fully answered
- financial: financial interpretation is sound (mechanisms, magnitudes, comparisons, what it means for the business or investor)
- insight: says something non-obvious and useful, not a restatement of the data
- calibration: confidence matches the evidence; limits are stated
List up to 3 unsupported or wrong claims verbatim.
JSON: {"correctness":n,"objective":n,"financial":n,"insight":n,"calibration":n,"unsupported":["..."],"note":"one sentence"}`;
  return { system, user };
}

export function parseJudge(answer) {
  try {
    const m = String(answer || '').match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : answer);
    const keys = ['correctness', 'objective', 'financial', 'insight', 'calibration'];
    const vals = keys.map((k) => Number(j[k])).filter((v) => v >= 1 && v <= 5);
    if (vals.length !== keys.length) return null;
    return {
      ...Object.fromEntries(keys.map((k) => [k, Number(j[k])])),
      overall: round(vals.reduce((a, b) => a + b, 0) / vals.length, 2),
      unsupported: Array.isArray(j.unsupported) ? j.unsupported.slice(0, 3).map(String) : [],
      note: String(j.note || '').slice(0, 300),
    };
  } catch {
    return null;
  }
}
