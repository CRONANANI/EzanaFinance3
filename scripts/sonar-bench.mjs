/**
 * Sonar benchmark runner (engine v3, Section 13).
 *
 *   node --env-file=.env.local --import ./scripts/register-sonar-loader.mjs scripts/sonar-bench.mjs \
 *     [--engine v3|baseline|both] [--depth quick|standard|deep] [--only id,id] [--write]
 *
 * Live data: needs the Supabase service role, the model key and the market
 * data key in the environment. Writes a JSON report to scripts/out/ and, with
 * --write, every score to sonar_research_evaluations.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const engine = opt('engine', 'both');
const depth = opt('depth', 'standard');
const only = opt('only') ? opt('only').split(',') : null;
const write = args.includes('--write');

const { runSuite } = await import('@/lib/sonar/engine/eval/run-suite');
const out = {};
for (const e of engine === 'both' ? ['baseline', 'v3'] : [engine]) {
  console.log(`\n== ${e} (${depth})`);
  out[e] = await runSuite({ engine: e, depth, only, write });
  console.log(`mean composite ${out[e].summary.composite}`);
}
fs.mkdirSync(path.join('scripts', 'out'), { recursive: true });
const file = path.join('scripts', 'out', `sonar-bench-${Date.now()}.json`);
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log(`\nwrote ${file}`);
