/**
 * Every new ping loads behind the same Sonar loading screen (Nov 2026): a ping typed in the
 * band, a ping that routes to standard research (the screen holds until the report lands),
 * Go deeper to standard, and a new question asked from a research answer's ping bar.
 *
 * Run: node --test scripts/check-sonar-ping-loading.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const host = read('src/components/sonar/SonarExperience.jsx');
const runs = read('src/components/sonar/DeepResearch.jsx');
const band = read('src/components/landing/SonarSection.jsx');
const bar = read('src/components/sonar/SonarRunPingBar.jsx');

test('a band ping still raises the loading screen at once', () => {
  assert.match(band, /if \(typeof onPing === 'function'\) onPing\(q\);/);
  assert.match(host, /setLoader\(\{ query, phase: 'sweeping', leaving: false \}\);/);
});

test('standard research holds the screen until the report lands', () => {
  assert.match(host, /function startStandard\(query/);
  assert.match(host, /hold: 'standard'/);
  assert.match(
    host,
    /l && l\.phase === 'sweeping' && !l\.hold \? \{ \.\.\.l, leaving: true \} : l/,
    'the routed ping does not fade a held screen',
  );
  assert.match(
    host,
    /* Nov 13: a follow-up's `extra` rides along. */
    /onStandardResearch=\{\(query, \{ classification, goDeeper: hint(, extra)? \} = \{\}\) =>\s*startStandard\(/,
  );
  assert.match(
    host,
    /if \(status === 'done'\) \{\s*setLoader\(\(l\) => \(l\?\.hold === 'standard' \? \{ \.\.\.l, phase: 'ready', leaving: false \} : l\)\)/,
  );
  assert.match(
    host,
    /status === 'error' \|\| status === 'gated' \|\| status === 'quota'/,
    'the run can show its own error, gate or quota',
  );
  assert.match(host, /onStatus=\{onStandardStatus\}/);
  assert.match(runs, /onStatusRef\.current\?\.\(state\.status\)/);
  /* Go deeper and "standard instead" load the same way. */
  assert.match(host, /if \(hint\?\.to === 'standard'\) \{\s*startStandard\(query\);/);
  assert.match(host, /function standardInstead\(query\) \{\s*startStandard\(query\);/);
  /* A new run of the same question restarts (key), and Cancel ends the held run. */
  assert.match(host, /key=\{standardRun\.nonce \|\| standardRun\.query\}/);
  assert.match(host, /if \(loader\?\.hold === 'standard'\) setStandardRun\(null\);/);
  /* The runs under the screen are inert, like the band. */
  assert.match(
    host,
    /<div style=\{\{ display: 'contents' \}\} inert=\{loader \? '' : undefined\}>\s*\{deepRun \?/,
  );
});

test('a research answer has a ping bar that pings through the band', () => {
  assert.match(runs, /\{onPing \? <SonarRunPingBar onPing=\{onPing\} \/> : null\}/);
  assert.equal(
    (runs.match(/<SonarRunPingBar onPing=\{onPing\} \/>/g) || []).length,
    2,
    'standard and deep',
  );
  assert.match(host, /function pingFromRun\(query\)/);
  assert.match(host, /bandControlRef\.current\?\.ping\?\.\(q\)/);
  assert.match(band, /ping: \(q\) => \{/);
  assert.match(bar, /role="search"/);
  assert.match(bar, /<label htmlFor=\{id\}/, 'the input has a label');
  assert.ok(!bar.includes('—') && !host.includes('— '), 'no em dashes');
  const css = read('src/components/sonar/deep-research.css');
  const block = css.slice(css.indexOf('.sdr-ping {'));
  assert.ok(!/border:\s*1px solid/.test(block), 'the ping bar has no outline');
});
