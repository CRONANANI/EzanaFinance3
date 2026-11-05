/**
 * Deep research mode and the investment risk assessment (Nov 2026).
 *   npm run test:sonar-deep
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { deepResearchSignal, estimateLabel, deepResearchEnabled, deepResearchForGuests } =
  await import('@/lib/sonar/deep-research');
const { understandQuery } = await import('@/lib/sonar/understand');
const { buildResearchSpec, isInvestmentMemo } = await import('@/lib/sonar/engine/research-spec');
const { planResearch } = await import('@/lib/sonar/engine/planner');
const { peersOf } = await import('@/lib/sonar/industries');
const { toEvidence, withMarkers } = await import('@/lib/sonar/engine/evidence');
const { analyze } = await import('@/lib/sonar/engine/analysis');
const { validateMemo, deterministicMemo, renderMemoBrief, unsupportedFigures } =
  await import('@/lib/sonar/engine/investment-memo');
const { companyFinancials, holderPositioning, peerFinancials } =
  await import('@/lib/sonar/engine/sources-memo');

const NVDA_Q =
  "What are the biggest risks to NVIDIA's growth over the next three years? Analyze its financial performance, institutional ownership, government contracts, industry exposure, and competitive landscape.";

const NVDA_RES = {
  subject: { kind: 'company', id: 'NVDA', label: 'NVIDIA Corporation' },
  company: { ticker: 'NVDA', name: 'NVIDIA Corporation' },
  universe: {
    label: 'NVIDIA Corporation',
    tickers: ['NVDA'],
    names: { NVDA: 'NVIDIA Corporation' },
  },
  peers: peersOf('NVDA'),
  countries: [],
};

test('a research assignment is offered deep research; ordinary pings are not', () => {
  const s = deepResearchSignal(NVDA_Q);
  assert.equal(s.deep, true);
  assert.deepEqual(
    s.angles.map((a) => a.id),
    ['financials', 'ownership', 'contracts', 'industry', 'competition'],
  );
  assert.match(s.estimate.label, /^about \d to \d minutes$/);
  for (const q of [
    'What are the risks to Apple over the next 5 years?',
    'Give me an investment thesis on AMD: valuation, competition, and customer concentration',
  ]) {
    assert.equal(deepResearchSignal(q).deep, true, q);
  }
  /* Nov 2026, research modes: a two-family analysis of one company is
     standard research (it runs automatically), not a deep research offer.
     Changed from deep under the research-mode classifier; listed for the
     product owner's review. */
  assert.equal(
    deepResearchSignal('Analyze Tesla financial performance and competitive landscape').deep,
    false,
  );
  for (const q of [
    'Nancy Pelosi',
    'Lockheed Martin',
    'what is the price of nvidia',
    'Who is lobbying hardest on AI regulation?',
    'How exposed is Nvidia to China export controls?',
    'semiconductor industry in Taiwan',
    'Give me a breakdown of the semiconductor industry in Taiwan',
    'Which defense stocks are members of Congress trading?',
    'What has Nancy Pelosi been buying lately?',
    'analyze apple',
  ]) {
    assert.equal(deepResearchSignal(q).deep, false, q);
  }
  assert.equal(estimateLabel(45, 100), 'about 1 to 2 minutes');
  assert.equal(deepResearchEnabled({}), true);
  assert.equal(deepResearchEnabled({ SONAR_DEEP_RESEARCH: 'false' }), false);
  assert.equal(deepResearchForGuests({ SONAR_DEEP_GUESTS: 'false' }), false);
});

test('the NVIDIA question is planned as an investment risk assessment', async () => {
  const u = await understandQuery(NVDA_Q, {});
  const spec = buildResearchSpec(u, { query: NVDA_Q, resolution: NVDA_RES, depth: 'deep' });
  assert.equal(spec.format, 'investment_memo');
  assert.equal(spec.objective.primary, 'risk_assessment');
  assert.ok(spec.reportComponents.includes('risk_assessments'));
  const plan = planResearch(spec, NVDA_RES, { depth: 'deep' });
  const sources = plan.tasks.map((t) => t.source);
  for (const s of [
    'company_financials',
    'product_segments',
    'holder_positioning',
    'peer_financials',
    'contracts_history',
    'analysts',
    'news',
  ]) {
    assert.ok(sources.includes(s), s);
  }
  assert.ok(!sources.includes('institutional_13f'), 'positioning replaces the top-holders list');
  assert.ok(plan.tasks.every((t) => t.budgetMs >= 20_000));
  const peers = plan.tasks.find((t) => t.source === 'peer_financials').params.peers;
  assert.ok(peers.some((p) => p.ticker === 'AMD'));
  const phrases = plan.tasks.find((t) => t.source === 'news').params.phrases;
  assert.ok(phrases.includes('NVIDIA export controls'), phrases.join(' / '));
  assert.ok(phrases.includes('NVIDIA competition'));

  /* A question with no company is never a memo. */
  assert.equal(isInvestmentMemo('risks to the copper market over the next 3 years', null), false);
});

/* A fake admin client: from(table) returns a chainable query resolving to
   the rows given for that table; rpc(name) returns the given payload. */
function fakeAdmin({ tables = {}, rpc = {} } = {}) {
  const chain = (rows) => {
    const q = {
      select: () => q,
      in: () => q,
      eq: () => q,
      gte: () => q,
      order: () => q,
      limit: () => Promise.resolve({ data: rows, error: null }),
      then: (r) => Promise.resolve({ data: rows, error: null }).then(r),
    };
    return q;
  };
  return {
    from: (t) => chain(tables[t] || []),
    rpc: async (name) => rpc[name] || { data: null, error: { message: 'missing' } },
  };
}

const FUND = [
  ['revenue', 'quarter', 'CY2026Q2', '2026-07-26', 96221e6],
  ['gross_profit', 'quarter', 'CY2026Q2', '2026-07-26', 72142e6],
  ['operating_income', 'quarter', 'CY2026Q2', '2026-07-26', 63734e6],
  ['revenue', 'quarter', 'CY2026Q1', '2026-04-26', 81615e6],
  ['gross_profit', 'quarter', 'CY2026Q1', '2026-04-26', 61157e6],
  ['revenue', 'annual', 'CY2025', '2026-01-25', 215938e6],
  ['gross_profit', 'annual', 'CY2025', '2026-01-25', 153463e6],
  ['revenue', 'annual', 'CY2024', '2025-01-26', 130497e6],
].map(([concept, period_type, frame, period_end, value]) => ({
  ticker: 'NVDA',
  entity_name: 'NVIDIA Corp',
  concept,
  period_type,
  frame,
  period_end,
  value,
}));

const POSITIONING = {
  ticker: 'NVDA',
  period: '2026-06-30',
  previous_period: '2026-03-31',
  filers_in_period: 1477,
  holders: 1059,
  shares: 5469498908,
  value_usd: 1094253658189,
  top10_share: 0.9468,
  top: [
    {
      filer: 'BlackRock, Inc. (BLK)',
      shares: 1941918386,
      value_usd: 388558449933,
      share_of_reported: 0.355,
    },
    {
      filer: 'VANGUARD CAPITAL MANAGEMENT LLC',
      shares: 1540816358,
      value_usd: 308301945072,
      share_of_reported: 0.282,
    },
  ],
  compared_filers: 58,
  added: 24,
  reduced: 16,
  new_positions: 0,
  exits: 0,
  adds: [
    {
      filer: 'Neuberger Berman Group LLC',
      shares: 30582784,
      change_shares: 1415407,
      status: 'added',
    },
  ],
  cuts: [
    {
      filer: 'OP Asset Management Ltd',
      shares: 3594248,
      change_shares: -1590023,
      status: 'reduced',
    },
  ],
};

async function memoEvidence() {
  const admin = fakeAdmin({
    tables: { sec_fundamentals: FUND },
    rpc: { sonar_13f_positioning: { data: POSITIONING, error: null } },
  });
  const fin = await companyFinancials({ ticker: 'NVDA', name: 'NVIDIA' }, { admin });
  const pos = await holderPositioning({ ticker: 'NVDA', name: 'NVIDIA' }, { admin });
  const raw = [
    ...fin.items.map((it) => toEvidence(it, { source: 'company_financials' })),
    ...pos.items.map((it) => toEvidence(it, { source: 'holder_positioning' })),
    toEvidence(
      {
        title: 'NVIDIA export controls',
        text: 'Reported by Reuters on 2026-10-30: NVIDIA guided to no data center compute revenue from China.',
        date: '2026-10-30',
      },
      { source: 'news' },
    ),
  ];
  const marked = withMarkers(raw.map((e) => ({ evidence: e, score: 1, why: [] })));
  const { metrics } = analyze(raw, {});
  return { fin, pos, marked, metrics };
}

test('the memo readers state every figure they hold, with its period', async () => {
  const { fin, pos, metrics } = await memoEvidence();
  const q = fin.items.find((it) => /quarter ended 2026-07-26/.test(it.title));
  assert.match(q.text, /revenue \$96\.22B/);
  assert.match(q.text, /gross margin 75\.0%/);
  assert.match(q.text, /up 17\.9% from \$81\.6\dB/);
  const fy = fin.items.find((it) => /fiscal year ended 2026-01-25/.test(it.title));
  assert.match(fy.text, /up 65\.5% from \$130\.50B/);
  assert.match(pos.items[0].text, /1,059 of the 1,477 institutional managers/);
  assert.match(pos.items[0].text, /94\.7%/);
  assert.match(pos.items[1].text, /Among the 58 managers that filed 13F reports for both/);
  const ids = metrics.map((m) => m.id);
  for (const id of [
    'revenue_latest_quarter',
    'gross_margin_latest_quarter',
    'revenue_growth_qoq',
    'revenue_growth_fy',
    'holders_top10_share',
  ]) {
    assert.ok(ids.includes(id), id);
  }

  /* Before the positioning function exists, the top holders still come back. */
  const fb = await holderPositioning(
    { ticker: 'NVDA' },
    {
      admin: fakeAdmin({
        rpc: {
          sonar_top_13f: {
            data: { period: '2026-06-30', top: [{ filer_name: 'BlackRock', value_usd: 3.9e11 }] },
            error: null,
          },
        },
      }),
    },
  );
  assert.match(fb.items[0].text, /BlackRock \$390\.00B/);

  const peers = await peerFinancials(
    { ticker: 'NVDA', peers: [{ ticker: 'AMD' }] },
    {
      admin: fakeAdmin({
        tables: {
          sec_fundamentals: [
            ...FUND,
            {
              ticker: 'AMD',
              entity_name: 'AMD',
              concept: 'revenue',
              period_type: 'quarter',
              frame: 'CY2026Q3',
              period_end: '2026-09-27',
              value: 9.2e9,
            },
          ],
        },
      }),
    },
  );
  assert.match(peers.items[0].text, /AMD quarter ended 2026-09-27 revenue \$9\.20B/);
});

test('the memo validator keeps cited claims and removes invented figures', async () => {
  const { marked, metrics } = await memoEvidence();
  const S = (re) => marked.find((e) => re.test(e.title)).marker;
  const q2 = S(/quarter ended 2026-07-26/);
  const pos = S(/Institutional positioning/);
  const news = S(/export controls/);
  const parsed = {
    centralQuestion: 'What could make NVIDIA growth disappoint over three years?',
    executiveConclusion: {
      text: 'NVIDIA reported revenue of $96.22B for the quarter ended 2026-07-26, with a gross margin of 75.0%.',
      classification: 'verified_fact',
      evidence: [q2],
    },
    risks: [
      {
        title: 'China and export controls',
        priority: 'high',
        question: 'How much growth is lost to export restrictions?',
        assessment: {
          text: 'NVIDIA guided to no data center compute revenue from China.',
          classification: 'verified_fact',
          evidence: [news],
        },
        evidence: [
          {
            text: 'Revenue was up 17.9% from the prior quarter.',
            classification: 'verified_fact',
            evidence: [q2],
          },
        ],
        implication: {
          text: 'This suggests the China market is excluded from near-term growth.',
          classification: 'analytical_interpretation',
          evidence: [news],
        },
        watch: ['A new export license for data center products', 'China revenue above 20% again'],
      },
      {
        title: 'Invented risk',
        priority: 'medium',
        question: 'n/a',
        assessment: {
          text: 'Customer concentration reached 61% of revenue.',
          classification: 'verified_fact',
          evidence: [q2],
        },
        evidence: [],
        implication: null,
        watch: [],
      },
    ],
    scenarios: [
      {
        case: 'bear',
        assumptions: ['Hyperscaler capital spending slows', 'Revenue CAGR of 10%'],
        outcome: { text: 'Revenue could fall to $60B.', classification: 'hypothesis' },
      },
      {
        case: 'base',
        assumptions: ['Spending normalizes'],
        outcome: { text: 'Growth slows as spending normalizes.', classification: 'hypothesis' },
      },
    ],
    chain: [
      {
        from: 'Hyperscaler capex',
        to: 'NVIDIA orders',
        mechanism: 'Fewer GPU purchases',
        evidence: [],
      },
      {
        from: 'Institutional crowding',
        to: 'Valuation',
        mechanism: 'Concentrated holders',
        evidence: [pos],
      },
    ],
    dataGaps: ['Customer concentration from the latest 10-Q'],
    confidence: 'medium',
  };
  const memo = validateMemo(parsed, { marked, metrics });
  assert.equal(memo.format, 'investment_memo');
  assert.ok(memo.executiveConclusion, 'cited conclusion kept');
  assert.equal(memo.risks.length, 1, 'the risk with an invented 61% is removed');
  assert.equal(memo.risks[0].rank, 1);
  assert.deepEqual(memo.risks[0].watch, ['A new export license for data center products']);
  const bear = memo.scenarios.find((s) => s.case === 'bear');
  assert.equal(bear.outcome, null, 'a forecast figure no record states is removed');
  assert.deepEqual(bear.assumptions, ['Hyperscaler capital spending slows']);
  assert.equal(memo.scenarios[0].case, 'base', 'bull, base, bear order');
  assert.equal(memo.chain[0].status, 'needs_evidence');
  assert.equal(memo.chain[1].status, 'supported');
  assert.equal(memo.keyFindings[0].title, 'China and export controls');
  assert.ok(memo.validation.stats.removed >= 2);
  assert.match(renderMemoBrief(memo), /1\. China and export controls/);
  assert.equal(
    unsupportedFigures(
      'margin stays near 75.0%',
      marked.flatMap((e) => e.numbers),
    ).length,
    0,
  );
});

test('without a written assessment the memo groups and quotes the records', async () => {
  const { marked, metrics } = await memoEvidence();
  const memo = deterministicMemo({ spec: { question: NVDA_Q }, marked, metrics });
  assert.equal(memo.deterministic, true);
  assert.deepEqual(
    memo.risks.map((r) => r.title),
    ['Financial performance', 'Institutional positioning'],
  );
  assert.ok(memo.risks.every((r) => r.evidence.every((e) => e.markers.length === 1)));
  assert.equal(memo.confidence, 'low');
});
