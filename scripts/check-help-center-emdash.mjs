#!/usr/bin/env node
/* Help Center em-dash guard.
   House style: no em dashes in Help Center copy. Use a comma, colon, period or
   parentheses instead, chosen per sentence. Fails on a literal em dash (U+2014)
   or its HTML entities (&mdash; / &#8212; / &#x2014;) anywhere in:
     src/lib/help-center-content.js
     src/app/help-center/**
     src/components/help-center/**
   Usage: node scripts/check-help-center-emdash.mjs (exits 1 on any hit) */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TARGETS = [
  'src/lib/help-center-content.js',
  'src/app/help-center',
  'src/components/help-center',
];
const EXT = /\.(m?js|jsx|css|md)$/;
const PATTERN = /—|&mdash;|&#8212;|&#x2014;/gi;

function walk(path, out) {
  if (!existsSync(path)) return;
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path)) walk(join(path, name), out);
  } else if (EXT.test(path)) {
    out.push(path);
  }
}

const files = [];
for (const t of TARGETS) walk(join(ROOT, t), files);

let hits = 0;
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const n = (line.match(PATTERN) || []).length;
    if (!n) return;
    hits += n;
    console.log(`${relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 110)}`);
  });
}

if (hits) {
  console.log(
    `\n${hits} em dash(es) in Help Center files. Replace each with a comma, colon, period or parentheses.`,
  );
  process.exit(1);
}
console.log(`ok   no em dashes in ${files.length} Help Center files`);
