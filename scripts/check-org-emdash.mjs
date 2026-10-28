#!/usr/bin/env node
/* Org (university) em-dash guard.
   House style: org pages and components use commas, colons, periods or
   parentheses, never an em dash. Null values render the NA en dash (src/lib/
   org-display.js). Fails on a literal em dash (U+2014) or its HTML entities
   (&mdash; / &#8212; / &#x2014;) in user-visible code. Comments keep theirs:
   JS/CSS block comments, JS line comments and JSX block comments are stripped
   before the check.
   Usage: node scripts/check-org-emdash.mjs (exits 1 on any hit) */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TARGETS = [
  'src/components/org',
  'src/components/org-trading',
  'src/components/settings/org',
  'src/app/(dashboard)/org-team-hub',
  'src/app/(dashboard)/org-trading',
  'src/app/(dashboard)/org-competitions',
  'src/app/(dashboard)/council-rankings',
];
const EXT = /\.(jsx?|css)$/;
const PATTERN = /—|&mdash;|&#8212;|&#x2014;/i;

function walk(path, out) {
  if (!existsSync(path)) return;
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path)) walk(join(path, name), out);
  } else if (EXT.test(path)) {
    out.push(path);
  }
}

/**
 * Strip comments so em dashes inside them do not count (comments keep theirs).
 * Handles /* ... *\/ blocks that span lines (also {/* ... *\/} JSX comments)
 * and // line comments. Returns the per-line visible text.
 */
function stripComments(src) {
  const out = [];
  let inBlock = false;
  for (const raw of src.split('\n')) {
    let line = raw;
    let visible = '';
    let i = 0;
    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', i);
        if (end === -1) {
          i = line.length;
        } else {
          i = end + 2;
          inBlock = false;
        }
        continue;
      }
      if (line[i] === '/' && line[i + 1] === '*') {
        inBlock = true;
        i += 2;
        continue;
      }
      if (line[i] === '/' && line[i + 1] === '/') {
        break; // line comment: ignore the rest
      }
      visible += line[i];
      i += 1;
    }
    out.push(visible);
  }
  return out;
}

const files = [];
for (const t of TARGETS) walk(join(ROOT, t), files);

let hits = 0;
for (const file of files) {
  const visibleLines = stripComments(readFileSync(file, 'utf8'));
  visibleLines.forEach((line, i) => {
    if (PATTERN.test(line)) {
      hits += 1;
      console.log(`${relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 110)}`);
    }
  });
}

if (hits) {
  console.log(
    `\n${hits} em dash(es) in org UI copy. Use a comma, colon, period or parentheses; null values use NA from org-display.js.`,
  );
  process.exit(1);
}
console.log(`ok   no em dashes in ${files.length} org files`);
