/**
 * Regression tests for the EzanaQL seed + few-shot queries. Run directly:
 *   node scripts/check-ezanaql-generate.mjs   (wired as `npm run test:ezanaql`)
 *
 * The EzanaQL validator only accepts CATALOG field names (e.g. award_value,
 * which columnMap binds to the raw award_amount column). These tests pin the
 * builder's pre-seeded queries and the generator's few-shot examples to the
 * catalog, so raw-column drift (the "Unknown field award_amount" bug) fails
 * CI instead of shipping. Self-contained node:test file per
 * docs/decisions/004-node-test-check-scripts.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

// src/lib/ezanaql uses extensionless relative imports (webpack-style); the
// hook retries them with `.js` so Node can load the UNTOUCHED module. It must
// be registered before the ezanaql modules load, hence the dynamic imports.
register('./ezanaql-node-loader.mjs', import.meta.url);

const { parse } = await import('../src/lib/ezanaql/parser.js');
const { validate } = await import('../src/lib/ezanaql/validator.js');
const { SEED_QUERY, seedFromFilters } =
  await import('../src/app/datasets/government/contracts/ezanaql-seed.js');
const { SEEDS_BY_DATASET, seedForDataset } = await import('../src/lib/ezanaql/seeds.js');
const { FEW_SHOT_QUERIES, FEW_SHOTS_BY_DIMENSION, fewShotFor } =
  await import('../src/app/api/ezanaql/generate/few-shots.js');
const { CATALOG, CATALOG_VERSION, catalogSchemaForPrompt } =
  await import('../src/lib/ezanaql/catalog.js');

function assertValidates(query, label) {
  let ast;
  assert.doesNotThrow(() => {
    ast = parse(query);
  }, `${label} must parse`);
  assert.doesNotThrow(() => validate(ast), `${label} must validate against the catalog`);
}

// ── the builder's fallback seed ────────────────────────────────────────────

test('SEED_QUERY parses and validates against the catalog', () => {
  assertValidates(SEED_QUERY, 'SEED_QUERY');
});

test('seeds reference catalog fields, never raw DB columns', () => {
  assert.ok(!SEED_QUERY.includes('award_amount'), 'SEED_QUERY leaks raw column award_amount');
  assert.ok(SEED_QUERY.includes('award_value'));
});

// ── filter-derived seeds ───────────────────────────────────────────────────

test('seedFromFilters validates with no active filters', () => {
  assertValidates(seedFromFilters({ agencies: [], fiscalYear: 'all' }), 'no-filter seed');
});

test('seedFromFilters validates with one agency + fiscal year', () => {
  assertValidates(
    seedFromFilters({ agencies: ['Department of Defense'], fiscalYear: 2024 }),
    'single-agency seed',
  );
});

test('seedFromFilters validates with multiple agencies (IN clause)', () => {
  assertValidates(
    seedFromFilters({ agencies: ['NASA', 'Department of Energy'], fiscalYear: 'all' }),
    'multi-agency seed',
  );
});

test('seedFromFilters never emits raw DB columns', () => {
  const q = seedFromFilters({ agencies: ['NASA'], fiscalYear: 2023 });
  assert.ok(!q.includes('award_amount'), 'seedFromFilters leaks raw column award_amount');
});

// ── generator few-shots (what the model learns from) ──────────────────────

test('every few-shot example query validates against the catalog', () => {
  FEW_SHOT_QUERIES.forEach((q, i) => assertValidates(q, `few-shot #${i + 1}`));
});

test('each dimension prompt block embeds exactly its validated queries', () => {
  for (const [dimension, list] of Object.entries(FEW_SHOTS_BY_DIMENSION)) {
    const block = fewShotFor(dimension);
    for (const { query } of list) {
      assert.ok(block.includes(query), `${dimension} few-shot block drifted from its queries`);
    }
  }
});

/* A dataset marked available is a promise that the executor can run it AND
   that it has something to return. These pin the shape of that promise, so a
   half-finished binding fails here rather than at the first query a user
   writes. */
/* Every dataset carrying a `table` is checked, available or not: a binding
   held back only because its table is empty still has to be correct, or it
   will be wrong on the day someone flips it. */
test('every bound dataset is bound correctly', () => {
  for (const d of Object.values(CATALOG)) {
    if (!d.table) continue;
    assert.ok(d.columnMap, `${d.name} is bound to a table but has no columnMap`);
    for (const f of d.defaultProjection) {
      assert.ok(d.fields[f], `${d.name} projects ${f}, which is not a declared field`);
    }
    for (const [field, col] of Object.entries(d.columnMap)) {
      assert.ok(d.fields[field], `${d.name} maps ${field}, which is not a declared field`);
      /* A null column means derived, and a derived field must say how. */
      if (col === null) {
        assert.ok(
          d.derived && d.derived[field],
          `${d.name}.${field} has no column and no derivation`,
        );
      }
    }
    for (const [field, spec] of Object.entries(d.derived || {})) {
      assert.ok(d.fields[field], `${d.name} derives ${field}, which is not a declared field`);
      assert.ok(spec.kind, `${d.name}.${field} has no derivation kind`);
      assert.equal(
        d.columnMap[field] ?? null,
        null,
        `${d.name}.${field} is derived but also mapped to a column`,
      );
    }
  }
});

/* A bracket midpoint is an estimate. It may be sorted on; it may never sit in
   a default projection, where it would read as the amount. */
test('estimate fields are never in a default projection', () => {
  for (const d of Object.values(CATALOG)) {
    for (const [field, meta] of Object.entries(d.fields || {})) {
      if (!meta.estimate) continue;
      assert.ok(
        !d.defaultProjection.includes(field),
        `${d.name} projects the estimate ${field} by default`,
      );
    }
  }
});

test('the prompt schema lists live datasets and names the rest as not queryable', () => {
  const text = catalogSchemaForPrompt();
  const live = Object.values(CATALOG).filter((d) => d.available);
  const dark = Object.values(CATALOG).filter((d) => !d.available);
  assert.ok(live.length >= 4, 'expected at least the four live datasets');
  for (const d of live) assert.match(text, new RegExp(d.name.replace('.', '\\.')));
  assert.match(text, /Not yet queryable:/);
  for (const d of dark) {
    assert.ok(text.includes(d.name), `${d.name} should be named as not queryable`);
  }
  assert.equal(CATALOG_VERSION, '1.5.0');
  assert.match(text, /capitol\.congress_trades .*joinable with gov\.contracts ON ticker/);
});

/* Every page's query bar opens on one of these. A seed that does not validate
   hands someone a bar whose Run can only refuse, which is worse than no bar. */
test('every dataset seed validates against the catalog', () => {
  for (const [dataset, query] of Object.entries(SEEDS_BY_DATASET)) {
    assert.doesNotThrow(() => validate(parse(query)), `seed for ${dataset} must validate`);
  }
});

/* A seed is only offered for a dataset that can actually answer it. */
test('no seed targets an unavailable dataset', () => {
  for (const dataset of Object.keys(SEEDS_BY_DATASET)) {
    assert.equal(CATALOG[dataset]?.available, true, `${dataset} has a seed but is not live`);
  }
  // The fallback is the contracts seed, which must itself be live.
  assert.doesNotThrow(() => validate(parse(seedForDataset('does.not.exist'))));
});

// ── joins and relative dates (catalog 1.2) ────────────────────────────────

const { resolveRelDate } = await import('../src/lib/ezanaql/compiler.js');

test('SEMI JOIN and JOIN parse, validate and resolve joined fields', () => {
  const semi = parse(
    'FROM gov.contracts SEMI JOIN capitol.congress_trades ON ticker SELECT recipient, SUM(award_value) AS t GROUP BY recipient;',
  );
  const r = validate(semi);
  assert.equal(r.joined.name, 'capitol.congress_trades');
  assert.equal(semi.join.semi, true);

  const inner = parse(
    'FROM gov.contracts JOIN capitol.congress_trades ON ticker SELECT recipient, politician, congress_trades.party ORDER BY politician;',
  );
  validate(inner);
  /* A bare joined-only field is rewritten to its prefixed form, so the
     executor and the validator agree on one spelling. */
  assert.equal(inner.select[1].expr.name, 'congress_trades.politician');
  assert.equal(inner.select[2].expr.name, 'congress_trades.party');
  assert.equal(inner.orderBy[0].field, 'congress_trades.politician');
});

test('capitol.holdings validates, joins contracts, and is distinct from trades', () => {
  const q = parse(
    'FROM gov.contracts JOIN capitol.holdings ON ticker WHERE action_date >= LAST 5 YEARS SELECT ticker, parent, SUM(award_value) AS contracts, COUNT(DISTINCT holdings.politician) AS holders GROUP BY ticker, parent HAVING SUM(award_value) >= 100M ORDER BY holders DESC LIMIT 10;',
  );
  const r = validate(q);
  assert.equal(r.joined.name, 'capitol.holdings');
  assert.throws(
    () => validate(parse('FROM capitol.holdings JOIN capitol.congress_trades ON ticker;')),
    /not declared joinable/,
  );
});

test('join rejections name the rule', () => {
  const bad = [
    [
      'FROM gov.contracts SEMI JOIN capitol.congress_trades ON ticker SELECT politician;',
      /SEMI JOIN only filters/,
    ],
    ['FROM gov.contracts JOIN capitol.lobbying ON ticker;', /not declared joinable/],
    ['FROM gov.contracts JOIN capitol.congress_trades ON recipient;', /join ON "ticker"/],
    ['FROM gov.contracts JOIN gov.contracts ON ticker;', /cannot be joined to itself/],
    ['FROM gov.contracts JOIN house.trades ON ticker;', /not yet queryable/],
  ];
  for (const [q, re] of bad) assert.throws(() => validate(parse(q)), re, q);
});

test('LAST N DAYS|WEEKS|MONTHS|YEARS resolve by calendar', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const at = (q) =>
    resolveRelDate(parse(`FROM gov.contracts WHERE action_date >= ${q};`).where.right, now).value;
  assert.equal(at('LAST 30 DAYS'), '2026-09-03');
  assert.equal(at('LAST 2 WEEKS'), '2026-09-19');
  assert.equal(at('LAST 6 MONTHS'), '2026-04-03');
  assert.equal(at('LAST 5 YEARS'), '2021-10-03');
  assert.equal(at('LAST 1 YEAR'), '2025-10-03');
  assert.throws(
    () => parse('FROM gov.contracts WHERE action_date >= LAST 5;'),
    /DAYS, WEEKS, MONTHS or YEARS/,
  );
  assert.throws(
    () => parse('FROM gov.contracts WHERE action_date >= LAST 0 DAYS;'),
    /positive whole number/,
  );
});

// ── executor join semantics, over a tiny in-memory stand-in for PostgREST ──

const { execute } = await import('../src/lib/ezanaql/executor.js');

function fakeAdmin(tables, { rpc = true } = {}) {
  const calls = [];
  const from = (table) => {
    const preds = [];
    let lim = Infinity;
    const q = {
      select: () => q,
      limit: (n) => ((lim = n), q),
      eq: (c, v) => (preds.push((r) => r[c] === v), q),
      neq: (c, v) => (preds.push((r) => r[c] !== v), q),
      gt: (c, v) => (preds.push((r) => r[c] > v), q),
      gte: (c, v) => (preds.push((r) => r[c] >= v), q),
      lt: (c, v) => (preds.push((r) => r[c] < v), q),
      lte: (c, v) => (preds.push((r) => r[c] <= v), q),
      in: (c, vs) => (preds.push((r) => vs.includes(r[c])), q),
      not: (c, op, v) => (op === 'is' && v === null && preds.push((r) => r[c] != null), q),
      then: (ok) => {
        calls.push(table);
        ok({
          data: (tables[table] || []).filter((r) => preds.every((p) => p(r))).slice(0, lim),
          error: null,
        });
      },
    };
    return q;
  };
  return {
    calls,
    from,
    rpc: async (name, args) => {
      calls.push(`rpc:${name}`);
      if (!rpc) return { data: null, error: { message: 'missing' } };
      const have = new Set((tables[args.p_table] || []).map((r) => r[args.p_column]));
      return { data: args.p_keys.filter((k) => have.has(k)), error: null };
    },
  };
}

const TABLES = {
  contract_awards_resolved: [
    {
      recipient_name: 'LOCKHEED',
      awarding_agency: 'DoD',
      award_amount: 100,
      action_date: '2026-08-01',
      ticker: 'LMT',
    },
    {
      recipient_name: 'LOCKHEED',
      awarding_agency: 'DoD',
      award_amount: 50,
      action_date: '2026-08-02',
      ticker: 'LMT',
    },
    {
      recipient_name: 'NOBODY TRADES INC',
      awarding_agency: 'DoD',
      award_amount: 999,
      action_date: '2026-08-02',
      ticker: 'ZZZ',
    },
    {
      recipient_name: 'PRIVATE CO',
      awarding_agency: 'DoD',
      award_amount: 999,
      action_date: '2026-08-02',
      ticker: null,
    },
  ],
  congress_trades_enriched: [
    {
      member_name: 'A',
      bioguide_id: 'A1',
      chamber: 'house',
      party: 'D',
      state: 'CA',
      ticker: 'LMT',
      asset_name: 'Lockheed',
      type: 'purchase',
      transaction_date: '2026-07-01',
      disclosure_date: '2026-07-20',
      owner: null,
      amount_min: 1001,
      amount_max: 15000,
      amount_mid: 8000,
    },
    {
      member_name: 'B',
      bioguide_id: 'B1',
      chamber: 'senate',
      party: 'R',
      state: 'TX',
      ticker: 'LMT',
      asset_name: 'Lockheed',
      type: 'sale',
      transaction_date: '2026-07-02',
      disclosure_date: '2026-07-21',
      owner: null,
      amount_min: 1001,
      amount_max: 15000,
      amount_mid: 8000,
    },
    {
      member_name: 'A',
      bioguide_id: 'A1',
      chamber: 'house',
      party: 'D',
      state: 'CA',
      ticker: 'LMT',
      asset_name: 'Lockheed',
      type: 'purchase',
      transaction_date: '2026-07-03',
      disclosure_date: '2026-07-22',
      owner: null,
      amount_min: 1001,
      amount_max: 15000,
      amount_mid: 8000,
    },
    {
      member_name: 'C',
      bioguide_id: 'C1',
      chamber: 'house',
      party: 'D',
      state: 'NY',
      ticker: 'NVDA',
      asset_name: 'NVIDIA',
      type: 'purchase',
      transaction_date: '2026-07-03',
      disclosure_date: '2026-07-22',
      owner: null,
      amount_min: 1001,
      amount_max: 15000,
      amount_mid: 8000,
    },
  ],
};

async function run(q, admin) {
  const ast = parse(q);
  const { dataset, joined } = validate(ast);
  return execute({
    ast,
    dataset,
    joined,
    admin,
    userId: null,
    now: Date.parse('2026-10-03T00:00:00Z'),
  });
}

test('SEMI JOIN filters the FROM rows and never multiplies a sum', async () => {
  for (const rpc of [true, false]) {
    const admin = fakeAdmin(TABLES, { rpc });
    const out = await run(
      'FROM gov.contracts SEMI JOIN capitol.congress_trades ON ticker SELECT recipient, SUM(award_value) AS t GROUP BY recipient ORDER BY t DESC;',
      admin,
    );
    assert.deepEqual(out.rows, [{ recipient: 'LOCKHEED', t: 150 }], `rpc=${rpc}`);
    assert.deepEqual(out.notes, []);
    assert.ok(admin.calls.includes('rpc:ezanaql_matching_keys'));
    if (!rpc) assert.ok(admin.calls.filter((c) => c === 'congress_trades_enriched').length >= 1);
  }
});

test('JOIN pairs rows, and each aggregate sees its own side once', async () => {
  const admin = fakeAdmin(TABLES);
  const pairs = await run(
    'FROM gov.contracts JOIN capitol.congress_trades ON ticker SELECT recipient, politician, congress_trades.party, transaction_date ORDER BY transaction_date;',
    admin,
  );
  assert.equal(pairs.rowCount, 6); // 2 awards × 3 LMT trades
  assert.deepEqual(Object.keys(pairs.rows[0]), [
    'recipient',
    'congress_trades.politician',
    'congress_trades.party',
    'congress_trades.transaction_date',
  ]);

  /* The question that motivated this: a FROM-side sum and a joined-side
     distinct count in one query, both right. */
  const both = await run(
    'FROM gov.contracts JOIN capitol.congress_trades ON ticker SELECT recipient, SUM(award_value) AS t, COUNT(DISTINCT politician) AS members, COUNT(transaction_date) AS trades GROUP BY recipient;',
    admin,
  );
  assert.deepEqual(both.rows, [{ recipient: 'LOCKHEED', t: 150, members: 2, trades: 3 }]);
  assert.deepEqual(both.notes, []);

  /* HAVING over the FROM side sees the FROM rows once too. */
  const having = await run(
    'FROM gov.contracts JOIN capitol.congress_trades ON ticker SELECT recipient, COUNT(DISTINCT politician) AS members GROUP BY recipient HAVING SUM(award_value) >= 150;',
    admin,
  );
  assert.deepEqual(having.rows, [{ recipient: 'LOCKHEED', members: 2 }]);

  const members = await run(
    'FROM gov.contracts JOIN capitol.congress_trades ON ticker WHERE party = "D" SELECT recipient, COUNT(DISTINCT politician) AS members GROUP BY recipient;',
    admin,
  );
  assert.deepEqual(members.rows, [{ recipient: 'LOCKHEED', members: 1 }]);

  /* Bare COUNT() is the one aggregate that sees pairs, and says so. */
  const bare = await run(
    'FROM gov.contracts JOIN capitol.congress_trades ON ticker SELECT recipient, COUNT() AS pairs GROUP BY recipient;',
    admin,
  );
  assert.equal(bare.rows[0].pairs, 6);
  assert.match(bare.notes[0], /COUNT\(\) with no field counts matched pairs/);
});

test('joined-side filters are pushed to the joined fetch, not the FROM fetch', async () => {
  const admin = fakeAdmin(TABLES);
  const out = await run(
    'FROM capitol.congress_trades JOIN gov.contracts ON ticker WHERE transaction_type = "purchase" AND contracts.award_value >= 100 SELECT politician, contracts.award_value;',
    admin,
  );
  assert.equal(out.rowCount, 2); // A's two purchases × the one ≥100 award
  assert.ok(out.rows.every((r) => r.politician === 'A' && r['contracts.award_value'] === 100));
});

// ── contractor name keys: JS and SQL must agree ─────────────────────────────
// The SQL function is fixed text in the migration; this pins the JS to a
// corpus whose SQL output was checked against production once (md5 of the
// sorted keys of all 8,221 recipient names on 2026-10-03 matched). The
// cases below are the ones that decide the matching rules.

const { nameKey } = await import('../src/lib/contractors/name-key.js');

test('nameKey normalises the way contractor_name_key() does', () => {
  const cases = [
    ['FEDEX SUPPLY CHAIN DISTRIBUTION SYSTEM, INC.', 'FEDEX SUPPLY CHAIN DISTRIBUTION SYSTEM'],
    ['The Boeing Company', 'BOEING'],
    ['CACI, INC. - FEDERAL', 'CACI FEDERAL'],
    ['M. A. MORTENSON COMPANY', 'M MORTENSON'],
    ['BRASFIELD & GORRIE LLC', 'BRASFIELD GORRIE'],
    ['3M COMPANY', '3M'],
    ['Phillips 66 Company', 'PHILLIPS'],
    ['Booz Allen Hamilton Inc. Class A Common Stock', 'BOOZ ALLEN HAMILTON'],
    ['CSL Ltd ADR', 'CSL'],
    ['', ''],
    [null, ''],
  ];
  for (const [input, want] of cases) assert.equal(nameKey(input), want, JSON.stringify(input));
});

test('every seeded contractor key is already normalised, and private rows carry no ticker', async () => {
  const { readFileSync } = await import('node:fs');
  const data = JSON.parse(readFileSync(new URL('./data/contractor-tickers.json', import.meta.url)));
  assert.ok(data.exact.length > 3000);
  assert.ok(data.prefix.length > 300);
  for (const [k, ticker, , isPublic] of data.exact) {
    assert.equal(nameKey(k), k, `not normalised: ${k}`);
    if (!isPublic) assert.equal(ticker, null, `private row with ticker: ${k}`);
    else assert.match(ticker, /^[A-Z]{1,5}$/, `odd ticker for ${k}: ${ticker}`);
  }
  for (const [k, ticker] of data.prefix) {
    assert.equal(nameKey(k), k, `prefix not normalised: ${k}`);
    assert.match(ticker, /^[A-Z]{1,5}$/, `odd prefix ticker for ${k}: ${ticker}`);
  }
});

// ── column types and the date window, for the grid and the company card ──

test('results carry a display type per column and the query date window', async () => {
  const admin = fakeAdmin(TABLES);
  const out = await run(
    'FROM gov.contracts JOIN capitol.congress_trades ON ticker WHERE action_date >= LAST 5 YEARS SELECT ticker, recipient, SUM(award_value) AS t, COUNT(DISTINCT politician) AS members, AVG(award_value) AS avg, transaction_date GROUP BY ticker, recipient, transaction_date;',
    admin,
  );
  assert.deepEqual(out.columnTypes, ['string', 'string', 'money', 'int', 'money', 'date']);
  assert.deepEqual(out.window, { field: 'action_date', since: '2021-10-03' });

  const none = await run('FROM gov.contracts SELECT recipient, award_value LIMIT 1;', admin);
  assert.deepEqual(none.columnTypes, ['string', 'money']);
  assert.equal(none.window, null);
});

const { formatCell, columnAlign } = await import('../src/lib/ezanaql/grid-format.js');

test('grid cells format by type', () => {
  assert.equal(formatCell(1272663951.02, 'money'), '$1,272,663,951');
  assert.equal(formatCell(999.5, 'money'), '$999.50');
  assert.equal(formatCell(-2500, 'money'), '-$2,500');
  assert.equal(formatCell(16, 'int'), '16');
  assert.equal(formatCell(12345678, 'int'), '12,345,678');
  assert.equal(formatCell(3.14159, 'float'), '3.14');
  assert.equal(formatCell(1272663951.02, null), '1,272,663,951.02');
  assert.equal(formatCell('2026-10-30', 'date'), 'Oct 30, 2026');
  assert.equal(formatCell(true, 'bool'), 'Yes');
  assert.equal(formatCell(null, 'money'), '·');
  assert.equal(formatCell('LMT', 'string'), 'LMT');
  assert.equal(columnAlign('money', [], 'x'), 'right');
  assert.equal(columnAlign(null, [{ x: 1 }, { x: 2 }], 'x'), 'right');
  assert.equal(columnAlign(null, [{ x: 'a' }], 'x'), 'left');
});

const { layoutChart, rangeFor, niceTicks } = await import('../src/lib/contracts/company-chart.js');

test('company chart lays out markers on the nearest close and stacks collisions', () => {
  const candles = [];
  for (let i = 0; i < 400; i++) {
    const d = new Date(Date.UTC(2024, 0, 1) + i * 2 * 86400000);
    candles.push({ date: d.toISOString().slice(0, 10), close: 100 + i / 4 });
  }
  const L = layoutChart(
    candles,
    [
      { bioguide_id: 'A', date: '2024-03-10', amount: 8000 },
      { bioguide_id: 'A', date: '2024-03-10', amount: 8000 },
      { bioguide_id: 'B', date: '2024-03-12', amount: 32500 },
      { bioguide_id: 'C', date: '2025-06-01', amount: 8000 },
      { bioguide_id: 'D', date: '1999-01-01', amount: 1 }, // outside the series: dropped
    ],
    { A: { name: 'A' } },
  );
  assert.equal(L.ok, true);
  assert.equal(L.markers.length, 3);
  assert.deepEqual(
    L.markers.map((m) => [m.bioguide_id, m.buys, m.level]),
    [
      ['A', 2, 0],
      ['B', 1, 1],
      ['C', 1, 0],
    ],
  );
  assert.equal(L.markers[0].amount, 16000);
  assert.ok(L.markers[1].my < L.markers[0].my, 'stacked marker sits higher');
  assert.ok(L.markers[0].cy > L.markers[0].my, 'portrait sits above the line');
  assert.equal(layoutChart([], [], {}).ok, false);
  assert.deepEqual(niceTicks(283, 612).ticks, [200, 300, 400, 500, 600, 700]);
  const now = Date.parse('2026-10-03');
  assert.equal(rangeFor([{ date: '2015-12-29' }], now), 'ALL');
  assert.equal(rangeFor([{ date: '2024-02-13' }], now), '3Y');
  assert.equal(rangeFor([], now), '5Y');
});

test('MIN and MAX keep dates (the /datasets worked example: MAX(transaction_date))', async () => {
  const admin = fakeAdmin(TABLES);
  const out = await run(
    'FROM capitol.congress_trades JOIN gov.contracts ON ticker WHERE transaction_type = "purchase" AND awarding_agency = "DoD" SELECT politician, ticker, MIN(transaction_date) AS first_buy, MAX(transaction_date) AS last_buy, SUM(contracts.award_value) AS awards GROUP BY politician, ticker;',
    admin,
  );
  assert.ok(out.rows.length > 0);
  for (const r of out.rows) {
    assert.match(String(r.last_buy), /^\d{4}-\d{2}-\d{2}/, 'MAX of a date is a date, not null');
    assert.ok(String(r.first_buy) <= String(r.last_buy));
  }
  /* Numbers still compare as numbers. */
  const num = await run(
    'FROM gov.contracts SELECT recipient, MAX(award_value) AS top, MIN(award_value) AS low GROUP BY recipient;',
    admin,
  );
  const lmt = num.rows.find((r) => r.recipient === 'LOCKHEED');
  assert.equal(lmt.top, 100);
  assert.equal(lmt.low, 50);
});
