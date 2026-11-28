/**
 * Deterministic re-analysis of the stored d4 benchmark (Nov 28 2026). No model, no network:
 * reads sonar-evals/d4-per-case-2026-11-28.json (exported by
 * docs/sql/SQL_sonar_d4_deterministic_reanalysis.md) and prints paired comparisons.
 * Run: node --import ./scripts/register-sonar-loader.mjs scripts/sonar-stored-reanalysis.mjs
 */
import './lib/no-llm-guard.mjs';
import { readFileSync } from 'node:fs';
import { parsePacked, compareCells } from '../src/lib/sonar/engine/eval/stored-analysis.js';

const data = JSON.parse(
  readFileSync(new URL('../sonar-evals/d4-per-case-2026-11-28.json', import.meta.url), 'utf8'),
);
const names = ['objective_rate', 'untraced_numbers', 'valid_cross_insights'];
const fmt = (v, d = 2) => (v == null ? 'n/a' : v.toFixed(d));
for (const [depth, pairs] of [
  [
    'standard',
    [
      ['current', 'D'],
      ['current', 'D-h55spec'],
      ['D-h55spec', 'D'],
    ],
  ],
  ['deep', [['current', 'D']]],
]) {
  const rows = parsePacked(data[depth], names);
  for (const [a, b] of pairs) {
    const c = compareCells(rows, a, b, names);
    console.log(`\n${depth}: ${b} minus ${a}`);
    for (const m of names) {
      const x = c[m];
      console.log(
        `  ${m.padEnd(22)} cases ${x.cases}  mean diff ${fmt(x.meanDiff.mean)}  95% CI [${fmt(x.meanDiff.lo)}, ${fmt(x.meanDiff.hi)}]  sign +${x.sign.up}/-${x.sign.down}/=${x.sign.ties}  p=${fmt(x.sign.p, 3)}`,
      );
    }
  }
}
