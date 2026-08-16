#!/usr/bin/env node
/* Echo figure-count and distribution check.
   Rule: published articles carry 6-10 catalog figures, first figure in the
   top third, no two figures adjacent, no gap of more than 6 non-figure
   blocks. peter-thiel-2026 is a frozen standing exception (SEO canonical).
   Usage: node scripts/check-echo-figure-count.mjs [--report]
   --report always exits 0 (inventory mode); default exits 1 on violations. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LIB = join(process.cwd(), 'src', 'lib');
const REPORT = process.argv.includes('--report');
const EXCEPTIONS = new Set(['ezana-echo-article-peter-thiel-2026.js']);

const FIGURE_TYPES = new Set([
  'chart',
  'africa-map',
  'network-pie',
  'wall-timeline',
  'lifelines',
  'trajectory',
  'adjudication-matrix',
  'dossier-table',
  'scenario-chain',
  'mechanism-wave',
  'clearing-sankey',
  'revision-ledger',
  'scrolly-spotlight',
  'stage-boards',
  'radial-stack',
  'variable-pie',
  'bubble-field',
  'multi-axis',
  'tile-grid',
  'market-treemap',
]);

const files = readdirSync(LIB).filter(
  (f) => f.startsWith('ezana-echo-article-') && f.endsWith('.js'),
);

let failures = 0;
for (const file of files) {
  if (EXCEPTIONS.has(file)) continue;
  const src = readFileSync(join(LIB, file), 'utf8');
  const statusMatch = src.match(/^\s{2}status:\s*'([^']+)'/m);
  if (statusMatch && statusMatch[1] === 'draft') continue;

  /* Block sequence: every type: 'x' occurrence in source order. */
  const seq = [...src.matchAll(/type:\s*'([a-z-]+)'/g)].map((m) => m[1]);
  const flags = seq.map((t) => FIGURE_TYPES.has(t));
  const count = flags.filter(Boolean).length;
  const firstIdx = flags.indexOf(true);
  const problems = [];

  if (count < 6) problems.push(`only ${count} figures (min 6)`);
  if (count > 10) problems.push(`${count} figures (max 10)`);
  if (firstIdx === -1 || firstIdx > Math.floor(seq.length / 3))
    problems.push('first figure not in the top third');
  for (let i = 1; i < flags.length; i++)
    if (flags[i] && flags[i - 1]) {
      problems.push('two figures adjacent');
      break;
    }
  let gap = 0,
    maxGap = 0;
  for (const isFig of flags) {
    gap = isFig ? 0 : gap + 1;
    if (gap > maxGap) maxGap = gap;
  }
  if (maxGap > 6) problems.push(`prose run of ${maxGap} blocks without a figure (max 6)`);

  if (problems.length) {
    failures++;
    console.log(`FAIL ${file}: ${problems.join('; ')}`);
  } else {
    console.log(`ok   ${file} (${count} figures)`);
  }
}

console.log(failures ? `\n${failures} article(s) violate the standard.` : '\nAll pass.');
process.exit(REPORT || !failures ? 0 : 1);
