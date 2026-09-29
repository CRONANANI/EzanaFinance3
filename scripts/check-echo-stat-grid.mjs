#!/usr/bin/env node
/* Echo stat-grid check.
   Rule: every `type: 'stat-grid'` block in an Echo article module carries
   exactly 4 stats (docs/ECHO_ARTICLE_AUTHORING.md section 5a). The reader
   renders one centred row of four tiles and caps at four, so a fifth stat is
   silently dropped and a third leaves a hole. peter-thiel-2026 is a frozen
   standing exception (SEO canonical).
   Usage: node scripts/check-echo-stat-grid.mjs
   Exits 1 on any violation. */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const LIB = join(process.cwd(), 'src', 'lib');
const EXCEPTIONS = new Set(['ezana-echo-article-peter-thiel-2026.js']);
const REQUIRED = 4;

const files = readdirSync(LIB).filter(
  (f) => f.startsWith('ezana-echo-article-') && f.endsWith('.js'),
);

/* Import the module and walk its exports, so the count is the real array
   length rather than a regex guess at nested object literals. A module can
   export the same block through more than one binding, so blocks are
   de-duplicated by identity. */
function collectStatGrids(value, out, seen) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const v of value) collectStatGrids(v, out, seen);
    return;
  }
  if (value.type === 'stat-grid') out.push(value);
  for (const v of Object.values(value)) collectStatGrids(v, out, seen);
}

let failures = 0;
for (const file of files) {
  if (EXCEPTIONS.has(file)) continue;
  let mod;
  try {
    mod = await import(pathToFileURL(join(LIB, file)).href);
  } catch (err) {
    failures++;
    console.log(`FAIL ${file}: could not load module (${err.message})`);
    continue;
  }
  const grids = [];
  collectStatGrids(mod, grids, new Set());
  const bad = grids
    .map((g) => (Array.isArray(g.stats) ? g.stats.length : 0))
    .filter((n) => n !== REQUIRED);
  if (bad.length) {
    failures++;
    console.log(`FAIL ${file}: stat-grid with ${bad.join(', ')} stats (need exactly ${REQUIRED})`);
  } else if (grids.length) {
    console.log(`ok   ${file} (${grids.length} stat-grid)`);
  }
}

console.log(failures ? `\n${failures} article(s) violate the standard.` : '\nAll pass.');
process.exit(failures ? 1 : 0);
