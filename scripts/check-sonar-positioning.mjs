/**
 * Deep research, strategic positioning (Nov 2026): "How is Microsoft
 * positioning itself to capture value from the AI infrastructure boom?
 * Connect its financial performance, government contracts, industry
 * exposure, and relevant lobbying activity."
 *   npm run test:sonar-positioning
 *
 * Figures marked "production" were read from Ezana's tables on 2026-11-05;
 * everything marked "fixture" is test data in the real shapes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { deepResearchSignal, isPositioningQuestion } = await import('@/lib/sonar/deep-research');
const { understandQuery } = await import('@/lib/sonar/understand');
const { buildResearchSpec } = await import('@/lib/sonar/engine/research-spec');
const { planResearch } = await import('@/lib/sonar/engine/planner');
const { toEvidence, withMarkers } = await import('@/lib/sonar/engine/evidence');
const { analyze } = await import('@/lib/sonar/engine/analysis');
const { segmentsWithGrowth } = await import('@/lib/sonar/engine/sources-memo');
const {
  buildCapexSeries,
  capexMonetization,
  buildHyperscalers,
  buildContracts,
  contractsProfile,
  lobbyingProfile,
  valueChain,
} = await import('@/lib/sonar/engine/sources-positioning');
const { cloudLine, hyperscalerPeers, contractYearComplete } =
  await import('@/lib/sonar/ai-infrastructure');
const { rollupLobbying } = await import('@/lib/sonar/lobbying-profile');
const { validateMemo, deterministicMemo, memoSystem, POSITIONING_SYSTEM, renderMemoBrief } =
  await import('@/lib/sonar/engine/investment-memo');
const { framePeriods, METRICS } = await import('@/lib/sec/xbrl');
const { findSections, DISCLOSURE_KIND_IDS } = await import('@/lib/disclosures/sections');

const MSFT_Q =
  'How is Microsoft positioning itself to capture value from the AI infrastructure boom? Connect its financial performance, government contracts, industry exposure, and relevant lobbying activity.';
const NVDA_Q =
  "What are the biggest risks to NVIDIA's growth over the next three years? Analyze its financial performance, institutional ownership, government contracts, industry exposure, and competitive landscape.";

const MSFT_RES = {
  subject: { kind: 'company', id: 'MSFT', label: 'Microsoft Corporation' },
  company: { ticker: 'MSFT', name: 'Microsoft Corporation' },
  universe: {
    label: 'Microsoft Corporation',
    tickers: ['MSFT'],
    names: { MSFT: 'Microsoft Corporation' },
  },
  peers: hyperscalerPeers('MSFT'),
  customers: [],
  countries: [],
};

function fakeAdmin({ tables = {}, rpc = {} } = {}) {
  const chain = (rows) => {
    const q = {};
    for (const m of ['select', 'in', 'eq', 'neq', 'gte', 'lte', 'order', 'contains', 'overlaps'])
      q[m] = () => q;
    q.limit = () => Promise.resolve({ data: rows, error: null });
    q.then = (r) => Promise.resolve({ data: rows, error: null }).then(r);
    return q;
  };
  return {
    from: (t) => chain(tables[t] || []),
    rpc: async (name) => rpc[name] || { data: null, error: { message: 'missing' } },
  };
}

const f = (concept, period_type, period_end, value, frame = null) => ({
  concept,
  period_type,
  period_end,
  value,
  frame,
});

/* Microsoft, production values from sec_fundamentals, plus fixture rows for
   the quarter ended 2025-09-30 and fiscal 2026 (not yet ingested). */
const MSFT_FUND = [
  f('revenue', 'annual', '2024-06-30', 245.12e9, 'CY2024'),
  f('operating_cash_flow', 'annual', '2024-06-30', 118.55e9, 'CY2024'),
  f('capex', 'annual', '2024-06-30', 44.48e9, 'CY2024'),
  f('revenue', 'annual', '2025-06-30', 281.72e9, 'CY2025'),
  f('operating_cash_flow', 'annual', '2025-06-30', 136.16e9, 'CY2025'),
  f('capex', 'annual', '2025-06-30', 64.55e9, 'CY2025'),
  f('revenue', 'quarter', '2025-12-31', 81.27e9, 'CY2025Q4'),
  f('operating_cash_flow', 'quarter', '2025-12-31', 35.76e9, 'CY2025Q4'),
  f('capex', 'quarter', '2025-12-31', 29.88e9, 'CY2025Q4'),
  f('revenue', 'quarter', '2026-03-31', 82.89e9, 'CY2026Q1'),
  f('operating_cash_flow', 'quarter', '2026-03-31', 46.68e9, 'CY2026Q1'),
  f('capex', 'quarter', '2026-03-31', 30.88e9, 'CY2026Q1'),
  f('revenue', 'quarter', '2026-09-30', 92.28e9, 'CY2026Q3'),
  f('operating_cash_flow', 'quarter', '2026-09-30', 58.0e9, 'CY2026Q3'),
  f('capex', 'quarter', '2026-09-30', 39.37e9, 'CY2026Q3'),
  /* fixture */
  f('revenue', 'quarter', '2025-09-30', 77.67e9, 'CY2025Q3'),
  f('operating_cash_flow', 'quarter', '2025-09-30', 45.06e9, 'CY2025Q3'),
  f('capex', 'quarter', '2025-09-30', 19.39e9, 'CY2025Q3'),
  f('revenue', 'annual', '2026-06-30', 330e9, 'CY2026'),
  f('operating_cash_flow', 'annual', '2026-06-30', 180e9, 'CY2026'),
  f('capex', 'annual', '2026-06-30', 120e9, 'CY2026'),
  f('rpo', 'instant', '2026-09-30', 400e9, 'CY2026Q3I'),
];

test('the Microsoft question is deep research, answered as a positioning assessment', async () => {
  const s = deepResearchSignal(MSFT_Q);
  assert.equal(s.deep, true);
  /* Since the research-mode classifier, the reason is a sentence. */
  assert.match(s.reasons[0], /asks how Microsoft captures value/);
  const ids = s.angles.map((a) => a.id);
  for (const a of ['financials', 'contracts', 'industry', 'lobbying'])
    assert.ok(ids.includes(a), a);
  assert.ok(!ids.includes('ownership'), '"positioning itself" is strategy, not 13F positioning');
  assert.ok(
    deepResearchSignal('Analyze NVIDIA institutional positioning and 13F holders').angles.some(
      (a) => a.id === 'ownership',
    ),
  );
  assert.equal(isPositioningQuestion(MSFT_Q), true);
  assert.equal(isPositioningQuestion(NVDA_Q), false);

  const u = await understandQuery(MSFT_Q, {});
  const spec = buildResearchSpec(u, { query: MSFT_Q, resolution: MSFT_RES, depth: 'deep' });
  assert.equal(spec.format, 'investment_memo');
  assert.equal(spec.memoKind, 'positioning');
  assert.equal(spec.objective.primary, 'assess_positioning');
  assert.ok(spec.reportComponents.includes('value_chain'));
  assert.equal(memoSystem(spec), POSITIONING_SYSTEM);

  const plan = planResearch(spec, MSFT_RES, { depth: 'deep' });
  const sources = plan.tasks.map((t) => t.source);
  for (const x of [
    'capex_monetization',
    'hyperscaler_capex',
    'contracts_profile',
    'lobbying_profile',
    'value_chain',
    'product_segments',
    'peer_financials',
  ])
    assert.ok(sources.includes(x), x);
  for (const x of ['contracts_history', 'lobbying_company', 'institutional_13f'])
    assert.ok(!sources.includes(x), `${x} is replaced in a memo`);
  const lob = plan.tasks.find((t) => t.source === 'lobbying_profile').params;
  assert.deepEqual(
    lob.peers.map((p) => p.ticker),
    ['AMZN', 'GOOGL', 'META', 'ORCL'],
  );

  const nv = buildResearchSpec(await understandQuery(NVDA_Q, {}), {
    query: NVDA_Q,
    resolution: { subject: { kind: 'company', id: 'NVDA', label: 'NVIDIA' } },
    depth: 'deep',
  });
  assert.equal(nv.memoKind, 'risk');
});

test('capital spending is set against cash generation, with year-over-year quarters', () => {
  const s = buildCapexSeries(MSFT_FUND);
  const fy25 = s.years.find((y) => y.periodEnd === '2025-06-30');
  assert.equal(Math.round(fy25.fcf / 1e7) / 100, 71.61);
  assert.equal(Number((fy25.capexToRevenue * 100).toFixed(1)), 22.9);
  assert.equal(Number((fy25.capexGrowth * 100).toFixed(1)), 45.1);
  const q = s.quarters[0];
  assert.equal(q.periodEnd, '2026-09-30');
  assert.equal(q.yearAgo, '2025-09-30');
  assert.equal(Number((q.revenueYoy * 100).toFixed(1)), 18.8);
  /* The fourth fiscal quarter is derived from the fiscal year (fixture). */
  const q4 = s.quarters.find((x) => x.periodEnd === '2026-06-30');
  assert.equal(q4.derived, true);
  assert.equal(Math.round(q4.revenue / 1e7) / 100, 88.17);
  assert.equal(s.rpo.value, 400e9);
});

test('the capex reader states its figures, and the metrics follow', async () => {
  const out = await capexMonetization(
    { ticker: 'MSFT', name: 'Microsoft' },
    { admin: fakeAdmin({ tables: { sec_fundamentals: MSFT_FUND } }) },
  );
  const yr = out.items[0].text;
  assert.match(
    yr,
    /fiscal year ended 2025-06-30: revenue \$281\.72B, operating cash flow \$136\.16B, capital expenditure \$64\.55B \(22\.9% of revenue\), free cash flow \$71\.61B; capital expenditure up 45\.1% on the prior year/,
  );
  assert.match(yr, /excludes assets acquired under finance leases/);
  assert.match(
    out.items[1].text,
    /quarter ended 2026-09-30: revenue \$92\.28B.*Against the quarter ended 2025-09-30: revenue up 18\.8%, capital expenditure up 103\.0%/,
  );
  assert.match(out.items[2].text, /remaining performance obligation of \$400\.00B at 2026-09-30/);
  const ev = out.items.map((it) => toEvidence(it, { source: 'capex_monetization' }));
  const ids = analyze(ev, {}).metrics.map((m) => m.id);
  for (const m of [
    'capex_to_revenue_fy',
    'fcf_fy',
    'capex_to_ocf_fy',
    'revenue_growth_yoy_q',
    'capex_growth_yoy_q',
  ])
    assert.ok(ids.includes(m), m);
  assert.equal(out.layout.capex.years[0].periodEnd, '2026-06-30');
});

test('segment growth and each segment share of the increase (fixture)', () => {
  const g = segmentsWithGrowth([
    { date: '2025-09-30', data: { Azure: 22.4e9, 'Microsoft 365 Cloud': 23.7e9, Search: 5.95e9 } },
    {
      date: '2026-09-30',
      data: { Azure: 33.17e9, 'Microsoft 365 Cloud': 27.78e9, Search: 6.55e9 },
    },
  ]);
  assert.equal(g.prevDate, '2025-09-30');
  const az = g.segments.find((s) => s.segment === 'Azure');
  assert.equal(Number((az.growth * 100).toFixed(1)), 48.1);
  assert.equal(Number((az.changeShare * 100).toFixed(1)), 69.7);
  /* A segment with no year-earlier value leaves the shares undefined. */
  const partial = segmentsWithGrowth([
    { date: '2025-09-30', data: { Azure: 22.4e9 } },
    { date: '2026-09-30', data: { Azure: 33.17e9, New: 1e9 } },
  ]);
  assert.equal(partial.totalChange, null);
});

test('hyperscalers: capital spending beside the reported cloud line, by fiscal year end', () => {
  assert.deepEqual(cloudLine('AMZN', { 'Online Stores': 2e11, 'Amazon Web Services': 1.1e11 }), {
    label: 'Amazon Web Services',
    value: 1.1e11,
  });
  assert.equal(cloudLine('META', { 'Family of Apps': 1e11 }), null);
  const list = buildHyperscalers(
    [
      {
        cik: '1018724',
        concept: 'capex',
        period_type: 'annual',
        period_end: '2025-12-31',
        value: 128e9,
      },
      {
        cik: '1326801',
        concept: 'capex',
        period_type: 'annual',
        period_end: '2025-12-31',
        value: 69.69e9,
      },
      {
        cik: '789019',
        concept: 'capex',
        period_type: 'annual',
        period_end: '2025-06-30',
        value: 64.55e9,
      },
    ],
    {
      AMZN: [
        { date: '2025-12-31', data: { 'Amazon Web Services': 128.7e9, 'Online Stores': 2.5e11 } },
      ],
      MSFT: [{ date: '2025-06-30', data: { 'Server Products and Cloud Services': 98.4e9 } }],
    },
  );
  const amzn = list.find((h) => h.ticker === 'AMZN');
  assert.equal(amzn.cloudLabel, 'Amazon Web Services');
  assert.equal(amzn.years[0].cloud, 128.7e9);
  assert.equal(list.find((h) => h.ticker === 'META').cloudLabel, null);
  assert.equal(list.find((h) => h.ticker === 'MSFT').years[0].cloud, 98.4e9);
});

/* Microsoft federal obligations by fiscal year, production totals. */
const MSFT_CONTRACTS = [
  [2021, 421.9e6, 715],
  [2022, 470.4e6, 536],
  [2023, 498.3e6, 527],
  [2024, 518.4e6, 640],
  [2025, 534.4e6, 645],
  [2026, 310.0e6, 280],
].flatMap(([fy, amt, n]) => [
  {
    fiscal_year: fy,
    awarding_agency: 'Department of Defense',
    award_count: n - 10,
    total_amount: amt * 0.98,
  },
  {
    fiscal_year: fy,
    awarding_agency: 'Department of Homeland Security',
    award_count: 10,
    total_amount: amt * 0.02,
  },
]);

test('contracts: an incomplete fiscal year is flagged, never read as a decline', async () => {
  const now = new Date('2026-11-05T00:00:00Z');
  assert.equal(contractYearComplete(2025, now), true);
  assert.equal(contractYearComplete(2026, now), false);
  assert.equal(contractYearComplete(2026, new Date('2027-01-02T00:00:00Z')), true);
  const k = buildContracts(MSFT_CONTRACTS, { now });
  assert.equal(k.lastComplete, 2025);
  assert.deepEqual(k.incomplete, [2026]);
  assert.equal(Number((k.growth * 100).toFixed(1)), 3.1);
  assert.equal(k.agencies[0].agency, 'Department of Defense');
  assert.equal(Number((k.agencies[0].share * 100).toFixed(1)), 98.0);

  const out = await contractsProfile(
    { ticker: 'MSFT', name: 'Microsoft' },
    {
      now,
      admin: fakeAdmin({
        tables: {
          company_contract_history: MSFT_CONTRACTS,
          company_contract_top_awards: [
            {
              generated_award_id: 'A1',
              recipient_name: 'MICROSOFT CORPORATION',
              awarding_agency: 'Department of Defense',
              award_amount: 56.6e6,
              action_date: '2023-09-22',
              fiscal_year: 2023,
            },
          ],
          company_contract_award_facts: [
            {
              generated_award_id: 'A1',
              piid: 'FIXTURE-1',
              total_obligation: 120e6,
              base_and_all_options: 480e6,
            },
          ],
        },
      }),
    },
  );
  const t = out.items[0].text;
  assert.match(
    t,
    /FY2025 \$534\.4M across 645 awards; FY2026 \$310\.0M across 280 awards \(incomplete\)/,
  );
  assert.match(t, /FY2025, the latest complete year, was up 3\.1% on FY2024/);
  assert.match(t, /not company revenue/);
  assert.match(out.items[1].text, /Department of Defense \$1\.52B \(98\.0%\)/);
  assert.match(
    out.items[2].text,
    /ceiling with all options \$480\.0M, which is a maximum, not money spent/,
  );
  const ids = analyze(
    out.items.map((it) => toEvidence(it, { source: 'contracts_profile' })),
    {},
  ).metrics.map((m) => m.id);
  assert.ok(ids.includes('contracts_top_agency_share'));
  assert.ok(ids.includes('contracts_growth_complete_fy'));
});

/* Lobbying, fixture rows in the production shape (Microsoft self-files). */
const L = (client, registrant, year, quarter, amount, issues, extra = {}) => ({
  client_name: client,
  registrant_name: registrant,
  filing_year: year,
  quarter,
  amount,
  issues: issues.map((display) => ({ display })),
  dt_posted: `${year}-${quarter === 'q1' ? '04' : quarter === 'q2' ? '07' : '10'}-20`,
  is_registration: false,
  ...extra,
});
const LOBBY = [
  L('MICROSOFT CORPORATION', 'MICROSOFT CORPORATION', 2025, 'q1', 2350000, [
    'Computer Industry',
    'Defense',
    'Trade (domestic/foreign)',
  ]),
  L('MICROSOFT CORPORATION', 'MICROSOFT CORPORATION', 2025, 'q2', 2000000, ['Computer Industry']),
  /* an amendment to Q2, posted later, replaces it */
  L(
    'MICROSOFT CORPORATION',
    'MICROSOFT CORPORATION',
    2025,
    'q2',
    2570000,
    ['Computer Industry', 'Environment/Superfund'],
    { dt_posted: '2025-09-01' },
  ),
  L('MICROSOFT CORPORATION', 'THE EXAMPLE GROUP', 2025, 'q2', 80000, [
    'Taxation/Internal Revenue Code',
  ]),
  L('MICROSOFT CORPORATION', 'MICROSOFT CORPORATION', 2026, 'q1', 2390000, ['Computer Industry'], {
    specific_issues: 'Issues related to data center permitting and electricity supply',
  }),
  L('AMAZON.COM SERVICES LLC', 'AMAZON.COM SERVICES LLC', 2025, 'q1', 5000000, [
    'Computer Industry',
  ]),
];

test('lobbying: amendments replace originals, a self-filer counts only its own reports', () => {
  const r = rollupLobbying(
    LOBBY.filter((x) => x.client_name.startsWith('MICROSOFT')),
    {
      from: 2021,
      to: 2026,
    },
  );
  assert.equal(r.selfFiled, true);
  assert.deepEqual(r.byYear, [
    { year: 2025, amount: 4920000 },
    { year: 2026, amount: 2390000 },
  ]);
  assert.equal(r.firms[0].firm, 'THE EXAMPLE GROUP');
  const energy = r.areas.find((a) => a.id === 'energy_power');
  assert.equal(energy.reports, 2);
  assert.equal(energy.textMatches, 1);
  assert.match(energy.sample, /data center permitting/);
});

test('the lobbying reader reports spend, areas and peers under one rule', async () => {
  const out = await lobbyingProfile(
    { ticker: 'MSFT', name: 'Microsoft', peers: [{ ticker: 'AMZN' }] },
    {
      now: new Date('2026-11-05T00:00:00Z'),
      admin: fakeAdmin({
        tables: {
          lobbying_client_tickers: [
            { client_name: 'MICROSOFT CORPORATION', ticker: 'MSFT' },
            { client_name: 'AMAZON.COM SERVICES LLC', ticker: 'AMZN' },
          ],
          lobbying_filings: LOBBY,
        },
      }),
    },
  );
  assert.match(
    out.items[0].text,
    /2025 \$4\.9M; 2026 \$2\.4M \(3 quarterly reports filed by the company itself/,
  );
  assert.match(out.items[0].text, /2026 covers the quarters reported so far/);
  assert.match(
    out.items[1].text,
    /An issue code shows that a report touched an area, not the position taken/,
  );
  assert.match(out.items[2].text, /AMZN \$5\.0M; MSFT \$4\.9M/);
  assert.equal(out.layout.lobbyingProfile.peers[0].ticker, 'AMZN');
});

test('the value chain marks where Microsoft operates, with its silicon sourced', async () => {
  const out = await valueChain(
    { ticker: 'MSFT', name: 'Microsoft' },
    {
      admin: fakeAdmin({
        tables: {
          competitive_products: [
            {
              product: 'Maia 200',
              milestone_date: '2026-01-26',
              statement: 'Microsoft introduced Maia 200, an inference accelerator.',
              source_url: 'https://news.microsoft.com/x',
              source_title: 'Microsoft Source',
            },
          ],
        },
      }),
    },
  );
  assert.match(out.items[0].text, /has 8 layers\. Microsoft \(MSFT\) operates in 5 of them/);
  assert.match(out.items[0].text, /an analytical framework, not an exhaustive list/);
  const semis = out.layout.valueChain.layers.find((l) => l.id === 'semiconductors');
  assert.equal(semis.subject.source.title, 'Microsoft Source');
  assert.deepEqual((await valueChain({ ticker: 'XYZ' }, { admin: fakeAdmin() })).items, []);
});

test('the positioning memo validator keeps cited sections and drops invented figures', async () => {
  const fin = await capexMonetization(
    { ticker: 'MSFT', name: 'Microsoft' },
    { admin: fakeAdmin({ tables: { sec_fundamentals: MSFT_FUND } }) },
  );
  const raw = fin.items.map((it) => toEvidence(it, { source: 'capex_monetization' }));
  const marked = withMarkers(raw.map((e) => ({ evidence: e, score: 1, why: [] })));
  const { metrics } = analyze(raw, {});
  const m = marked[0].marker;
  const parsed = {
    centralQuestion: 'How does Microsoft capture value from the AI build?',
    executiveConclusion: {
      text: 'Microsoft spent $64.55B on capital expenditure in the fiscal year ended 2025-06-30.',
      classification: 'verified_fact',
      evidence: [m],
    },
    investmentQuestion: {
      text: 'Whether the spending earns attractive returns.',
      classification: 'analytical_interpretation',
      evidence: [m],
    },
    executiveView: [
      {
        text: 'Free cash flow was $71.61B in the fiscal year ended 2025-06-30.',
        classification: 'verified_fact',
        evidence: [m],
      },
      {
        text: 'Azure will reach $200B of revenue.',
        classification: 'verified_fact',
        evidence: [m],
      },
    ],
    sections: [
      {
        angle: 'infrastructure',
        title: 'Capital spending and monetization',
        findings: [
          {
            text: 'Capital expenditure was 22.9% of revenue.',
            classification: 'verified_fact',
            evidence: [m],
          },
        ],
        interpretation: {
          text: 'This suggests spending is rising faster than revenue.',
          classification: 'analytical_interpretation',
          evidence: [m],
        },
        cannotConclude: ['Capacity added versus capacity monetized', 'A 37% utilization rate'],
        dataRequests: ['Capacity by region'],
      },
      { angle: 'astrology', title: 'Not an angle', findings: [] },
    ],
    valueChain: [
      {
        layer: 'compute',
        assessment: {
          text: 'Azure sells compute.',
          classification: 'analytical_interpretation',
          evidence: [m],
        },
      },
      { layer: 'moon', assessment: { text: 'x', classification: 'verified_fact', evidence: [m] } },
    ],
    risks: [],
    dataGaps: ['Government revenue as a share of revenue'],
  };
  const memo = validateMemo(parsed, { marked, metrics, kind: 'positioning' });
  assert.equal(memo.memoKind, 'positioning');
  assert.equal(memo.executiveView.length, 1, 'the invented Azure figure is removed');
  assert.equal(memo.sections.length, 1);
  assert.deepEqual(memo.sections[0].cannotConclude, ['Capacity added versus capacity monetized']);
  assert.deepEqual(
    memo.valueChain.map((v) => v.layer),
    ['compute'],
  );
  assert.equal(memo.keyFindings[0].text, parsed.executiveView[0].text);
  assert.match(renderMemoBrief(memo), /- Free cash flow was \$71\.61B/);

  const det = deterministicMemo({
    spec: { question: 'q', memoKind: 'positioning' },
    marked,
    metrics,
  });
  assert.equal(det.memoKind, 'positioning');
  assert.equal(det.sections[0].angle, 'infrastructure');
  assert.equal(det.risks.length, 0);
});

test('fundamentals: depreciation and RPO, this year’s annual frame, and a backfill window', () => {
  const by = Object.fromEntries(METRICS.map((x) => [x.key, x]));
  assert.ok(by.depreciation.concepts.includes('us-gaap:DepreciationDepletionAndAmortization'));
  assert.equal(by.rpo.instant, true);
  const now = new Date('2026-11-05T00:00:00Z');
  assert.ok(framePeriods(now, { currentYear: true }).durations.includes('CY2026'));
  assert.ok(!framePeriods(now, { currentYear: true }).instants.includes('CY2026Q4I'));
  const b = framePeriods(now, { years: 6, quarters: 12, currentYear: true });
  assert.equal(b.durations[0], 'CY2020');
  assert.ok(b.durations.includes('CY2025Q3') && b.durations.includes('CY2023Q4'));
  assert.equal(b.durations.filter((d) => /Q\d$/.test(d)).length, 12);
});

test('filings are read for cloud metrics and infrastructure commitments (fixture text)', () => {
  assert.ok(DISCLOSURE_KIND_IDS.includes('cloud_ai_metrics'));
  const text = [
    'Revenue increased $14.6 billion or 19% driven by growth across each of our segments.',
    'Azure and other cloud services revenue grew 40% driven by growth in our infrastructure business.',
    'As of September 30, 2026, we have additional operating and finance leases, primarily for data centers, that have not yet commenced of $100.0 billion.',
  ].join('\n');
  const all = findSections(text);
  assert.ok(all.some((x) => x.kind === 'cloud_ai_metrics' && /Azure/.test(x.text)));
  assert.ok(
    all.some((x) => x.kind === 'infrastructure_commitments' && /not yet commenced/.test(x.text)),
  );
  const only = findSections(text, { kinds: ['infrastructure_commitments'] });
  assert.deepEqual([...new Set(only.map((x) => x.kind))], ['infrastructure_commitments']);
});
