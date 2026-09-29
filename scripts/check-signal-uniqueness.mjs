#!/usr/bin/env node
/* Landing "Your portfolio" card: every JSON snippet's `signal` value must be
   unique across all seven dimensions, and every dimension must carry exactly
   three, so moving between dimensions never re-shows a block.
   Usage: node scripts/check-signal-uniqueness.mjs (exits 1 on violation) */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FILE = join(process.cwd(), 'src', 'components', 'landing', 'PortfolioSignalCard.jsx');
const src = readFileSync(FILE, 'utf8');
const body = src.slice(
  src.indexOf('const SIGNALS_BY_DIMENSION'),
  src.indexOf('const SIGNAL_TITLES'),
);

const problems = [];
const seen = new Map();
for (const block of body.matchAll(/^ {2}([a-z]+): \[\n([\s\S]*?)^ {2}\],/gm)) {
  const [, dim, rows] = block;
  const names = [...rows.matchAll(/sig\(\s*'([a-z0-9_]+)'/g)].map((m) => m[1]);
  if (names.length !== 3) problems.push(`${dim}: ${names.length} signals (need 3)`);
  for (const n of names) {
    if (seen.has(n)) problems.push(`"${n}" repeats (${seen.get(n)} and ${dim})`);
    else seen.set(n, dim);
  }
}
if (seen.size === 0) problems.push('no signals parsed; has the file shape changed?');

if (problems.length) {
  console.log(`FAIL PortfolioSignalCard signals:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`ok   ${seen.size} unique signals across ${new Set(seen.values()).size} dimensions`);
