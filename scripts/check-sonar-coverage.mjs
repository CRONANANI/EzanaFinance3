/**
 * Generated Sonar coverage matrix (sonar-ezanaql-coverage-prompt.md Step 9):
 * proves every EzanaQL-reachable cluster renders. Enumerates from the derived
 * catalog — every live dataset × its entity kinds × its group-by kinds, every
 * shared-key pair, and 200 seeded random 3-5 dataset combos over valid
 * key-sharing sets — builds each cluster from generated fixtures (clearly
 * fake values), runs the pipeline with the LLM mocked out (the deterministic
 * brief), and asserts the four outputs: cited brief, a match card per
 * dataset, at least one chart, a news query. Follow-up chips must be valid
 * EzanaQL. COVERAGE_REPORT=1 also writes docs/sonar/coverage-report.md.
 *
 * Run: npm run test:sonar-coverage (node --import scripts/register-sonar-loader.mjs).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const { DATASET_DEFS, LIVE_DATASETS, sharedKeyPairs, entityKindsOf } =
  await import('../src/lib/sonar/catalog.js');
const { fromRows, signature } = await import('../src/lib/sonar/cluster.js');
const { runSonarCluster } = await import('../src/lib/sonar/pipeline.js');
const { buildNewsQuery } = await import('../src/lib/sonar/news.js');
const { linkRules } = await import('../src/lib/sonar/links.js');
const { suggestAstFollowups } = await import('../src/lib/sonar/ezanaql-followups.js');
const { parse } = await import('../src/lib/ezanaql/parser.js');
const { validate } = await import('../src/lib/ezanaql/validator.js');

/* ── fixtures: 20 clearly fake rows per dataset, typed from the catalog ── */

const FAKE_STRINGS = ['Alpha Test Co', 'Beta Sample Inc', 'Gamma Example LLC', 'Delta Mock Corp'];
const FAKE_TICKERS = ['AAAT', 'BBBT', 'CCCT', 'DDDT'];

function fixtureRows(datasetId, n = 20) {
  const def = DATASET_DEFS[datasetId];
  const rows = [];
  for (let i = 0; i < n; i += 1) {
    const row = {};
    for (const [field, kind] of Object.entries(def.dims)) {
      if (kind === 'time') {
        row[field] = `2026-0${(i % 9) + 1}-1${i % 9}`;
      } else if (kind === 'numeric') {
        row[field] = (i + 1) * 1000;
      } else if (/ticker|cusip/.test(field)) {
        row[field] = FAKE_TICKERS[i % FAKE_TICKERS.length];
      } else if (/_id|cik/.test(field)) {
        row[field] = `FAKE${(i % 4) + 1}`;
      } else {
        row[field] = `${FAKE_STRINGS[i % FAKE_STRINGS.length]} ${field}`.slice(0, 40);
      }
    }
    rows.push(row);
  }
  return rows;
}

function buildCluster(datasetIds, { groupKind = null, timed = false } = {}) {
  const rowsByDataset = Object.fromEntries(datasetIds.map((d) => [d, fixtureRows(d)]));
  const def = DATASET_DEFS[datasetIds[0]];
  const gbEntry = groupKind
    ? Object.entries(def.dims).find(([, kind]) => kind === groupKind)
    : null;
  return fromRows(rowsByDataset, {
    groupBy: gbEntry ? { dim: gbEntry[0], kind: groupKind } : null,
    timeWindow: timed ? { from: '2026-01-01', to: '2026-09-30' } : null,
    query: `coverage:${datasetIds.join('+')}`,
  });
}

const NEWS_STUB = { query: null, items: [{ title: 'Fixture headline', url: null }] };

async function runCase(cluster) {
  return runSonarCluster(cluster, {
    compose: null, // the LLM is mocked out: the deterministic fallback runs
    newsOverride: { ...NEWS_STUB, query: buildNewsQuery(cluster) },
  });
}

function assertRendered(out, cluster, label) {
  assert.ok(out.headline && out.headline.length > 0, `${label}: empty headline`);
  assert.ok(out.brief.length >= 1, `${label}: empty brief`);
  const cited = [out.headline, ...out.brief.map((s) => s.text)].join(' ');
  assert.ok(/\[S\d+\]/.test(cited), `${label}: brief carries no [S#] citation`);
  for (const d of cluster.datasets) {
    const m = out.matches.find((x) => x.id === d);
    assert.ok(m && m.status === 'ok' && m.card && m.count > 0, `${label}: no match card for ${d}`);
  }
  assert.ok(out.charts.length >= 1, `${label}: no chart chosen`);
  for (const k of out.kpis) {
    assert.ok(k.label && k.fmt !== undefined, `${label}: malformed KPI`);
  }
  assert.ok(
    out.newsQuery && (out.newsQuery.must.length || out.newsQuery.any.length),
    `${label}: empty news query`,
  );
}

/* ── enumerate the matrix ────────────────────────────────────────────── */

const singles = [];
for (const d of LIVE_DATASETS) {
  const def = DATASET_DEFS[d];
  const groupKinds = [...new Set(Object.values(def.dims))];
  for (const gk of groupKinds) {
    singles.push({ datasets: [d], groupKind: gk === 'time' ? null : gk, timed: gk === 'time' });
  }
}
const pairs = sharedKeyPairs().map(({ pair }) => ({ datasets: pair }));

/* 200 random 3-5 combos over valid key-sharing sets, fixed seed. */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261023);
const adjacency = new Map(LIVE_DATASETS.map((d) => [d, new Set()]));
for (const { pair } of sharedKeyPairs()) {
  adjacency.get(pair[0]).add(pair[1]);
  adjacency.get(pair[1]).add(pair[0]);
}
const combos = [];
let guard = 0;
while (combos.length < 200 && guard < 5000) {
  guard += 1;
  const size = 3 + Math.floor(rand() * 3);
  const start = LIVE_DATASETS[Math.floor(rand() * LIVE_DATASETS.length)];
  const set = [start];
  while (set.length < size) {
    const frontier = [...new Set(set.flatMap((d) => [...(adjacency.get(d) || [])]))].filter(
      (d) => !set.includes(d),
    );
    if (!frontier.length) break;
    set.push(frontier[Math.floor(rand() * frontier.length)]);
  }
  if (set.length >= 3) combos.push({ datasets: set.sort() });
}

/* ── the tests ───────────────────────────────────────────────────────── */

const seenSignatures = new Set();

test(`singles: ${singles.length} dataset × group-by cases render`, async () => {
  for (const c of singles) {
    const cluster = buildCluster(c.datasets, c);
    seenSignatures.add(signature(cluster));
    assertRendered(await runCase(cluster), cluster, signature(cluster));
  }
});

test(`pairs: ${pairs.length} shared-key pairs render`, async () => {
  for (const c of pairs) {
    const cluster = buildCluster(c.datasets);
    seenSignatures.add(signature(cluster));
    assertRendered(await runCase(cluster), cluster, signature(cluster));
  }
});

test('200 seeded 3-5 dataset combos render', async () => {
  assert.ok(combos.length === 200, `only ${combos.length} valid combos sampled`);
  for (const c of combos) {
    const cluster = buildCluster(c.datasets);
    seenSignatures.add(signature(cluster));
    assertRendered(await runCase(cluster), cluster, signature(cluster));
  }
});

test('follow-up chips are valid EzanaQL for every live dataset', () => {
  for (const d of LIVE_DATASETS) {
    const cluster = buildCluster([d]);
    const chips = suggestAstFollowups(cluster);
    assert.ok(chips.length >= 1, `${d}: no executable follow-up generated`);
    for (const chip of chips) {
      assert.doesNotThrow(
        () => validate(parse(chip.query), {}),
        `${d}: invalid chip ${chip.query}`,
      );
    }
  }
});

test('every shared-key pair has a link rule; report written when asked', () => {
  const rules = linkRules();
  const have = new Set(rules.map((r) => [...r.pair].sort().join('|')));
  const missing = sharedKeyPairs().filter(({ pair }) => !have.has([...pair].sort().join('|')));
  assert.equal(missing.length, 0, `pairs without a link rule: ${JSON.stringify(missing)}`);

  if (process.env.COVERAGE_REPORT) {
    const curated = rules.filter((r) => r.ratios?.length).length;
    const lines = [
      '# Sonar × EzanaQL coverage report',
      '',
      `Generated by scripts/check-sonar-coverage.mjs (seed 20261023) on ${new Date().toISOString().slice(0, 10)}.`,
      '',
      `- Live datasets: ${LIVE_DATASETS.length}`,
      `- Single-dataset cases (dataset × group-by kind): ${singles.length}`,
      `- Shared-key pairs: ${pairs.length} (all carry a link rule; ${curated} with computed ratios)`,
      `- Seeded 3-5 dataset combos: ${combos.length}`,
      `- Distinct signatures exercised: ${seenSignatures.size}`,
      '',
      'Every case rendered all four outputs with the LLM mocked to the',
      'deterministic brief: a cited brief, a match card per dataset, at least',
      'one chart, and a non-empty news query. Follow-up chips validated',
      'against the real EzanaQL parser for every live dataset.',
      '',
      '## Entity kinds per dataset',
      '',
      ...LIVE_DATASETS.map((d) => `- ${d}: ${entityKindsOf(d).join(', ') || 'none'}`),
      '',
    ];
    writeFileSync('docs/sonar/coverage-report.md', lines.join('\n'));
  }
});
