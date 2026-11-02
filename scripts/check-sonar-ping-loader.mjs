/**
 * Sonar ping loader, "Pulse" (Nov 2): the progress never claims more than
 * the request has done, and the entity label is a short, honest guess.
 *   npm run test:sonar-ping-loader
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const { sweepView, STEP_MS } = await import('@/lib/sonar/ping-progress');
const { pingEntityLabel } = await import('@/lib/sonar/ping-entity');
const { DATASET_TAXONOMY } = await import('@/lib/datasets/taxonomy');

const DIMS = DATASET_TAXONOMY.map((d) => ({ id: d.id, name: d.label }));

test('the dimensions come from the taxonomy, in order', () => {
  assert.deepEqual(
    DIMS.map((d) => d.name),
    [
      'Capitol Watch',
      'Titans Shadow',
      'Eyes Above',
      'Consumer Whispers',
      'The Hive',
      'Global Empire Lighthouse',
      'Regulatory Winds',
    ],
  );
  assert.equal(STEP_MS, 2100);
});

test('a sweep walks the names and never reaches 7/7 before the answer', () => {
  const first = sweepView(DIMS, 0, 'sweeping');
  assert.equal(first.status, 'Capitol Watch');
  assert.deepEqual(first.dots.slice(0, 2), ['sweeping', 'queued']);
  assert.equal(first.done, 0);
  const third = sweepView(DIMS, 2, 'sweeping');
  assert.equal(third.status, 'Eyes Above');
  assert.equal(third.done, 2);
  for (const step of [6, 7, 8, 40]) {
    const v = sweepView(DIMS, step, 'sweeping');
    assert.ok(v.done < DIMS.length, `step ${step}: never all done`);
    assert.equal(v.dots.filter((d) => d === 'done').length, DIMS.length - 1);
    assert.equal(v.dots.at(-1), 'sweeping');
  }
  assert.equal(sweepView(DIMS, 7, 'sweeping').status, 'Writing your briefing');
  assert.equal(sweepView(DIMS, 6, 'sweeping').status, 'Regulatory Winds');
});

test('ready is the only 7/7; error shows the error line', () => {
  const ready = sweepView(DIMS, 3, 'ready');
  assert.equal(ready.done, 7);
  assert.equal(ready.status, 'Briefing ready');
  assert.ok(ready.dots.every((d) => d === 'done'));
  const err = sweepView(DIMS, 3, 'error');
  assert.equal(err.status, 'Sonar couldn’t finish this ping');
  assert.equal(err.done, 0);
});

test('fewer dimensions: the dot count follows', () => {
  const two = DIMS.slice(0, 2);
  assert.equal(sweepView(two, 0, 'sweeping').dots.length, 2);
  assert.equal(sweepView(two, 5, 'sweeping').done, 1);
});

test('entity label: ticker, known brand, country, then the subject', () => {
  assert.equal(pingEntityLabel('$nvda earnings'), 'NVDA');
  assert.equal(pingEntityLabel('what is NVDA doing'), 'NVDA');
  assert.equal(pingEntityLabel('semiconductor industry in the USA'), 'United States');
  assert.equal(pingEntityLabel('can you give me details on the spacex ipo'), 'SpaceX');
  assert.equal(
    pingEntityLabel('tell me more about the top performing commodities since the iran war began'),
    'Iran',
  );
  assert.equal(pingEntityLabel('brazilian economy outlook for the next 4 years'), 'Brazil');
  assert.equal(pingEntityLabel('Nancy Pelosi'), 'Nancy Pelosi');
  assert.ok(pingEntityLabel('critical minerals supply chains and export controls').length <= 28);
  assert.equal(pingEntityLabel('   '), '');
});

test('the old rail loader is gone and the new one has no hex', () => {
  assert.ok(!existsSync('src/components/sonar/SonarRailLoader.jsx'));
  assert.ok(!existsSync('src/components/sonar/sonar-rail-loader.css'));
  for (const f of [
    'src/components/sonar/SonarPingLoader.jsx',
    'src/components/sonar/sonar-ping-loader.css',
    'src/app/datasets/datasets-loading.css',
  ]) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src), `${f}: hex`);
    assert.ok(!src.includes('—'), `${f}: em dash`);
  }
});
