/**
 * Sonar research loading state (Nov 2026, Claude Design handoff).
 *   npm run test:sonar-loading
 *
 * The ping screen's cube and seven dimensions: honest progress (nothing is
 * Complete before the answer arrives, statuses only move forward, pacing
 * follows the ping's estimate), the completion hand-off, the dimensions and
 * colours from the taxonomy, tokens only, and the wiring into
 * SonarExperience.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const P = await import('@/components/sonar/loading/useSonarProgress.js');
const D = await import('@/components/sonar/loading/dimensions.js');
const { DATASET_TAXONOMY } = await import('@/lib/datasets/taxonomy.js');

const rank = (s) => D.STATUSES.indexOf(s);

test('the seven dimensions, names and colours come from the taxonomy, in its order', () => {
  assert.equal(D.DIMENSIONS.length, 7);
  assert.deepEqual(
    D.DIMENSIONS.map((d) => d.key),
    DATASET_TAXONOMY.slice(0, 7).map((d) => d.id),
  );
  assert.deepEqual(
    D.DIMENSIONS.map((d) => d.name),
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
  const theme = fs.readFileSync('src/app/theme-variables.css', 'utf8');
  for (const d of D.DIMENSIONS) {
    assert.match(d.colorVar, /^--[a-z-]+$/);
    assert.match(theme, new RegExp(`${d.colorVar}:`), `${d.colorVar} is a theme token`);
  }
  for (const t of [
    '--sonar-cube-shell',
    '--sonar-cube-core',
    '--sonar-cube-spark',
    '--brand-ezana-green',
  ]) {
    assert.match(theme, new RegExp(`${t}:`));
  }
  assert.deepEqual([...D.FOCUS_ORDER].sort(), [0, 1, 2, 3, 4, 5, 6]);
});

test('without the answer, nothing is ever Complete, however long the ping runs', () => {
  for (const t of [0, 1000, 5000, 20000, 60000, 600000]) {
    const v = P.progressAt(t);
    for (const d of v.dimensions) {
      assert.notEqual(d.status, 'complete', `${d.key} at ${t}`);
      assert.ok(d.progress < 0.93);
    }
    assert.ok(v.focus >= 0 && v.focus <= 6);
  }
  const late = P.progressAt(600000);
  assert.ok(late.dimensions.every((d) => d.status === 'synthesizing'));
});

test('statuses only move forward', () => {
  let prev = P.progressAt(0).dimensions.map((d) => rank(d.status));
  for (let t = 250; t <= 90000; t += 250) {
    const cur = P.progressAt(t, { pace: 0.6 }).dimensions.map((d) => rank(d.status));
    cur.forEach((r, i) => assert.ok(r >= prev[i], `dimension ${i} went back at ${t}`));
    prev = cur;
  }
});

test('pacing follows the ping estimate', () => {
  assert.equal(P.paceFor(null), 1);
  assert.equal(P.paceFor({ maxSec: 12 }), 0.5);
  assert.equal(P.paceFor({ maxSec: 600 }), 3);
  assert.equal(P.paceFor({ maxSec: 2 }), 0.4);
  /* A quick ping (estimate up to 12 s) reaches the later stages sooner. */
  assert.equal(P.simulatedStage(8000, 0.5), 2);
  assert.equal(P.simulatedStage(8000, 1), 1);
  const quick = P.progressAt(10000, { pace: 0.5 }).dimensions.map((d) => rank(d.status));
  const slow = P.progressAt(10000, { pace: 2 }).dimensions.map((d) => rank(d.status));
  quick.forEach((r, i) => assert.ok(r >= slow[i]));
});

test('the answer arriving flips the dimensions to Complete 80 ms apart, in focus order', () => {
  const at = (ms) => P.progressAt(30000, { sinceComplete: ms }).dimensions;
  assert.deepEqual(
    at(0)
      .filter((d) => d.status === 'complete')
      .map((d) => d.index),
    [0],
  );
  assert.deepEqual(
    at(P.COMPLETE_STAGGER_MS)
      .filter((d) => d.status === 'complete')
      .map((d) => d.index)
      .sort(),
    [0, 3],
  );
  assert.ok(at(6 * P.COMPLETE_STAGGER_MS).every((d) => d.status === 'complete'));
  assert.equal(P.progressAt(30000, { sinceComplete: 1000 }).focus, -1);
  assert.equal(P.progressAt(1000, { sinceComplete: 0 }).stage, 3);
});

test('hand-off phases, and a quiet fade when no brief arrives', () => {
  assert.equal(P.phaseFor(-1), 'running');
  assert.equal(P.phaseFor(0), 'completing');
  assert.equal(P.phaseFor(P.COMPLETE_HOLD_MS), 'exiting');
  assert.equal(P.phaseFor(P.COMPLETE_HOLD_MS + P.EXIT_MS), 'done');
  assert.equal(P.phaseFor(-1, 0), 'exiting');
  assert.equal(P.phaseFor(-1, P.EXIT_MS), 'done');
});

test('real progress events win over the simulation', () => {
  const v = P.progressAt(1000, {
    events: {
      stage: 2,
      dimensions: { capitol: 'complete', hive: 'cross-checking', bogus: 'complete' },
    },
  });
  assert.equal(v.stage, 2);
  assert.equal(v.dimensions[0].status, 'complete');
  assert.equal(v.dimensions[4].status, 'cross-checking');
  assert.notEqual(v.focus, 0, 'a complete dimension is never focused');
});

test('the loading state follows the Ezana rules', () => {
  const dir = 'src/components/sonar/loading';
  for (const f of fs.readdirSync(dir)) {
    const src = fs.readFileSync(`${dir}/${f}`, 'utf8');
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b(?![\w-])/, `${f}: hex colour`);
    assert.ok(!src.includes(String.fromCharCode(8212)), `${f}: em dash`);
    assert.doesNotMatch(src, /rgba?\(\s*\d/, `${f}: literal colour`);
    assert.doesNotMatch(src, /lucide-react|tailwind/i, `${f}: Bootstrap Icons and page CSS only`);
  }
  const jsx = fs.readFileSync(`${dir}/SonarLoadingState.jsx`, 'utf8');
  assert.match(jsx, /sonar-loading force-dark-theme/);
  assert.match(jsx, /aria-busy=\{running\}/);
  assert.match(jsx, /className="sl-ticker" aria-live="polite"/);
  assert.match(jsx, /e\.key === 'Escape'/);
  const engine = fs.readFileSync(`${dir}/sonarCubeEngine.js`, 'utf8');
  assert.match(engine, /accentVar = '--brand-ezana-green'/);
  assert.match(engine, /console\.warn\('\[SonarCube\] Missing or invalid colour token'/);
});

test('SonarExperience shows it for a ping in flight and waits for the hand-off', () => {
  const src = fs.readFileSync('src/components/sonar/SonarExperience.jsx', 'utf8');
  assert.match(
    src,
    /import SonarLoadingState from '@\/components\/sonar\/loading\/SonarLoadingState';/,
  );
  assert.doesNotMatch(src, /SonarAnswerProgress/);
  assert.match(src, /isComplete=\{loader\.phase === 'ready'\}/);
  assert.match(src, /dismissed=\{loader\.leaving && loader\.phase === 'sweeping'\}/);
  assert.match(src, /onExited=\{clearLoader\}/);
  assert.match(src, /onCancel=\{cancelPing\}/);
  /* A failed ping keeps the Pulse loader's error state. */
  assert.match(src, /loader\.phase === 'error' \? \(\s*<SonarPingLoader/);
  assert.ok(!fs.existsSync('src/components/sonar/SonarAnswerProgress.jsx'));
});
