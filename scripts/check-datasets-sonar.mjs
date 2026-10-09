/**
 * Datasets index (Sonar floor): the pure derivations and the console's pinned
 * query. Run directly:
 *   node --test scripts/check-datasets-sonar.mjs   (npm run test:datasets-sonar)
 *
 * Self-contained node:test file per docs/decisions/004-node-test-check-scripts.md.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { register } from 'node:module';

register('./ezanaql-node-loader.mjs', import.meta.url);

const { DATASET_TAXONOMY, TAXONOMY_STATS } = await import('../src/lib/datasets/taxonomy.js');
const { hubHref } = await import('../src/lib/datasets/hubs.js');
const D = await import('../src/app/datasets/sonar/derive.js');
const W = await import('../src/app/datasets/sonar/worked-example.js');
const { parse } = await import('../src/lib/ezanaql/parser.js');
const { validate } = await import('../src/lib/ezanaql/validator.js');
const { CATALOG, dimensionHasQueryableData } = await import('../src/lib/ezanaql/catalog.js');

const DIMS = D.deriveDimensions(DATASET_TAXONOMY, hubHref);

test('dimensions come from the taxonomy, in order, live and roadmap split', () => {
  assert.deepEqual(
    DIMS.map((d) => d.id),
    DATASET_TAXONOMY.map((d) => d.id),
  );
  for (const [i, d] of DIMS.entries()) {
    const src = DATASET_TAXONOMY[i];
    assert.equal(d.live.length + d.road.length, src.items.length, d.id);
    assert.equal(d.liveCount, src.items.filter((it) => it.live === true).length, d.id);
    assert.equal(d.hubHref, hubHref(d.id));
    assert.equal(d.color, src.color, 'colour is the taxonomy token');
  }
});

test('counts are derived and match TAXONOMY_STATS', () => {
  const c = D.taxonomyCounts(DATASET_TAXONOMY);
  assert.equal(c.live, TAXONOMY_STATS.live);
  assert.equal(c.roadmap, TAXONOMY_STATS.roadmap);
  assert.equal(c.dimensions, DATASET_TAXONOMY.length);
});

test('no dash reaches the page from taxonomy text', () => {
  for (const d of DIMS) {
    const strings = [
      d.blurb,
      d.tagline,
      ...d.sources,
      ...d.live.flatMap((x) => [x.description, x.source]),
      ...d.road.flatMap((x) => [x.description, x.source]),
    ];
    for (const s of strings) assert.ok(!/[\u2013\u2014]/.test(s), `${d.id}: ${s}`);
  }
  assert.equal(D.plain('$15K–$50K'), '$15K to $50K');
  assert.equal(D.plain('Macro context \u2014 global'), 'Macro context, global');
});

test('honest blurbs exist only while their contradiction does', () => {
  for (const [id, o] of Object.entries(D.HONEST_BLURBS)) {
    const dim = DIMS.find((d) => d.id === id);
    assert.ok(dim, id);
    /* When this fails, the dimension's live state changed: re-read its
       taxonomy blurb and remove (or rewrite) the override. */
    assert.equal(dim.liveCount, o.whenLive, `${id} override is stale`);
    assert.equal(dim.blurb, o.text);
  }
  for (const d of DIMS) {
    if (!d.isLive) assert.ok(!/\btoday\b/i.test(d.blurb), `${d.id} claims "today" while roadmap`);
  }
});

test('radarLayout: taxonomy order, angles from 12 degrees, live inside, roadmap on the rim', () => {
  const blips = D.radarLayout(DATASET_TAXONOMY, 'capitol');
  assert.equal(blips.length, DATASET_TAXONOMY.length);
  const step = 360 / DATASET_TAXONOMY.length;
  for (const [i, b] of blips.entries()) {
    assert.equal(b.id, DATASET_TAXONOMY[i].id);
    assert.ok(Math.abs(b.angleDeg - (i * step + 12)) < 0.1);
    if (b.live) {
      assert.ok(b.radius < D.RADAR.roadRadius);
      assert.equal(b.dots.length, 2, 'live spokes carry two record dots');
    } else {
      assert.equal(b.radius, D.RADAR.roadRadius);
      assert.equal(b.dots.length, 0, 'roadmap spokes carry no dots');
    }
    assert.ok(b.x >= 0 && b.x <= D.RADAR.width && b.y >= 0 && b.y <= D.RADAR.height);
    assert.ok(b.labelPos.y >= 0 && b.labelPos.y <= D.RADAR.height - 10, `${b.id} label inside`);
  }
  assert.equal(blips.filter((b) => b.selected).length, 1);
  assert.equal(D.radarLayout(DATASET_TAXONOMY, null).filter((b) => b.selected).length, 0);
});

test('resolveDimension falls back to capitol for anything unknown', () => {
  assert.equal(D.resolveDimension(DATASET_TAXONOMY, 'eyes'), 'eyes');
  assert.equal(D.resolveDimension(DATASET_TAXONOMY, ['titans', 'eyes']), 'titans');
  assert.equal(D.resolveDimension(DATASET_TAXONOMY, 'nope'), 'capitol');
  assert.equal(D.resolveDimension(DATASET_TAXONOMY, undefined), 'capitol');
});

test('rollup: shared reads counted once, any failure leaves records unknown, no future dates', () => {
  const ok = D.rollup(
    ['Fund Holdings Data', 'SEC EDGAR', 'Insider Trading'],
    {
      'Fund Holdings Data': { records: 100, freshest: '2026-10-01' },
      'SEC EDGAR': { records: 100, freshest: '2026-10-01' },
      'Insider Trading': { records: 5, freshest: '2027-01-01' },
    },
    '2026-10-08',
  );
  assert.equal(ok.records, 105);
  assert.equal(ok.freshest, '2026-10-01');
  const bad = D.rollup(['A', 'B'], { A: { records: 3 }, B: { error: true } }, '2026-10-08');
  assert.equal(bad.records, null);
  assert.equal(bad.failed, true);
});

test('interleaveArrivals: round robin, capped, empty sources omitted', () => {
  const { items, omitted } = D.interleaveArrivals(
    [
      { name: 'a', items: [1, 2, 3, 4, 5, 6] },
      { name: 'b', items: [] },
      { name: 'c', items: [10, 20] },
    ],
    4,
  );
  assert.deepEqual(items, [1, 10, 2, 20, 3, 4]);
  assert.deepEqual(omitted, ['b']);
});

test('formatters', () => {
  assert.equal(D.shortDay('2026-10-07', new Date('2026-10-08T00:00:00Z')), 'OCT 7');
  assert.equal(D.shortDay('2025-12-31', new Date('2026-10-08T00:00:00Z')), 'DEC 31 2025');
  assert.equal(D.shortDay(null), null);
  assert.equal(D.compactCount(7_600_000), '7.6M');
  assert.equal(D.compactCount(213_341), '213K');
  assert.equal(D.compactCount(3895), '3,895');
  assert.equal(D.compactUsd(1_240_000_000), '$1.24B');
  assert.equal(D.compactUsd(860_000_000), '$860M');
  const now = Date.parse('2026-10-08T12:00:00Z');
  assert.equal(D.relativeAge('2026-10-08', now), 'TODAY');
  assert.equal(D.relativeAge('2026-10-06', now), '2D AGO');
  assert.equal(D.relativeAge('2026-10-08T10:00:00Z', now), '2H AGO');
  assert.equal(D.relativeAge(null, now), null);
});

test('the worked example parses, validates in its dimension and joins two datasets', () => {
  const ast = parse(W.WORKED_EXAMPLE.query);
  const { dataset, joined } = validate(ast, { dimension: W.WORKED_EXAMPLE.dimension });
  assert.equal(dataset.name, 'capitol.congress_trades');
  assert.equal(joined?.name, 'gov.contracts');
  assert.deepEqual(W.joinedDatasets({ dataset: dataset.name, joined: joined.name }), [
    'Politician Tracker',
    'Government Contracts',
  ]);
});

test('every chip names a live, queryable dimension', () => {
  for (const c of W.TRY_CHIPS) {
    const dim = DIMS.find((d) => d.id === c.dimension);
    assert.ok(dim?.isLive, `${c.label}: ${c.dimension} is not live`);
    assert.ok(dimensionHasQueryableData(c.dimension), `${c.label}: nothing queryable`);
  }
});

test('JOINS chips map catalog datasets to real taxonomy datasets', () => {
  const labels = new Set(DATASET_TAXONOMY.flatMap((d) => d.items.map((it) => it.label)));
  for (const [name, label] of Object.entries(W.CATALOG_TO_DATASET)) {
    assert.ok(CATALOG[name], `${name} is not in the catalog`);
    assert.ok(labels.has(label), `${label} is not a taxonomy dataset`);
  }
});

test('the page source holds no em dash, hex colour or lucide import', () => {
  const dir = new URL('../src/app/datasets/sonar/', import.meta.url).pathname;
  const files = [
    ...readdirSync(dir).map((f) => join(dir, f)),
    new URL('../src/app/datasets/page.js', import.meta.url).pathname,
  ];
  for (const f of files) {
    const s = readFileSync(f, 'utf8');
    assert.ok(!s.includes('\u2014'), `${f}: em dash`);
    assert.ok(!/lucide-react/.test(s), `${f}: lucide`);
    if (f.endsWith('.css')) assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(s), `${f}: hex colour`);
  }
});
