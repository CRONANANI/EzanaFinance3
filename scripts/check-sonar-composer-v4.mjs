// Research Composer 4.0 (Nov 23 2026): context-aware composition. The Pelosi / BlackRock
// benchmark runs end to end on an in-memory database seeded with real identifiers: BlackRock
// Inc.'s ten largest June 30, 2026 13F positions and Nancy Pelosi's estimated holdings with
// the CUSIPs the 13F book maps them to (read from production on Nov 23 2026).
//
// Run: npm run test:sonar-composer-v4
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { querySchema, portfolioGap, extractQuery } =
  await import('../src/lib/sonar/composer/schema.js');
const ctxLib = await import('../src/lib/sonar/composer/context.js');
const reg = await import('../src/lib/sonar/composer/registry.js');
const { buildContext, queryRelationOptions, reconcileTargets, planComposition, matchSecurities } =
  ctxLib;

const BLACKROCK_Q = `FROM titans.holdings_13f
WHERE filer LIKE "%BLACKROCK%"
SELECT ticker, issuer, cusip, value, shares, period
ORDER BY value DESC
LIMIT 10;`;
const PRIMARY = {
  text: 'Nancy Pelosi',
  kind: 'politician',
  id: 'P000197',
  name: 'Nancy Pelosi',
  eligible: 20,
};

const query = (over = {}) => ({
  key: 'query:br',
  kind: 'query',
  seq: 1,
  label: '10 largest holdings in BlackRock',
  query: BLACKROCK_Q,
  dimension: 'titans',
  schema: querySchema(BLACKROCK_Q, 'titans'),
  relation: 'intersect',
  matchLevel: 'security',
  ...over,
});
const fa = (over = {}) => ({
  ...reg.makeAnalysis('fundamental-analysis', { origin: 'user', subject: { ...PRIMARY } }),
  seq: 2,
  ...over,
});

/** Apply reconcile patches the way the hook does (count defaults reset on a kind change). */
function settle(items, primary = PRIMARY) {
  let list = items;
  for (let i = 0; i < 3; i += 1) {
    const ctx = buildContext({ question: 'Nancy Pelosi', primary, items: list });
    const patches = reconcileTargets(list, ctx);
    if (!Object.keys(patches).length) return { list, ctx };
    list = list.map((a) => {
      const next = patches[a.key];
      if (!next) return a;
      const params = { ...a.params };
      if ((a.target?.kind || 'subject') !== next.kind && !a.editedParams?.top_n)
        delete params.top_n;
      return reg.validateAttachment({ ...a, params, target: next });
    });
  }
  return { list, ctx: buildContext({ question: 'Nancy Pelosi', primary, items: list }) };
}

/* ── schemas ─────────────────────────────────────────────────────────── */

test('query schema: a BlackRock top-10 query returns securities with identifiers', () => {
  const s = querySchema(BLACKROCK_Q, 'titans');
  assert.equal(s.ok, true);
  assert.equal(s.shape, 'securities');
  assert.equal(s.semantics, 'reported_holdings');
  assert.deepEqual(s.identifiers, ['cusip', 'ticker']);
  assert.equal(s.limit, 10);
  assert.equal(s.entity.role, 'institution');
  assert.equal(portfolioGap(s), null);
});

test('query schema: aggregates and transactions cannot be intersected, with the reason', () => {
  const agg = querySchema(
    'FROM titans.holdings_13f\nSELECT SUM(value) AS total\nLIMIT 1;',
    'titans',
  );
  assert.equal(agg.shape, 'aggregate');
  assert.match(portfolioGap(agg), /aggregate figures/);
  const trades = querySchema(
    'FROM capitol.congress_trades\nSELECT politician, ticker, transaction_date\nLIMIT 20;',
    'capitol',
  );
  assert.equal(trades.shape, 'transactions');
  assert.match(portfolioGap(trades), /not a position/);
  const noId = querySchema('FROM titans.holdings_13f\nSELECT filer, value\nLIMIT 5;', 'titans');
  assert.match(portfolioGap(noId), /no ticker or CUSIP/);
});

test('extractQuery reads the EzanaQL out of an attachment text', () => {
  const t = `Question: top holdings\nEzanaQL: ${BLACKROCK_Q}\n`;
  assert.match(extractQuery(t), /^FROM titans\.holdings_13f/);
  assert.match(extractQuery(t), /LIMIT 10$/);
});

/* ── the benchmark, client side ──────────────────────────────────────── */

test('benchmark: the query relationship offers the intersection first, evidence second', () => {
  const ctx = buildContext({ question: 'Nancy Pelosi', primary: PRIMARY, items: [query()] });
  const { options, recommended } = queryRelationOptions(query(), ctx);
  assert.equal(recommended, 'intersect');
  assert.equal(options[0].key, 'intersect');
  assert.match(
    options[0].text,
    /Find the equities appearing in both Nancy Pelosi's estimated disclosed holdings and .*top 10 reported 13F holdings\./,
  );
  const keys = options.map((o) => o.key);
  assert.ok(keys.indexOf('compare') < keys.indexOf('evidence'));
  assert.ok(keys.includes('difference') && keys.includes('union') && keys.includes('limit'));
  /* Two subjects: Pelosi (primary) and the filer the query introduces (secondary). */
  assert.equal(ctx.subjects.length, 2);
  assert.equal(ctx.subjects[1].role, 'secondary');
});

test('benchmark: Fundamental Analysis added second targets the matching equities', () => {
  const { list, ctx } = settle([query(), fa()]);
  const a = list[1];
  assert.equal(ctx.items[0].kind, 'query', 'the query stays first');
  assert.equal(ctx.items[1].kind, 'analysis', 'the analysis is second');
  assert.equal(a.target.kind, 'set');
  assert.equal(a.target.id, 'set:query:br');
  assert.match(a.target.label, /^Matching equities: Nancy Pelosi ∩ /);
  assert.deepEqual(a.target.dependsOn, ['query:br']);
  assert.equal(a.relation, 'set-all');
  assert.equal(a.params.top_n, null, 'defaults to all matching companies, not ten');
  assert.match(
    reg.relationText(a),
    /^Analyse the financial fundamentals of the companies represented by the equities appearing in both Nancy Pelosi's estimated disclosed holdings and /,
  );
  assert.equal(a.status, 'supported');
  /* The subject stays the research subject; the set replaces it only as the analysed companies. */
  assert.equal(a.subject.name, 'Nancy Pelosi');
  const ops = reg.relationsFor(a).map((r) => r.key);
  assert.deepEqual(ops, ['set-all', 'set-strength', 'set-growth', 'set-risk']);
});

test('benchmark: the plan runs the intersection before the analysis', () => {
  const { ctx } = settle([query(), fa()]);
  const ids = planComposition(ctx).order.map((t) => t.id);
  assert.ok(ids.indexOf('subject:holdings') < ids.indexOf('set:query:br'));
  assert.ok(ids.indexOf('query:query:br') < ids.indexOf('set:query:br'));
  assert.ok(ids.indexOf('set:query:br') < ids.indexOf('analysis:fundamental-analysis'));
});

/* ── context reactivity ──────────────────────────────────────────────── */

test('changing the query relationship to compare marks the dependent analysis stale', () => {
  const first = settle([query(), fa()]).list;
  const { list } = settle([{ ...first[0], relation: 'compare' }, first[1]]);
  const a = list[1];
  assert.equal(a.target.stale, true);
  assert.equal(a.status, 'conditional');
  assert.match(a.issues[0].message, /no longer in this composition/);
  assert.equal(a.issues[0].retarget, 'out:query:br', 'suggests a valid replacement');
});

test('removing the upstream query marks the analysis for reconfiguration, not a silent retarget', () => {
  const first = settle([query(), fa()]).list;
  const { list } = settle([first[1]]);
  assert.equal(list[0].target.stale, true);
  assert.equal(list[0].status, 'conditional');
  assert.equal(list[0].issues[0].retarget, 'subject');
});

test('an explicit target is kept when a new set appears later', () => {
  const explicit = fa({ seq: 1, target: { id: 'subject', explicit: true } });
  const { list } = settle([explicit, query({ seq: 2 })]);
  assert.equal(list[0].target.id, 'subject');
  assert.equal(list[0].target.explicit, true);
  assert.notEqual(list[0].status, 'conditional');
});

test('a model added before its data source can still choose the later set', () => {
  const { list, ctx } = settle([fa({ seq: 1 }), query({ seq: 2 })]);
  const opts = ctxLib.analysisTargets(list[0], ctx).options.map((o) => o.id);
  assert.ok(opts.includes('set:query:br'));
});

test('top-N above the matching count is rejected with the count and a fix', () => {
  const { list } = settle([query(), fa()]);
  const a = reg.validateAttachment({
    ...list[1],
    target: { ...list[1].target, count: 4 },
    params: { ...list[1].params, top_n: 5 },
  });
  assert.equal(a.status, 'validation_error');
  assert.match(
    a.issues[0].message,
    /Only 4 matching eligible companies are available\. Choose 4 or fewer\./,
  );
  assert.equal(a.issues[0].fix, 4);
  assert.equal(a.issues[0].fixLabel, 'Use all 4');
});

test('Deep research counts user resources, never the derived set', () => {
  const { list } = settle([query(), fa()]);
  assert.equal(reg.deepQualification(list).count, 2);
  const dcf = reg.validateAttachment({
    ...reg.makeAnalysis('dcf-valuation', { origin: 'user', subject: { ...PRIMARY } }),
    seq: 3,
  });
  const three = settle([...list, dcf]).list;
  assert.equal(reg.deepQualification(three).qualifies, true);
});

/* ── matching methodology ────────────────────────────────────────────── */

const BR_TOP10 = [
  ['NVDA', '67066G104', 'NVIDIA CORPORATION', 389e9],
  ['AAPL', '037833100', 'APPLE INC', 337e9],
  ['MSFT', '594918104', 'MICROSOFT CORP', 227e9],
  ['AMZN', '023135106', 'AMAZON COM INC', 178e9],
  ['GOOGL', '02079K305', 'ALPHABET INC', 165e9],
  ['AVGO', '11135F101', 'BROADCOM INC', 150e9],
  ['GOOG', '02079K107', 'ALPHABET INC', 131e9],
  ['MU', '595112103', 'MICRON TECHNOLOGY INC', 121e9],
  ['META', '30303M102', 'META PLATFORMS INC', 98e9],
  ['TSLA', '88160R101', 'TESLA INC', 90e9],
];
const PELOSI = [
  ['AB', 'AllianceBernstein Holding l.P. units', 8250005, 0.158, '01881G106'],
  ['AVGO', 'Broadcom Inc. - Common Stock', 6000001, 0.1149, '11135F101'],
  ['NVDA', 'NVIDIA Corporation - Common Stock', 4675003, 0.0895, '67066G104'],
  ['INTC', 'Intel Corporation - Common Stock', 4125002, 0.079, '458140100'],
  ['PANW', 'Palo Alto Networks, Inc.', 3925002, 0.0752, '697435105'],
  ['BE', 'Bloom Energy Corporation Class A Common', 3750001, 0.0718, '093712107'],
  ['GOOGL', 'Alphabet Inc. - Class A', 3000001, 0.0575, '02079K305'],
  ['NFLX', 'Netflix, Inc.', 2800001, 0.0536, '64110L106'],
  ['MSFT', 'Microsoft Corporation', 2500003, 0.0479, '594918104'],
  ['AXP', 'American Express Company', 925002, 0.0177, '025816109'],
  ['SQ', 'Square, Inc. Class A', 40501, 0.0008, null],
  ['AAPL', 'Apple Inc.', 1001, 0, '037833100'],
  ['AMZN', 'Amazon.com, Inc. - Common Stock', 1001, 0, '023135106'],
];

test('security-level intersection: 6 exact matches; GOOG (class C) is not GOOGL', () => {
  const left = PELOSI.filter((p) => p[4]).map(([ticker, issuer, est, , cusip]) => ({
    ticker,
    issuer,
    est,
    cusip,
  }));
  const right = BR_TOP10.map(([ticker, cusip, issuer, value]) => ({
    ticker,
    cusip,
    issuer,
    value,
  }));
  const m = matchSecurities(left, right, { op: 'intersect', level: 'security' });
  assert.equal(m.overlap, 6);
  assert.deepEqual(m.rows.map((r) => r.right[0].ticker).sort(), [
    'AAPL',
    'AMZN',
    'AVGO',
    'GOOGL',
    'MSFT',
    'NVDA',
  ]);
  const issuer = matchSecurities(left, right, { op: 'intersect', level: 'issuer' });
  const alphabet = issuer.rows.find((r) => r.key === '02079K');
  assert.deepEqual(alphabet.right.map((r) => r.ticker).sort(), ['GOOG', 'GOOGL']);
  const diff = matchSecurities(left, right, { op: 'difference' });
  assert.deepEqual(diff.rows.map((r) => r.right[0].ticker).sort(), ['GOOG', 'META', 'MU', 'TSLA']);
});

test('rows without a CUSIP never match on a ticker alone; duplicates merge', () => {
  const m = matchSecurities(
    [
      { ticker: 'AAPL', cusip: null },
      { ticker: 'MSFT', cusip: '594918104' },
    ],
    [
      { ticker: 'AAPL', cusip: '037833100' },
      { ticker: 'MSFT', cusip: '594918104' },
      { ticker: 'MSFT', cusip: '594918104' },
    ],
  );
  assert.equal(m.overlap, 1);
  assert.equal(m.leftNoId, 1);
  assert.equal(m.rows[0].right.length, 2);
});

/* ── end to end on the server path ──────────────────────────────────── */

function mockAdmin(tables, rpcs) {
  const like = (v, p) =>
    new RegExp(
      `^${String(p)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/%/g, '.*')}$`,
      'i',
    ).test(String(v ?? ''));
  const from = (name) => {
    let rows = [...(tables[name] || [])];
    let lim = null;
    let single = false;
    const api = {
      select: () => api,
      eq: (c, v) => ((rows = rows.filter((r) => r[c] === v)), api),
      neq: (c, v) => ((rows = rows.filter((r) => r[c] !== v)), api),
      in: (c, vs) => ((rows = rows.filter((r) => vs.includes(r[c]))), api),
      ilike: (c, p) => ((rows = rows.filter((r) => like(r[c], p))), api),
      like: (c, p) => ((rows = rows.filter((r) => like(r[c], p))), api),
      gt: (c, v) => ((rows = rows.filter((r) => r[c] > v)), api),
      gte: (c, v) => ((rows = rows.filter((r) => r[c] >= v)), api),
      lt: (c, v) => ((rows = rows.filter((r) => r[c] < v)), api),
      lte: (c, v) => ((rows = rows.filter((r) => r[c] <= v)), api),
      not: (c, op, v) => (
        (rows = rows.filter((r) => (op === 'is' && v === null ? r[c] != null : true))),
        api
      ),
      order: (c, o = {}) => (
        (rows = rows.sort(
          (a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (o.ascending === false ? -1 : 1),
        )),
        api
      ),
      limit: (n) => ((lim = n), api),
      range: (a, b) => ((rows = rows.slice(a, b + 1)), api),
      maybeSingle: () => ((single = true), api),
      single: () => ((single = true), api),
      then: (res) => {
        const out = lim != null ? rows.slice(0, lim) : rows;
        return Promise.resolve(res({ data: single ? out[0] || null : out, error: null }));
      },
    };
    return api;
  };
  return { from, rpc: async (n, args) => ({ data: rpcs[n]?.(args) ?? null, error: null }) };
}

const PERIOD = '2026-06-30';
const positions = [
  ...BR_TOP10.map(([ticker, cusip, issuer, value]) => ({
    cik: '0002012383',
    period: PERIOD,
    ticker,
    cusip,
    issuer,
    value_usd: value,
    shares: 1,
    put_call: '',
  })),
  ...PELOSI.filter((p) => p[4]).map(([ticker, issuer, , , cusip]) => ({
    cik: '0000000001',
    period: PERIOD,
    ticker,
    cusip,
    issuer,
    value_usd: 1,
    shares: 1,
    put_call: '',
  })),
];
const ezq = BR_TOP10.map(([ticker, cusip, issuer, value]) => ({
  accession_no: 'x',
  filer_cik: '0002012383',
  filer_name: 'BlackRock, Inc.',
  form_type: '13F-HR',
  period_of_report: PERIOD,
  filed_at: '2026-08-14',
  issuer,
  cusip,
  ticker,
  value_usd: value,
  shares: 1,
  share_type: 'SH',
  put_call: null,
  is_current: true,
  is_latest: true,
}));
const fundamentals = ['NVDA', 'AAPL'].flatMap((t) =>
  [
    ['revenue', 'annual', '2026-01-31', 200e9],
    ['revenue', 'annual', '2025-01-31', 130e9],
    ['gross_profit', 'annual', '2026-01-31', 150e9],
    ['operating_income', 'annual', '2026-01-31', 120e9],
    ['net_income', 'annual', '2026-01-31', 100e9],
    ['operating_cash_flow', 'annual', '2026-01-31', 90e9],
    ['capex', 'annual', '2026-01-31', 5e9],
    ['equity', 'instant', '2026-01-31', 120e9],
    ['long_term_debt', 'instant', '2026-01-31', 8e9],
  ].map(([concept, period_type, period_end, value]) => ({
    ticker: t,
    concept,
    period_type,
    period_end,
    value,
  })),
);
const admin = mockAdmin(
  {
    congress_members: [
      {
        bioguide_id: 'P000197',
        full_name: 'Nancy Pelosi',
        first_name: 'Nancy',
        last_name: 'Pelosi',
        party: 'D',
        chamber: 'House',
        state: 'CA',
        in_office: true,
      },
    ],
    congress_trades: [{ bioguide_id: 'P000197', disclosure_date: '2026-10-07' }],
    titans_13f_filers: [
      { cik: '0002012383', filer_name: 'BlackRock, Inc.', period: PERIOD, positions: 10, book: 1 },
    ],
    titans_13f_positions: positions,
    ezq_13f_holdings: ezq,
    sec_fundamentals: fundamentals,
  },
  {
    politician_portfolio: () => ({
      holdings: PELOSI.map(([ticker, company, est, share]) => ({ ticker, company, est, share })),
    }),
  },
);

test('end to end: the intersection runs first and the analysis covers exactly its companies', async () => {
  const { runResearchComposition, compositionText } =
    await import('../src/lib/sonar/composer/execute.js');
  const att = fa();
  const { results, plan } = await runResearchComposition(
    {
      question: 'Nancy Pelosi',
      primary: { text: 'Nancy Pelosi' },
      attachments: [
        {
          key: 'query:br',
          kind: 'query',
          seq: 1,
          label: '10 largest holdings in BlackRock',
          query: BLACKROCK_Q,
          dimension: 'titans',
          relation: 'intersect',
          matchLevel: 'security',
        },
        { ...att, seq: 2, target: null },
      ],
      userId: 'u1',
    },
    admin,
  );
  const ids = plan.map((t) => t.id);
  assert.ok(ids.indexOf('set:query:br') < ids.indexOf('analysis:fundamental-analysis'));
  const set = results.find((r) => r.key === 'query:br');
  assert.equal(set.status, 'done', set.failed);
  assert.equal(set.stats.overlap, 6);
  assert.match(set.text, /6 matching securities/);
  assert.match(set.text, /latest available reported or estimated holdings/);
  assert.match(set.text, /could not be mapped to a CUSIP \(SQ\)/);
  const fund = results.find((r) => r.capability === 'fundamental-analysis');
  assert.equal(fund.status, 'done', fund.failed);
  assert.equal(fund.table.length, 6, 'all six matching companies, not ten');
  assert.deepEqual(fund.table.map((t) => t.ticker).sort(), [
    'AAPL',
    'AMZN',
    'AVGO',
    'GOOGL',
    'MSFT',
    'NVDA',
  ]);
  assert.equal(
    fund.coverage.withData,
    2,
    'only companies with filed figures are reported as covered',
  );
  assert.match(fund.relation, /companies represented by the equities appearing in both/);
  const text = compositionText(results);
  assert.match(text, /Matching equities/);
  assert.match(text, /Fundamental Analysis/);
});

test('end to end: an empty intersection is reported and nothing downstream is invented', async () => {
  const { runResearchComposition } = await import('../src/lib/sonar/composer/execute.js');
  const q = BLACKROCK_Q.replace('LIMIT 10', 'LIMIT 10').replace(
    'ORDER BY value DESC',
    'WHERE ticker = "TSLA"\nORDER BY value DESC',
  );
  const onlyTsla = `FROM titans.holdings_13f
WHERE filer LIKE "%BLACKROCK%" AND ticker = "TSLA"
SELECT ticker, issuer, cusip, value
ORDER BY value DESC
LIMIT 10;`;
  assert.ok(q);
  const { results } = await runResearchComposition(
    {
      question: 'Nancy Pelosi',
      primary: { text: 'Nancy Pelosi' },
      attachments: [
        {
          key: 'query:t',
          kind: 'query',
          seq: 1,
          label: 'BlackRock Tesla',
          query: onlyTsla,
          dimension: 'titans',
          relation: 'intersect',
        },
        { ...fa(), seq: 2, target: null },
      ],
      userId: 'u1',
    },
    admin,
  );
  const set = results.find((r) => r.key === 'query:t');
  assert.equal(set.stats.overlap, 0);
  assert.match(set.text, /No equities appear in both datasets/);
  const fund = results.find((r) => r.capability === 'fundamental-analysis');
  assert.equal(fund.status, 'skipped');
  assert.match(fund.text, /is empty, so there were no companies to analyse/);
});

test('end to end: a stale explicit target is not run against another subject', async () => {
  const { runResearchComposition } = await import('../src/lib/sonar/composer/execute.js');
  const { results } = await runResearchComposition(
    {
      question: 'Nancy Pelosi',
      primary: { text: 'Nancy Pelosi' },
      attachments: [
        { ...fa(), seq: 2, target: { id: 'set:query:gone', explicit: false, stale: true } },
      ],
      userId: 'u1',
    },
    admin,
  );
  const fund = results.find((r) => r.capability === 'fundamental-analysis');
  assert.equal(fund.status, 'conditional');
});

/* Sonar 5.0 (Nov 24 2026): the server reads the question itself. Reproduces the production
   run that returned "Its target set was not computed": the query arrived as supporting
   evidence (or with no relationship) and the subject did not resolve on the client. */
test('end to end: the server derives the overlap whatever the client sent', async () => {
  const { runResearchComposition } = await import('../src/lib/sonar/composer/execute.js');
  const LQ =
    'can you do fundamental analysis on the shares that both nancy pelosi has and blackrock also has in its top 10 positions by weight?';
  const brQuery = (relation) => ({
    key: 'query:br',
    kind: 'query',
    seq: 1,
    label: 'top 10 positions in blackrocks portfolio by weight',
    query: BLACKROCK_Q,
    dimension: 'titans',
    relation,
    matchLevel: 'security',
  });
  const cases = [
    ['Nancy Pelosi', { text: 'Nancy Pelosi' }, [brQuery('evidence')]],
    ['Nancy Pelosi', { text: 'Nancy Pelosi' }, [brQuery(undefined)]],
    [LQ, null, [brQuery('evidence')]],
    [LQ, { text: 'both nancy pelosi' }, [brQuery('evidence')]],
    [LQ, null, []],
  ];
  for (const [question, primary, queries] of cases) {
    const out = await runResearchComposition(
      {
        question,
        primary,
        attachments: [...queries, { ...fa(), origin: 'manual', seq: 2, target: null }],
        userId: 'u1',
      },
      admin,
    );
    const label = `${question.slice(0, 24)} / ${queries[0]?.relation ?? 'auto query'}`;
    assert.equal(out.subject?.name, 'Nancy Pelosi', label);
    const set = out.results.find((r) => r.op === 'intersect');
    assert.ok(set, `${label}: an intersection ran`);
    assert.equal(set.stats.overlap, 6, label);
    const fund = out.results.find((r) => r.capability === 'fundamental-analysis');
    assert.equal(fund.status, 'done', `${label}: ${fund.failed}`);
    assert.equal(fund.table.length, 6, label);
  }
});

test('end to end: a relationship the reader chose explicitly is kept', async () => {
  const { runResearchComposition } = await import('../src/lib/sonar/composer/execute.js');
  const out = await runResearchComposition(
    {
      question: 'Nancy Pelosi',
      primary: { text: 'Nancy Pelosi' },
      attachments: [
        {
          key: 'query:br',
          kind: 'query',
          seq: 1,
          label: 'BlackRock',
          query: BLACKROCK_Q,
          dimension: 'titans',
          relation: 'evidence',
          relationExplicit: true,
        },
      ],
      userId: 'u1',
    },
    admin,
  );
  assert.ok(!out.results.some((r) => r.op));
});
