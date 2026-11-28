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
import { MODELS, resolveModelRouting } from '@/lib/sonar/model-routing';

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
    evidenceClass: 'complete',
    requiredDatasets: [
      ['politician_dossier', 'congress_company', 'congress_activity'],
      ['institutional_13f', 'holder_positioning', 'composition'],
    ],
    requiredCalcs: ['composition'],
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
    evidenceClass: 'complete',
    requiredDatasets: [
      ['congress_sector', 'congress_company', 'congress_activity'],
      ['industry_registry'],
    ],
    requiredCalcs: [],
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
        /* Sonar 6.4: the disclosures name members without titles, and every model named
           them that way (20 of 20 runs), so the title-only pattern failed every model.
           A member named in the frozen evidence also meets the objective. */
        fromEvidence: 'members',
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
    evidenceClass: 'complete',
    requiredDatasets: [['company_financials'], ['market_snapshot', 'analysts', 'estimates']],
    requiredCalcs: ['metrics'],
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
    evidenceClass: 'incomplete_evidence',
    evidenceNote:
      "The government/commercial revenue split is not in Ezana's data (the segment source returns no Palantir rows). Contract obligations are available and are not revenue. A good answer uses them, says the share cannot be stated, and invents nothing.",
    requiredDatasets: [
      ['company_financials'],
      ['contracts_profile', 'contracts_history', 'composition'],
    ],
    requiredCalcs: ['composition'],
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
    evidenceClass: 'complete',
    requiredDatasets: [['macro_series', 'macro_country']],
    requiredCalcs: [],
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
    evidenceClass: 'incomplete_evidence',
    evidenceNote:
      'The valuation model (DCF, multiples, peers) runs only in deep research; a standard answer has the inputs (cash flow, capex, estimates, price) but no model, and should say so.',
    requiredDatasets: [
      ['company_financials'],
      ['capex_monetization'],
      ['estimates'],
      ['market_snapshot'],
    ],
    requiredCalcs: ['metrics'],
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
    evidenceClass: 'complete',
    requiredDatasets: [
      ['company_financials'],
      ['holder_positioning', 'institutional_13f'],
      ['contracts_profile', 'contracts_history'],
      ['competitive_products', 'peer_financials'],
      ['customer_capex', 'hyperscaler_capex', 'capex_monetization'],
    ],
    requiredCalcs: ['metrics'],
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

/* Deep-only follow-up (suite 2): two of the seven questions asked at deep depth, so the
   Opus-versus-Sonnet deep comparison rests on three questions instead of one. */
const byId = (id) => MODEL_BENCH_CASES.find((c) => c.id === id);
const MODEL_BENCH_DEEP_EXTRA_CASES = [
  {
    ...byId('multi_dataset_screen'),
    id: 'deep_screen',
    category: 'Multi-dataset screening (deep)',
    depth: 'deep',
  },
  {
    ...byId('valuation'),
    id: 'deep_valuation',
    category: 'Valuation (deep)',
    depth: 'deep',
    /* Deep runs build the valuation model (DCF, multiples, peers), frozen with the evidence. */
    evidenceClass: 'complete',
    requiredCalcs: ['valuation'],
  },
];

/** Any benchmark case by id (the seven and the deep follow-ups). */
export function caseById(id) {
  return (
    byId(id) ||
    MODEL_BENCH_DEEP_EXTRA_CASES.find((c) => c.id === id) ||
    MODEL_BENCH_PROPOSED_CASES.find((c) => c.id === id) ||
    null
  );
}

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

/* Suite 2, "deep-uncapped": the deep comparison with every output cap raised 1.75x
   (benchmark only), because in suite 1 every deep writer, specialist, red-team and audit
   call stopped at its cap. One variable changes per pair:
     S               Sonnet 5.5 everywhere
     O-dir           Opus 5.5 writes the report; Sonnet 5.5 reviews
     S-dir+O-review  Sonnet 5.5 writes; Opus 5.5 red team and audit
     O-dir+O-review  Opus 5.5 writes and reviews
   Cross-domain escalation is off in every cell so the director model is what the cell says. */
export const DEEP_OUTPUT_SCALE = 1.75;
function deepCells() {
  const A = resolveModelRouting({ profile: 'A' });
  const cell = (id, label, o) => ({
    id,
    label,
    depth: 'deep',
    outputScale: DEEP_OUTPUT_SCALE,
    routing: { ...A, profile: id, cross_domain_director: null, ...o },
  });
  return [
    cell('S', 'Sonnet 5.5 writes and reviews', {}),
    cell('O-dir', 'Opus 5.5 writes, Sonnet 5.5 reviews', {
      deep_director: MODELS.opus55,
      deep_resolve: MODELS.opus55,
    }),
    cell('S-dir+O-review', 'Sonnet 5.5 writes, Opus 5.5 reviews', {
      deep_red_team: MODELS.opus55,
      deep_auditor: MODELS.opus55,
    }),
    cell('O-dir+O-review', 'Opus 5.5 writes and reviews', {
      deep_director: MODELS.opus55,
      deep_resolve: MODELS.opus55,
      deep_red_team: MODELS.opus55,
      deep_auditor: MODELS.opus55,
    }),
  ];
}

/* Suite 3, "profile-d" (Nov 28 2026): current against Profile D after the specialist
   time-budget and output-contract fixes, on the seven cases, the deep valuation and the ten
   proposed cases. Two cheaper standard alternatives (Sonnet writer with Haiku specialists)
   and one deep ablation (D with a Sonnet writer) separate model effects from the fixes. */
function profileDCells(c, env) {
  const D = resolveModelRouting({ profile: 'D' });
  const current = {
    id: 'current',
    label: 'Current production',
    routing: resolveModelRouting({ profile: 'current', env }),
  };
  const d = { id: 'D', label: 'Profile D', routing: D };
  if (c.depth === 'deep')
    return [
      current,
      d,
      {
        id: 'D-sonnet-writer',
        label: 'D with a Sonnet 5.5 deep writer',
        routing: {
          ...D,
          profile: 'D-sonnet-writer',
          deep_director: MODELS.sonnet55,
          deep_resolve: MODELS.sonnet55,
          legacy_deep: MODELS.sonnet55,
        },
      },
    ];
  const cells = [
    current,
    d,
    {
      id: 'D-h45spec',
      label: 'D with Haiku 4.5 specialists',
      routing: { ...D, profile: 'D-h45spec', standard_specialist: MODELS.haiku45 },
    },
    {
      id: 'D-h55spec',
      label: 'D with Haiku 5.5 specialists',
      routing: { ...D, profile: 'D-h55spec', standard_specialist: MODELS.haiku55 },
    },
  ];
  if (c.id === 'congress_institutional_ownership' || c.id === 'macro_research')
    cells.push({
      id: 'quick:current',
      label: 'Quick (current = D)',
      depth: 'quick',
      routing: current.routing,
    });
  return cells;
}

/* Suite 4, "contract" (Sonar 6.4 hardening, Nov 28 2026): the typed evidence contract and
   the Standard Research Sonnet 5.5 writer candidate, on the same frozen evidence. One
   variable per pair; production routing is not changed (each cell passes its routing).
     current            production standard (Haiku 4.5 writer), no contract
     current+contract   the same with the evidence contract
     s55w               production routing with a Sonnet 5.5 standard writer, no contract
     s55w+contract      the same with the evidence contract */
function contractCells(c, env) {
  const current = resolveModelRouting({ profile: 'current', env });
  const s55w = {
    ...current,
    profile: 's55w',
    standard: MODELS.sonnet55,
    legacy_standard: MODELS.sonnet55,
  };
  return [
    { id: 'current', label: 'Current (Haiku 4.5 writer)', routing: current },
    {
      id: 'current+contract',
      label: 'Current + evidence contract',
      routing: current,
      evidenceContract: true,
    },
    { id: 's55w', label: 'Sonnet 5.5 standard writer', routing: s55w },
    {
      id: 's55w+contract',
      label: 'Sonnet 5.5 writer + evidence contract',
      routing: s55w,
      evidenceContract: true,
    },
  ];
}

const VARIANTS = {
  contract: {
    cases: () =>
      [...MODEL_BENCH_CASES, ...MODEL_BENCH_PROPOSED_CASES].filter((c) => c.depth === 'standard'),
    cells: (c, env) => contractCells(c, env),
    pairs: () => [
      ['current', 'current+contract', 'Evidence contract, Haiku 4.5 writer'],
      ['s55w', 's55w+contract', 'Evidence contract, Sonnet 5.5 writer'],
      [
        'current+contract',
        's55w+contract',
        'Writer: Haiku 4.5 vs Sonnet 5.5, both with the contract',
      ],
    ],
  },
  'profile-d': {
    cases: () => [
      ...MODEL_BENCH_CASES,
      MODEL_BENCH_DEEP_EXTRA_CASES.find((c) => c.id === 'deep_valuation'),
      ...MODEL_BENCH_PROPOSED_CASES,
    ],
    cells: (c, env) => profileDCells(c, env),
    pairs: (c) =>
      c.depth === 'deep'
        ? [
            ['current', 'D', 'Current vs Profile D'],
            ['D-sonnet-writer', 'D', 'Deep writer: Sonnet 5.5 vs Opus 5.5 (rest of D)'],
          ]
        : [
            ['current', 'D', 'Current vs Profile D'],
            ['D-h45spec', 'D', 'Specialists: Haiku 4.5 vs Sonnet 5.5 (Sonnet writes)'],
            ['D-h55spec', 'D', 'Specialists: Haiku 5.5 vs Sonnet 5.5 (Sonnet writes)'],
          ],
  },
  'deep-uncapped': {
    cases: () => [byId('deep_research'), ...MODEL_BENCH_DEEP_EXTRA_CASES],
    cells: () => deepCells(),
    pairs: () => [
      ['S', 'O-dir', 'Writer: Sonnet 5.5 vs Opus 5.5 (Sonnet reviews)'],
      ['S-dir+O-review', 'O-dir+O-review', 'Writer: Sonnet 5.5 vs Opus 5.5 (Opus reviews)'],
      ['S', 'S-dir+O-review', 'Review: Sonnet 5.5 vs Opus 5.5 (Sonnet writes)'],
      ['O-dir', 'O-dir+O-review', 'Review: Sonnet 5.5 vs Opus 5.5 (Opus writes)'],
    ],
  },
};

/** The cases of a suite variant (none = the seven-case suite). */
export function casesForVariant(variant) {
  return variant && VARIANTS[variant] ? VARIANTS[variant].cases() : MODEL_BENCH_CASES;
}

/** Cells for a case under a suite variant (none = the seven-case suite). */
export function cellsForVariant(c, variant, env = {}) {
  return variant && VARIANTS[variant] ? VARIANTS[variant].cells(c, env) : cellsFor(c, env);
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
    const fromEvidence = o.fromEvidence ? c.evidenceTerms?.[o.fromEvidence] || [] : [];
    if (
      o.any.some((p) => re(p).test(text)) ||
      fromEvidence.some((term) => term && text.includes(term))
    )
      met += 1;
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

  const relationships = relationshipScore(run);
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
    /* Sonar 6.4 hardening: claim survival through validation (written vs kept). */
    claims: (() => {
      const v = meta.validation || {};
      const written = Number(v.claims) || 0;
      return {
        written,
        kept: v.kept ?? null,
        removed: v.removed ?? null,
        rewritten: v.rewritten ?? 0,
        survival: written ? round((Number(v.kept) || 0) / written) : null,
      };
    })(),
    relationships,
    textChars: text.length,
    fingerprint: fp,
  };
}

function round(x, d = 3) {
  return Math.round(x * 10 ** d) / 10 ** d;
}

/* ---------------------------------------------------------------- relationships -- */

/* Language that links one fact to another (cause, comparison, contrast, timing,
   exposure). A finding that cites two or more datasets AND uses it is doing synthesis;
   one that cites a single dataset, or lists records without linking them, is summary. */
const RELATIONAL =
  /\b(because|driven by|due to|reflects?|explains?|consistent with|inconsistent with|contradict\w*|despite|while|whereas|compared (?:with|to)|relative to|in contrast|correlat\w*|coincid\w*|preced\w*|followed by|ahead of|after the|implies|suggests?|exposure to|exposed to|tied to|linked to|offsets?|amplif\w*|depends? on|dependence|concentrat\w*)\b/i;

function datasetOf(e) {
  return String(e?.source || e?.category || 'unknown').split(/[:/]/)[0];
}

/* Entity tokens for a join check: tickers and capitalized names (not sentence words). */
const NOT_ENTITY = new Set(
  'The This That These Those Their There When While Which What Where After Before Since During Over Under Between Among Despite Although However Government Federal Congress Members Member Institutional Revenue Fiscal Quarter Year Data Records Record Evidence'.split(
    ' ',
  ),
);
function entityTokens(text) {
  const t = String(text || '');
  const out = new Set();
  for (const m of t.matchAll(/\b[A-Z]{2,5}\b/g)) out.add(m[0]);
  for (const m of t.matchAll(/\b[A-Z][a-z]{3,}\b/g)) if (!NOT_ENTITY.has(m[0])) out.add(m[0]);
  return out;
}
function yearsOf(e) {
  const t = `${e?.period?.label || e?.period || ''} ${e?.date || ''} ${e?.title || ''}`;
  return [...t.matchAll(/\b(20[1-3]\d)\b/g)].map((m) => Number(m[1]));
}
const TEMPORAL =
  /\b(before|after|ahead of|since|from \d{4}|to \d{4}|versus|vs\.?|compared|preced\w*|followed|year[- ]over[- ]year|grew|growth|declin\w*|rose|fell|trend)\b/i;

/**
 * Whether the answer relates datasets to each other rather than summarizing records. A
 * finding counts as a VALID cross-dataset insight only if all of these hold:
 *   - it cites records from two or more datasets and uses relating language
 *   - join: the cited records share an entity (ticker or name), so the datasets are joined
 *     on the same company, member or country
 *   - periods: the cited records' years are within a year of each other, unless the
 *     finding is explicitly a comparison over time
 *   - support: every number in the finding traces to the evidence or computed metrics
 * Citing several datasets in one paragraph without a valid relationship earns nothing.
 */
export function relationshipScore(run) {
  const evidence = run?.evidence || [];
  const byMarker = new Map(evidence.map((e) => [String(e.marker ?? e.id), e]));
  const inEvidence = new Set(evidence.map(datasetOf));
  const pool = evidencePool(run);
  const cited = new Set();
  const pairs = new Set();
  let cross = 0;
  let valid = 0;
  const failures = { join: 0, period: 0, unsupported: 0 };
  const examples = [];
  const findings = run?.keyFindings || [];
  for (const f of findings) {
    const recs = (f.evidence || []).map((m) => byMarker.get(String(m))).filter(Boolean);
    const ds = new Set(recs.map(datasetOf));
    ds.forEach((d) => cited.add(d));
    const words = [f.title, f.explanation, f.comparison, f.implication].filter(Boolean).join(' ');
    if (ds.size < 2 || !RELATIONAL.test(words)) continue;
    cross += 1;
    /* The join key: an entity every cited record shares (records with no entity, such as
       a macro series, do not vote). LMT trades next to RTX contracts is not a join. */
    const sets = recs
      .map((r) => entityTokens(`${r.title || ''} ${r.text || ''}`))
      .filter((x) => x.size);
    const joinOk = sets.length < 2 || [...sets[0]].some((x) => sets.every((set) => set.has(x)));
    const ys = recs.flatMap(yearsOf);
    const periodOk = TEMPORAL.test(words) || !ys.length || Math.max(...ys) - Math.min(...ys) <= 1;
    const nums = [...words.matchAll(NUM)].map((m) => parseNum(m[0])).filter((v) => v != null);
    const supportOk = nums.every((v) => traced(v, pool));
    if (!joinOk) failures.join += 1;
    if (!periodOk) failures.period += 1;
    if (!supportOk) failures.unsupported += 1;
    if (joinOk && periodOk && supportOk) {
      valid += 1;
      const list = [...ds].sort();
      for (let i = 0; i < list.length; i += 1)
        for (let j = i + 1; j < list.length; j += 1) pairs.add(`${list[i]}+${list[j]}`);
    } else if (examples.length < 3) {
      examples.push({
        finding: String(f.title || words).slice(0, 120),
        failed: [!joinOk && 'join', !periodOk && 'period', !supportOk && 'support'].filter(Boolean),
      });
    }
  }
  const possible = (inEvidence.size * (inEvidence.size - 1)) / 2;
  return {
    datasetsInEvidence: inEvidence.size,
    datasetsCited: cited.size,
    crossFindings: cross,
    validCrossInsights: valid,
    crossFindingShare: findings.length ? round(valid / findings.length) : 0,
    failures,
    pairsLinked: pairs.size,
    pairCoverage: possible ? round(Math.min(1, pairs.size / Math.min(possible, 6))) : null,
    pairs: [...pairs].slice(0, 12),
    examples,
  };
}

/**
 * Whether the datasets a case needs were retrieved (from the frozen snapshot, so it is the
 * same for every cell and never a model effect). Each required group is satisfied by any
 * one source in it ("composition" = the production composition step ran). Status:
 * retrieved, empty_at_source (called, nothing returned), not_planned[:reason].
 */
export function retrievalCheck(c, snap) {
  const items = new Map();
  for (const call of snap?.calls || [])
    items.set(call.source, (items.get(call.source) || 0) + (call.output?.items?.length || 0));
  const excluded = new Map((snap?.plan?.excluded || []).map((e) => [e.source, e.reason]));
  const groups = (c?.requiredDatasets || []).map((g) => {
    const hit = g.find((src) =>
      src === 'composition' ? Boolean(snap?.composition) : (items.get(src) || 0) > 0,
    );
    if (hit) return { group: g, status: 'retrieved', source: hit };
    const empty = g.find((src) => items.has(src));
    if (empty) return { group: g, status: 'empty_at_source', source: empty };
    const why = g.map((src) => excluded.get(src)).find(Boolean);
    return { group: g, status: why ? `not_planned:${why}` : 'not_planned' };
  });
  return {
    groups,
    retrieved: groups.filter((x) => x.status === 'retrieved').length,
    total: groups.length,
    complete: groups.every((x) => x.status === 'retrieved'),
  };
}

/** Whether the calculations a case needs ran: computed metrics, the valuation model, the composition. */
export function calcCheck(c, run) {
  const need = c?.requiredCalcs || [];
  const have = {
    metrics: (run?.quantitativeMetrics || []).length > 0,
    valuation: Boolean(run?.valuation),
    composition:
      Boolean(run?.researchMetadata?.fulfillment) &&
      run.researchMetadata.fulfillment.state !== 'failed',
  };
  const missing = need.filter((k) => !have[k]);
  return { required: need, missing, ok: missing.length === 0 };
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

/* Usage and cost summaries live in lib/sonar/model-usage.js (production uses them too). */
export { summarizeUsage } from '@/lib/sonar/model-usage';

/* ---------------------------------------------------------------- judges --------- */

/* Research-quality criteria, in the order they matter. Latency and cost are never part
   of a quality score; they are reported beside it. */
export const CRITERIA = [
  ['objective', 'Objective completion: the research question is fully answered'],
  [
    'financial',
    'Financial reasoning: mechanisms, magnitudes, comparisons, what it means for the business or investor',
  ],
  [
    'insight',
    'Insight quality: non-obvious, decision-useful conclusions rather than restated data',
  ],
  ['evidence', 'Evidence support: each material claim is tied to the cited evidence'],
  ['correctness', 'Factual correctness: nothing contradicts the evidence; no invented numbers'],
  [
    'relationships',
    'Cross-dataset relationships: states a valid, relevant relationship between datasets grounded in the evidence (same entity joined correctly, periods aligned, supported by computed results). Citing several datasets side by side, or listing observations from each, earns nothing.',
  ],
];
const JUDGES = ['claude-opus-5-5', 'claude-sonnet-5-5'];

function evidenceDigest(run, cap = 40) {
  return (run?.evidence || [])
    .slice(0, cap)
    .map(
      (e) =>
        `[${e.marker ?? e.id}] (${datasetOf(e)}) ${e.title || ''}: ${String(e.text || '').slice(0, 280)}`,
    )
    .join('\n');
}

/**
 * Absolute rubric. The judge sees the question, the expected objectives, the frozen
 * evidence (with each record's dataset) and an anonymized answer; never the model.
 */
export function judgePrompt(c, run) {
  const system =
    'You grade financial research answers against the evidence they were given. Be strict and concrete. Reply with JSON only.';
  const user = `QUESTION: ${c.query}

WHAT A COMPLETE ANSWER ADDRESSES:
${(c.objectives || []).map((o) => `- ${o.label}`).join('\n')}

EVIDENCE THE ANSWER HAD (frozen; dataset in parentheses):
${evidenceDigest(run) || '(none)'}

ANSWER TO GRADE:
${runText(run).slice(0, 12000)}

Score each criterion 1 to 5 (5 best):
${CRITERIA.map(([k, d]) => `- ${k}: ${d}`).join('\n')}
List up to 3 unsupported or wrong claims verbatim.
JSON: {${CRITERIA.map(([k]) => `"${k}":n`).join(',')},"unsupported":["..."],"note":"one sentence"}`;
  return { system, user };
}

export function parseJudge(answer) {
  const text = String(answer || '');
  const keys = CRITERIA.map(([k]) => k);
  let j = null;
  try {
    const m = text.match(/\{[\s\S]*\}/);
    j = JSON.parse(m ? m[0] : text);
  } catch {
    /* A reply cut off after the scores (a long "unsupported" list) still carries them. */
    j = Object.fromEntries(
      keys.map((k) => [k, Number((text.match(new RegExp(`"${k}"\\s*:\\s*(\\d)`)) || [])[1])]),
    );
  }
  const vals = keys.map((k) => Number(j?.[k]));
  const present = vals.filter((v) => v >= 1 && v <= 5);
  if (present.length < keys.length - 1) return null;
  return {
    ...Object.fromEntries(keys.map((k, i) => [k, vals[i] >= 1 && vals[i] <= 5 ? vals[i] : null])),
    overall: round(present.reduce((a, b) => a + b, 0) / present.length, 2),
    unsupported: Array.isArray(j?.unsupported) ? j.unsupported.slice(0, 3).map(String) : [],
    note: String(j?.note || '').slice(0, 300),
  };
}

/**
 * Paired comparison: two anonymized answers to the same question on the same frozen
 * evidence. Each criterion gets a winner (X, Y or tie) and a one-line reason. The runner
 * asks twice with the order swapped and with two judges, so position and self-preference
 * bias show up as disagreement instead of as a result.
 */
export function pairPrompt(c, x, y) {
  const system =
    'You compare two financial research answers written from the same evidence. Judge substance, not length or style. Reply with JSON only.';
  const user = `QUESTION: ${c.query}

WHAT A COMPLETE ANSWER ADDRESSES:
${(c.objectives || []).map((o) => `- ${o.label}`).join('\n')}

EVIDENCE BOTH ANSWERS HAD (frozen; dataset in parentheses):
${evidenceDigest(x, 36) || '(none)'}

ANSWER X:
${runText(x).slice(0, 9000)}

ANSWER Y:
${runText(y).slice(0, 9000)}

For each criterion pick "X", "Y" or "tie", with a reason of at most 25 words naming the specific difference:
${CRITERIA.map(([k, d]) => `- ${k}: ${d}`).join('\n')}
Then "overall": which answer would a portfolio manager rather receive.
JSON: {${CRITERIA.map(([k]) => `"${k}":{"winner":"X|Y|tie","reason":"..."}`).join(',')},"overall":{"winner":"X|Y|tie","reason":"..."}}`;
  return { system, user };
}

/** Parsed verdicts mapped back to cells: { criterion: { winner: 'left'|'right'|'tie', reason } }. */
export function parsePair(answer, { xIs }) {
  try {
    const m = String(answer || '').match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : answer);
    const out = {};
    for (const k of [...CRITERIA.map(([c]) => c), 'overall']) {
      const w = String(j?.[k]?.winner || '')
        .trim()
        .toUpperCase();
      if (!['X', 'Y', 'TIE'].includes(w)) return null;
      const side = w === 'TIE' ? 'tie' : (w === 'X') === (xIs === 'left') ? 'left' : 'right';
      out[k] = { winner: side, reason: String(j[k].reason || '').slice(0, 240) };
    }
    return out;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- pairs ---------- */

/** The head-to-head comparisons for a case (left vs right). */
export function pairsFor(c, variant = null) {
  if (variant && VARIANTS[variant]) return VARIANTS[variant].pairs(c);
  if (c.depth === 'deep')
    return [
      ['C', 'B', 'Sonnet 5.5 director (C) vs Opus 5.5 director (B)'],
      ['A', 'B', 'Sonnet 5.5 everywhere (A) vs Opus 5.5 director (B)'],
      ['A', 'C', 'Sonnet 5.5 everywhere (A) vs C with selective Opus'],
      ['current', 'C', 'Current production vs C'],
    ];
  const out = [
    ['model:sonnet55', 'model:opus55', 'Sonnet 5.5 vs Opus 5.5'],
    ['model:haiku55', 'model:sonnet55', 'Haiku 5.5 vs Sonnet 5.5'],
    ['model:haiku45', 'model:haiku55', 'Haiku 4.5 vs Haiku 5.5'],
    ['current', 'BC', 'Current production vs B/C standard'],
  ];
  if (c.id === 'congress_institutional_ownership' || c.id === 'macro_research')
    out.push(['quick:current', 'quick:haiku55', 'Quick: Haiku 4.5 vs Haiku 5.5']);
  return out;
}

/* ---------------------------------------------------------------- plan ----------- */

/**
 * The ordered steps of a suite. Phase 1 freezes evidence (and checks availability),
 * phase 2 runs every cell, phase 3 judges. Each step has a stable key, which is how the
 * worker knows what is done.
 */
export function suitePlan({ deepTrials = 3, env = {}, variant = null } = {}) {
  const cases = casesForVariant(variant);
  const trialsOf = (c) => (c.depth === 'deep' ? deepTrials : 1);
  const steps = [{ key: 'availability', phase: 1, kind: 'availability' }];
  for (const c of cases)
    steps.push({ key: `capture|${c.id}`, phase: 1, kind: 'capture', caseId: c.id });
  for (const c of cases)
    for (let t = 1; t <= trialsOf(c); t += 1)
      for (const cell of cellsForVariant(c, variant, env))
        steps.push({
          key: `run|${c.id}|${cell.id}|t${t}`,
          phase: 2,
          kind: 'run',
          caseId: c.id,
          cellId: cell.id,
          trial: t,
          variant,
        });
  for (const c of cases)
    for (let t = 1; t <= trialsOf(c); t += 1) {
      for (const [left, right] of pairsFor(c, variant))
        for (const judge of JUDGES)
          for (const xIs of ['left', 'right'])
            steps.push({
              key: `pair|${c.id}|${left}|${right}|t${t}|${judge}|${xIs}`,
              phase: 3,
              kind: 'pair',
              caseId: c.id,
              left,
              right,
              trial: t,
              judge,
              xIs,
              variant,
            });
      for (const cell of cellsForVariant(c, variant, env))
        for (const judge of JUDGES)
          steps.push({
            key: `judge|${c.id}|${cell.id}|t${t}|${judge}`,
            phase: 3,
            kind: 'judge',
            caseId: c.id,
            cellId: cell.id,
            trial: t,
            judge,
            variant,
          });
    }
  return steps;
}

/* ---------------------------------------------------------------- aggregation ---- */

const norm5 = (v) => (Number.isFinite(v) ? (v - 1) / 4 : null);
function avg(xs) {
  const v = xs.filter((x) => Number.isFinite(x));
  return v.length ? round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/**
 * Quality score, 0 to 100, research quality only (weights in priority order):
 *   objective completion 25, financial reasoning 20, insight 15, evidence support 20,
 *   factual correctness 20. Deterministic and judge signals are blended where both exist;
 *   a criterion with no signal is dropped and the weights renormalize.
 */
export function qualityScore(score, judge) {
  const det = {
    objective: score.objectives.total ? score.objectives.met / score.objectives.total : 0,
    evidence: avg([score.citations.validity, score.citations.coverage, score.numbers.fidelity]),
    correctness:
      score.numbers.fidelity == null
        ? null
        : Math.max(0, score.numbers.fidelity - 0.25 * score.forbiddenHits),
  };
  const parts = [
    [25, avg([det.objective, norm5(judge?.objective)])],
    [20, norm5(judge?.financial)],
    [15, norm5(judge?.insight)],
    [20, avg([det.evidence, norm5(judge?.evidence)])],
    [20, avg([det.correctness, norm5(judge?.correctness)])],
  ].filter(([, v]) => v != null);
  if (!score.completed) return 0;
  const w = parts.reduce((a, [x]) => a + x, 0);
  return w ? round((100 * parts.reduce((a, [x, v]) => a + x * v, 0)) / w, 1) : null;
}

/** Mean of the judges' absolute scores for one run, and how far apart they were. */
export function meanJudge(judges = []) {
  const ok = judges.filter(Boolean);
  if (!ok.length) return null;
  const keys = [...CRITERIA.map(([k]) => k), 'overall'];
  const out = Object.fromEntries(keys.map((k) => [k, avg(ok.map((j) => j[k]))]));
  out.judges = ok.length;
  out.spread = ok.length > 1 ? round(Math.abs(ok[0].overall - ok[1].overall), 2) : 0;
  return out;
}

/**
 * Side-by-side table from result rows ({ caseId, cellId, cellLabel, score, usage,
 * judge }), one row per cell, averaged across cases and trials. Quality first.
 */
export function aggregate(rows) {
  const byCell = {};
  for (const r of rows) (byCell[r.cellId] ||= []).push(r);
  const mean = (xs) => avg(xs);
  const pct = (xs, p) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(p * s.length))];
  };
  return Object.entries(byCell).map(([cellId, rs]) => {
    const sc = rs.map((r) => r.score);
    const lat = sc.map((s) => s.durationMs).filter((x) => x != null);
    const j = (k) => mean(rs.map((r) => r.judge?.[k]));
    return {
      cellId,
      label: rs[0].cellLabel || cellId,
      runs: rs.length,
      quality: mean(rs.map((r) => qualityScore(r.score, r.judge))),
      judgeObjective: j('objective'),
      judgeFinancial: j('financial'),
      judgeInsight: j('insight'),
      judgeEvidence: j('evidence'),
      judgeCorrectness: j('correctness'),
      judgeRelationships: j('relationships'),
      judgeOverall: j('overall'),
      judgeSpread: j('spread'),
      objectiveCompletion: mean(
        sc.map((s) => (s.objectives.total ? s.objectives.met / s.objectives.total : 0)),
      ),
      caveatRate: mean(sc.map((s) => (s.caveats.total ? s.caveats.met / s.caveats.total : 0))),
      forbiddenHits: sc.reduce((a, s) => a + s.forbiddenHits, 0),
      citationCoverage: mean(sc.map((s) => s.citations.coverage)),
      citationValidity: mean(sc.map((s) => s.citations.validity)),
      numericFidelity: mean(sc.map((s) => s.numbers.fidelity)),
      unsupportedPerRun: mean(
        sc.map(
          (s) =>
            s.unsupported.findingsWithoutValidCitation + s.unsupported.sentencesWithUntracedNumbers,
        ),
      ),
      crossFindingShare: mean(sc.map((s) => s.relationships?.crossFindingShare)),
      validCrossPerRun: mean(sc.map((s) => s.relationships?.validCrossInsights)),
      pairsLinked: mean(sc.map((s) => s.relationships?.pairsLinked)),
      retrievalComplete: mean(
        sc.filter((s) => s.retrieval).map((s) => (s.retrieval.complete ? 1 : 0)),
      ),
      calcsOk: mean(sc.filter((s) => s.calcs).map((s) => (s.calcs.ok ? 1 : 0))),
      truncatedPerRun: mean(sc.filter((s) => s.roles).map((s) => s.roles.truncated)),
      invalidPerRun: mean(sc.filter((s) => s.roles).map((s) => s.roles.invalid_output)),
      roleTimeoutsPerRun: mean(sc.filter((s) => s.roles).map((s) => s.roles.timeout)),
      fallbacks: sc.reduce((a, s) => a + (s.roles?.fallbacks || 0), 0),
      specialistsDone: mean(
        sc.filter((s) => s.specialists?.calls).map((s) => s.specialists.done / s.specialists.calls),
      ),
      completionRate: mean(sc.map((s) => (s.completed ? 1 : 0))),
      partialRate: mean(sc.map((s) => (s.partial ? 1 : 0))),
      timeoutRate: mean(sc.map((s) => (s.timedOut ? 1 : 0))),
      deterministicFallbacks: sc.filter((s) => s.deterministicFallback).length,
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

/**
 * Head-to-head summary from pair verdict rows ({ caseId, left, right, judge, xIs,
 * verdict }). Per comparison and criterion: right's net win rate in [-1, 1] (wins minus
 * losses over judgments), the raw counts, and whether the order-swapped and
 * cross-judge verdicts agreed.
 */
export function aggregatePairs(rows) {
  const groups = {};
  for (const r of rows) {
    if (!r.verdict) continue;
    const k = `${r.left}|${r.right}`;
    (groups[k] ||= { left: r.left, right: r.right, label: r.label, rows: [] }).rows.push(r);
  }
  return Object.values(groups).map((g) => {
    const crit = {};
    for (const k of [...CRITERIA.map(([c]) => c), 'overall']) {
      let right = 0;
      let left = 0;
      let tie = 0;
      for (const r of g.rows) {
        const w = r.verdict[k]?.winner;
        if (w === 'right') right += 1;
        else if (w === 'left') left += 1;
        else tie += 1;
      }
      const n = right + left + tie;
      crit[k] = { right, left, tie, net: n ? round((right - left) / n) : null };
    }
    /* Consistency: the same case/trial/judge in both orders agreeing on overall. */
    const byKey = {};
    for (const r of g.rows)
      (byKey[`${r.caseId}|${r.trial}|${r.judge}`] ||= []).push(r.verdict.overall?.winner);
    const both = Object.values(byKey).filter((v) => v.length === 2);
    const consistent = both.filter((v) => v[0] === v[1]).length;
    const byJudge = {};
    for (const r of g.rows) {
      const w = r.verdict.overall?.winner;
      const b = (byJudge[r.judge] ||= { right: 0, left: 0, tie: 0 });
      b[w === 'right' ? 'right' : w === 'left' ? 'left' : 'tie'] += 1;
    }
    return {
      left: g.left,
      right: g.right,
      label: g.label,
      judgments: g.rows.length,
      criteria: crit,
      orderConsistency: both.length ? round(consistent / both.length) : null,
      byJudge,
    };
  });
}

/* ---------------------------------------------------------------- proposed cases - */

/**
 * The next benchmark tier (proposed, not yet run). Each targets a capability the first
 * seven only touch: complex cross-dataset screening, financial modelling, contradictory
 * evidence, causal reasoning, and partially available data. Same shape as the cases
 * above, so promoting one is moving it into MODEL_BENCH_CASES.
 */
export const MODEL_BENCH_PROPOSED_CASES = [
  {
    id: 'screen_congress_contracts_13f',
    evidenceClass: 'complete',
    requiredDatasets: [
      ['congress_company', 'congress_sector', 'congress_activity'],
      ['contracts_history', 'contracts_profile'],
      ['institutional_13f', 'holder_positioning'],
    ],
    requiredCalcs: ['metrics'],
    category: 'Complex cross-dataset screening',
    depth: 'deep',
    query:
      'Find companies where members of Congress bought shares in the last 12 months, the company won new federal contracts in the same period, and institutional ownership rose. Rank them and explain what links the three signals.',
    objectives: [
      {
        id: 'screen',
        label: 'Applies all three filters, not one or two',
        any: ['contract', 'institution|13f'],
      },
      { id: 'rank', label: 'Ranks with a stated basis', any: ['rank', 'top', 'score'] },
      {
        id: 'link',
        label: 'Explains the timing link between trades, awards and holdings',
        any: ['before|after|ahead of|preced|follow'],
      },
    ],
    caveats: ['disclos', 'lag|delay', 'correlation|not evidence of'],
    forbidden: [CONDUCT],
  },
  {
    id: 'screen_lobbying_contracts_margin',
    evidenceClass: 'complete',
    requiredDatasets: [
      ['lobbying_company', 'lobbying_leaders', 'lobbying_profile'],
      ['contracts_history', 'contracts_profile'],
      ['company_financials', 'peer_financials'],
    ],
    requiredCalcs: ['metrics'],
    category: 'Complex cross-dataset screening',
    depth: 'standard',
    query:
      'Which defense contractors increased lobbying spend while their contract awards grew faster than revenue? What does that say about margin pressure?',
    objectives: [
      { id: 'lobbying', label: 'Uses lobbying spend', any: ['lobby'] },
      {
        id: 'awards_vs_revenue',
        label: 'Compares award growth with revenue growth',
        any: ['award', 'revenue'],
      },
      { id: 'margin', label: 'Reasons about margins', any: ['margin'] },
    ],
    caveats: ['award.*(?:obligat|ceiling)|obligat', 'lag'],
    forbidden: [CONDUCT],
  },
  {
    id: 'model_dcf_sensitivity',
    evidenceClass: 'complete',
    requiredDatasets: [['company_financials'], ['capex_monetization'], ['estimates']],
    requiredCalcs: ['valuation'],
    category: 'Financial modelling',
    depth: 'deep',
    query:
      'Build a three-scenario DCF for NVIDIA with explicit revenue, margin and capex paths, and show how intrinsic value moves with a 1-point change in WACC and terminal growth.',
    objectives: [
      { id: 'scenarios', label: 'Three explicit scenarios', any: ['bear', 'base', 'bull'] },
      { id: 'drivers', label: 'Revenue, margin and capex paths', any: ['capex', 'margin'] },
      {
        id: 'sensitivity',
        label: 'WACC and terminal growth sensitivity',
        any: ['sensitiv', 'wacc'],
      },
    ],
    caveats: ['assum'],
    forbidden: [],
  },
  {
    id: 'model_contract_revenue_bridge',
    evidenceClass: 'complete',
    requiredDatasets: [
      ['contracts_profile', 'contracts_history', 'composition'],
      ['company_financials'],
      ['estimates'],
    ],
    requiredCalcs: ['composition'],
    category: 'Financial modelling',
    depth: 'standard',
    query:
      "Estimate how much of Palantir's next-year revenue is already covered by awarded government contracts, and what growth the commercial business must deliver to hit consensus.",
    objectives: [
      {
        id: 'backlog',
        label: 'Converts awards to an annual revenue estimate',
        any: ['award', 'backlog|obligat'],
      },
      {
        id: 'consensus',
        label: 'Compares with consensus or guidance',
        any: ['consensus|guidance|estimate'],
      },
      {
        id: 'implied',
        label: 'Derives the implied commercial growth',
        any: ['commercial', 'implied|required|must'],
      },
    ],
    caveats: ['assum', 'obligat|ceiling'],
    forbidden: [],
  },
  {
    id: 'contradiction_insider_vs_institutions',
    evidenceClass: 'complete',
    requiredDatasets: [['sec_filings'], ['institutional_13f', 'holder_positioning']],
    requiredCalcs: [],
    category: 'Contradictory evidence',
    depth: 'standard',
    query:
      'Insiders at Tesla have been selling while institutions added shares. Which signal deserves more weight, and why?',
    objectives: [
      { id: 'both', label: 'States both signals with data', any: ['insider', 'institution|13f'] },
      {
        id: 'weigh',
        label: 'Weighs them with reasons (plans, tax, rebalancing, index flows)',
        any: ['10b5-1|plan|tax|index|rebalanc|passive'],
      },
      {
        id: 'verdict',
        label: 'Reaches a calibrated conclusion',
        any: ['more weight|outweigh|less informative|more informative'],
      },
    ],
    caveats: ['lag|quarter', 'uncertain|cannot'],
    forbidden: [CONDUCT],
  },
  {
    id: 'contradiction_macro_vs_market',
    evidenceClass: 'complete',
    requiredDatasets: [['macro_series', 'macro_country']],
    requiredCalcs: [],
    category: 'Contradictory evidence',
    depth: 'standard',
    query:
      "Turkey's official inflation is falling but the lira keeps weakening. Reconcile the two and say what it implies for the next six months.",
    objectives: [
      {
        id: 'both',
        label: 'Uses both inflation and currency data',
        any: ['inflation', 'lira|try'],
      },
      {
        id: 'reconcile',
        label: 'Offers mechanisms (real rates, reserves, current account, credibility)',
        any: ['real (?:interest )?rate|reserve|current account|credib'],
      },
      {
        id: 'outlook',
        label: 'Six-month implication',
        any: ['six months|6 months|next two quarters|near term'],
      },
    ],
    caveats: ['forecast|uncertain'],
    forbidden: [],
  },
  {
    id: 'causal_export_controls_revenue',
    evidenceClass: 'complete',
    requiredDatasets: [['export_controls'], ['revenue_geo'], ['company_financials']],
    requiredCalcs: ['metrics'],
    category: 'Causal reasoning',
    depth: 'deep',
    query:
      "Did US export controls cause NVIDIA's China revenue decline, or would it have happened anyway? Separate the policy effect from demand and competition.",
    objectives: [
      {
        id: 'timeline',
        label: 'Lines up policy dates with revenue',
        any: ['export', 'quarter|fiscal'],
      },
      {
        id: 'alternatives',
        label: 'Considers alternative causes (domestic competitors, demand)',
        any: ['huawei|domestic|competi', 'demand'],
      },
      {
        id: 'attribution',
        label: 'Attributes with stated confidence, not certainty',
        any: ['likely|partly|largely|most of'],
      },
    ],
    caveats: ['cannot (?:fully )?(?:isolate|separate)|confound|correlation'],
    forbidden: [],
  },
  {
    id: 'causal_rates_bank_ownership',
    evidenceClass: 'complete',
    requiredDatasets: [['macro_series'], ['institutional_13f', 'holder_positioning']],
    requiredCalcs: [],
    category: 'Causal reasoning',
    depth: 'standard',
    query:
      'Did rising interest rates drive the shift in institutional ownership of regional banks over the last two years?',
    objectives: [
      { id: 'rates', label: 'Uses the rate path', any: ['rate', 'fed|policy'] },
      { id: 'ownership', label: 'Uses ownership changes', any: ['institution|13f|holders'] },
      {
        id: 'mechanism',
        label: 'Names a mechanism (deposit costs, unrealized losses, CRE)',
        any: ['deposit|unrealized|cre\\b|commercial real estate'],
      },
    ],
    caveats: ['correlation|confound|other factors'],
    forbidden: [],
  },
  {
    id: 'partial_private_company',
    evidenceClass: 'incomplete_evidence',
    evidenceNote: 'Intentionally incomplete: a private company has no public financials.',
    requiredDatasets: [['contracts_history', 'contracts_profile']],
    requiredCalcs: [],
    category: 'Partially available data',
    depth: 'standard',
    query:
      'How exposed is Anduril to the Pentagon budget, and how does that compare with listed defense peers?',
    objectives: [
      { id: 'contracts', label: 'Uses the contract records that exist', any: ['contract|award'] },
      {
        id: 'peers',
        label: 'Compares with listed peers',
        any: ['\\b(LMT|RTX|NOC|GD|LHX|PLTR)\\b'],
      },
      {
        id: 'gap',
        label: 'Says what cannot be known (no public financials)',
        any: ['private|not public|no (?:public )?financials|undisclosed'],
      },
    ],
    caveats: ['private|undisclosed'],
    forbidden: [],
  },
  {
    id: 'partial_stale_filings',
    evidenceClass: 'incomplete_evidence',
    evidenceNote: 'Intentionally incomplete: filings lag and one is delayed.',
    requiredDatasets: [['institutional_13f', 'holder_positioning'], ['sec_filings']],
    requiredCalcs: [],
    category: 'Partially available data',
    depth: 'standard',
    query:
      'What did hedge funds do with Super Micro Computer after its delayed 10-K, and what can and cannot be concluded from filings so far?',
    objectives: [
      { id: 'flows', label: 'Uses 13F changes', any: ['13f|hedge fund|institution'] },
      { id: 'filing', label: 'Accounts for the delayed filing', any: ['10-k|delay|late'] },
      {
        id: 'limits',
        label: 'Separates what is known from what is not yet filed',
        any: ['not yet|cannot|lag|45 days'],
      },
    ],
    caveats: ['lag|quarter|45 days'],
    forbidden: [],
  },
];
