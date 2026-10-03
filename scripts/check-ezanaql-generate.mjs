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
const { FEW_SHOT_QUERIES, FEW_SHOT } = await import('../src/app/api/ezanaql/generate/few-shots.js');
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

test('few-shot prompt block embeds exactly the validated queries', () => {
  for (const q of FEW_SHOT_QUERIES) {
    assert.ok(FEW_SHOT.includes(q), 'FEW_SHOT prompt drifted from FEW_SHOT_QUERIES');
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
  assert.equal(CATALOG_VERSION, '1.2.0');
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
  usaspending_contract_awards: [
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

test('JOIN yields one row per pair, exposes prefixed fields, and flags a fanned-out SUM', async () => {
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

  const members = await run(
    'FROM gov.contracts JOIN capitol.congress_trades ON ticker WHERE party = "D" SELECT recipient, COUNT(DISTINCT politician) AS members GROUP BY recipient;',
    admin,
  );
  assert.deepEqual(members.rows, [{ recipient: 'LOCKHEED', members: 1 }]);

  const fanned = await run(
    'FROM gov.contracts JOIN capitol.congress_trades ON ticker SELECT recipient, SUM(award_value) AS t GROUP BY recipient;',
    admin,
  );
  assert.equal(fanned.rows[0].t, 450); // 150 × 3 trades, the trap
  assert.match(fanned.notes[0], /award_value is summed once per matching congress_trades row/);
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
